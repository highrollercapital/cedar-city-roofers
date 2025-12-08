import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Buffer size for audio chunks (20 Twilio messages = 0.4 seconds of audio)
const BUFFER_SIZE = 20 * 160;

serve(async (req) => {
  const url = new URL(req.url);
  
  console.log(`🔌 Twilio-Deepgram Bridge called: ${req.method} ${url.pathname}`);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Check if this is a WebSocket upgrade request
  const upgradeHeader = req.headers.get("upgrade") || "";
  
  if (upgradeHeader.toLowerCase() === "websocket") {
    console.log("📡 WebSocket upgrade requested");
    return handleWebSocketUpgrade(req, url);
  }

  return new Response(
    JSON.stringify({ error: "Expected WebSocket connection" }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});

async function handleWebSocketUpgrade(req: Request, url: URL) {
  const leadId = url.searchParams.get('leadId') || '';
  
  console.log(`   Lead ID: ${leadId}`);

  // Get Deepgram API key
  const DEEPGRAM_API_KEY = Deno.env.get('DEEPGRAM_API_KEY');
  
  if (!DEEPGRAM_API_KEY) {
    console.error('❌ DEEPGRAM_API_KEY not configured');
    return new Response(
      JSON.stringify({ error: 'Deepgram API key not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Fetch voice agent settings from database
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY');
  
  let agentSettings = getDefaultAgentSettings();
  
  try {
    const settingsResponse = await fetch(
      `${supabaseUrl}/rest/v1/settings?key=like.voice_agent_%&order=updated_at.desc&limit=1`,
      {
        headers: {
          'apikey': supabaseKey || '',
          'Authorization': `Bearer ${supabaseKey}`,
        }
      }
    );
    
    if (settingsResponse.ok) {
      const settingsData = await settingsResponse.json();
      if (settingsData.length > 0 && settingsData[0].value?.settings?.deepgram) {
        const dbSettings = settingsData[0].value.settings.deepgram;
        agentSettings = {
          ...agentSettings,
          agent: {
            ...agentSettings.agent,
            think: dbSettings.agent?.think || agentSettings.agent.think,
            speak: dbSettings.agent?.speak || agentSettings.agent.speak,
            listen: dbSettings.agent?.listen || agentSettings.agent.listen,
            greeting: dbSettings.agent?.greeting || agentSettings.agent.greeting,
          }
        };
        console.log('✅ Loaded voice agent settings from database');
      }
    }
  } catch (e) {
    console.warn('Could not fetch voice agent settings:', e);
  }

  // Upgrade to WebSocket
  const { socket: twilioSocket, response } = Deno.upgradeWebSocket(req);
  
  let deepgramSocket: WebSocket | null = null;
  let streamSid = '';
  const audioBuffer: number[] = [];

  twilioSocket.onopen = async () => {
    console.log('✅ Twilio WebSocket connected');
    
    // Connect to Deepgram Voice Agent API
    try {
      deepgramSocket = new WebSocket(
        'wss://agent.deepgram.com/v1/agent/converse',
        ['token', DEEPGRAM_API_KEY]
      );

      deepgramSocket.onopen = () => {
        console.log('✅ Deepgram WebSocket connected');
        
        // Send configuration to Deepgram
        const configMessage = {
          type: "Settings",
          audio: {
            input: {
              encoding: "mulaw",
              sample_rate: 8000,
            },
            output: {
              encoding: "mulaw",
              sample_rate: 8000,
              container: "none",
            },
          },
          agent: agentSettings.agent,
        };
        
        console.log('📤 Sending Deepgram config:', JSON.stringify(configMessage, null, 2));
        deepgramSocket!.send(JSON.stringify(configMessage));
      };

      deepgramSocket.onmessage = (event) => {
        if (!streamSid) {
          console.log('⏳ Waiting for streamSid before sending audio');
          return;
        }

        if (typeof event.data === 'string') {
          // Text message from Deepgram
          console.log('📥 Deepgram text message:', event.data);
          
          try {
            const decoded = JSON.parse(event.data);
            
            // Handle barge-in (user started speaking while agent is talking)
            if (decoded.type === 'UserStartedSpeaking') {
              console.log('🛑 User started speaking - clearing audio');
              const clearMessage = {
                event: "clear",
                streamSid: streamSid
              };
              twilioSocket.send(JSON.stringify(clearMessage));
            }
          } catch (e) {
            console.warn('Could not parse Deepgram message:', e);
          }
        } else {
          // Binary audio data from Deepgram (TTS output)
          const rawMulaw = new Uint8Array(event.data);
          
          // Convert to base64 for Twilio
          const base64Audio = btoa(String.fromCharCode(...rawMulaw));
          
          // Send audio to Twilio
          const mediaMessage = {
            event: "media",
            streamSid: streamSid,
            media: { payload: base64Audio }
          };
          
          twilioSocket.send(JSON.stringify(mediaMessage));
        }
      };

      deepgramSocket.onerror = (error) => {
        console.error('❌ Deepgram WebSocket error:', error);
      };

      deepgramSocket.onclose = () => {
        console.log('🔌 Deepgram WebSocket closed');
      };

    } catch (error) {
      console.error('❌ Failed to connect to Deepgram:', error);
    }
  };

  twilioSocket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      if (data.event === "connected") {
        console.log('📞 Twilio stream connected');
      } else if (data.event === "start") {
        console.log('▶️ Twilio stream started');
        streamSid = data.start.streamSid;
        console.log(`   Stream SID: ${streamSid}`);
      } else if (data.event === "media") {
        // Decode base64 audio from Twilio
        const payload = data.media.payload;
        const chunk = Uint8Array.from(atob(payload), c => c.charCodeAt(0));
        
        // Only process inbound audio (from the caller)
        if (data.media.track === "inbound") {
          // Add to buffer
          audioBuffer.push(...chunk);
          
          // When buffer is full, send to Deepgram
          while (audioBuffer.length >= BUFFER_SIZE) {
            const audioChunk = new Uint8Array(audioBuffer.splice(0, BUFFER_SIZE));
            
            if (deepgramSocket && deepgramSocket.readyState === WebSocket.OPEN) {
              deepgramSocket.send(audioChunk);
            }
          }
        }
      } else if (data.event === "stop") {
        console.log('⏹️ Twilio stream stopped');
        
        // Close Deepgram connection
        if (deepgramSocket) {
          deepgramSocket.close();
        }
      }
    } catch (e) {
      console.error('Error processing Twilio message:', e);
    }
  };

  twilioSocket.onerror = (error) => {
    console.error('❌ Twilio WebSocket error:', error);
    if (deepgramSocket) {
      deepgramSocket.close();
    }
  };

  twilioSocket.onclose = () => {
    console.log('🔌 Twilio WebSocket closed');
    if (deepgramSocket) {
      deepgramSocket.close();
    }
  };

  return response;
}

function getDefaultAgentSettings() {
  return {
    agent: {
      language: "en",
      listen: {
        provider: {
          type: "deepgram",
          model: "nova-3",
        }
      },
      think: {
        provider: {
          type: "open_ai",
          model: "gpt-4o-mini",
          temperature: 0.7
        },
        prompt: "You are Sam, a friendly appointment-setting agent for Cedar City Roofers. Be conversational, helpful, and try to schedule roof inspections."
      },
      speak: {
        provider: {
          type: "deepgram",
          model: "aura-2-thalia-en"
        }
      },
      greeting: "Hey there! This is Sam from Cedar City Roofers. How can I help you today?"
    }
  };
}
