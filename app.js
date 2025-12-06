import twilio from 'twilio';
import { WebSocket, WebSocketServer } from 'ws';
import http from 'http';
import ngrok from 'ngrok';
import dotenv from 'dotenv';
import { createClient, AgentEvents } from '@deepgram/sdk';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

// Function to get a value from environment variable or command line argument
function getConfig(key, defaultValue = undefined) {
  return process.env[key] || process.argv.find(arg => arg.startsWith(`${key}=`))?.split('=')[1] || defaultValue;
}

// Configuration
const config = {
    TWILIO_ACCOUNT_SID: getConfig('TWILIO_ACCOUNT_SID'),
    TWILIO_AUTH_TOKEN: getConfig('TWILIO_AUTH_TOKEN'),
    DEEPGRAM_API_KEY: getConfig('DEEPGRAM_API_KEY'),
    TWILIO_INBOUND_NUMBER: getConfig('TWILIO_INBOUND_NUMBER', '+18889926082'),
    TWILIO_OUTBOUND_NUMBER: getConfig('TWILIO_OUTBOUND_NUMBER', '+1234567890'),
    SUPABASE_URL: getConfig('VITE_SUPABASE_URL') || getConfig('SUPABASE_URL'),
    SUPABASE_ANON_KEY: getConfig('VITE_SUPABASE_ANON_KEY') || getConfig('SUPABASE_ANON_KEY'),
};

// Initialize Supabase client if credentials are available
let supabaseClient = null;
if (config.SUPABASE_URL && config.SUPABASE_ANON_KEY) {
  supabaseClient = createSupabaseClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
  console.log('✅ Supabase client initialized');
} else {
  console.warn('⚠️  Supabase credentials not found. Appointment booking will not work.');
}

// Validate required configuration (Deepgram is optional)
const requiredConfig = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN'];
for (const key of requiredConfig) {
    if (!config[key]) {
        console.error(`Missing required configuration: ${key}`);
        process.exit(1);
    }
}

// Initialize Deepgram client if API key is provided
let deepgramClient = null;
if (config.DEEPGRAM_API_KEY) {
    try {
        deepgramClient = createClient(config.DEEPGRAM_API_KEY);
        console.log('✅ Deepgram client initialized');
    } catch (error) {
        console.error('⚠️  Failed to initialize Deepgram client:', error.message);
    }
} else {
    console.log('⚠️  DEEPGRAM_API_KEY not set. Deepgram Voice Agent features will be disabled.');
}

const client = twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);

// Twilio phone numbers configuration
const TWILIO_INBOUND = config.TWILIO_INBOUND_NUMBER;  // Number for receiving calls
const TWILIO_OUTBOUND = config.TWILIO_OUTBOUND_NUMBER; // Number for making calls

console.log('\n📞 Twilio Phone Numbers Configured:');
console.log(`   Inbound (receiving): ${TWILIO_INBOUND}`);
console.log(`   Outbound (calling from): ${TWILIO_OUTBOUND}\n`);

// Server configuration
const PORT = process.env.PORT || 3000;
const WS_PORT = process.env.WS_PORT || 3001;

// Store active WebSocket connections
const activeConnections = new Map();
const activeCalls = new Map();

// ============================================
// HTTP Server Setup
// ============================================

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Handle missing URL
  if (!req.url) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Missing URL' }));
    return;
  }

  // Parse URL with error handling
  let url;
  try {
    url = new URL(req.url, `http://${req.headers.host || 'localhost:3000'}`);
  } catch (error) {
    console.error('Error parsing URL:', error.message, req.url);
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid URL', message: error.message }));
    return;
  }

  // Health check endpoint
  if (url.pathname === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }

  // Twilio webhook endpoint for call status
  if (url.pathname === '/twilio/call-status' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      const params = new URLSearchParams(body);
      const callSid = params.get('CallSid');
      const callStatus = params.get('CallStatus');
      const from = params.get('From');
      const to = params.get('To');

      console.log(`Call Status Update: ${callSid} - ${callStatus}`);
      console.log(`From: ${from} To: ${to}`);

      // Update call tracking
      if (activeCalls.has(callSid)) {
        activeCalls.set(callSid, {
          ...activeCalls.get(callSid),
          status: callStatus,
          updatedAt: new Date().toISOString()
        });
      }

      // Broadcast to WebSocket clients
      broadcastToClients({
        type: 'call_status',
        callSid,
        status: callStatus,
        from,
        to
      });

      res.writeHead(200, { 'Content-Type': 'text/xml' });
      res.end();
    });
    return;
  }

  // Twilio webhook endpoint for incoming calls
  if (url.pathname === '/twilio/incoming-call' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      const params = new URLSearchParams(body);
      const callSid = params.get('CallSid');
      const from = params.get('From');
      const to = params.get('To');

      console.log(`Incoming Call: ${callSid} from ${from} to ${to}`);

      // Track the call
      activeCalls.set(callSid, {
        callSid,
        from,
        to,
        status: 'ringing',
        direction: 'inbound',
        createdAt: new Date().toISOString()
      });

      // Broadcast to WebSocket clients
      broadcastToClients({
        type: 'incoming_call',
        callSid,
        from,
        to
      });

      // Generate TwiML response
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say('Hello, thank you for calling. Please hold while we connect you.');
      twiml.say('Sorry, this endpoint is no longer available. Please use Deepgram voice agent instead.');

      res.writeHead(200, { 'Content-Type': 'text/xml' });
      res.end(twiml.toString());
    });
    return;
  }


  // Twilio webhook for connecting to Deepgram Voice Agent
  if (url.pathname === '/twilio/connect-deepgram' && req.method === 'POST') {
    console.log('📞 /twilio/connect-deepgram webhook called');
    (async () => {
      try {
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        req.on('end', async () => {
          try {
            const params = new URLSearchParams(body);
            const callSid = params.get('CallSid');
            const digits = params.get('Digits'); // For trial account keypress
            const callStatus = params.get('CallStatus');
            
            console.log(`📞 Twilio webhook received for call: ${callSid}`);
            console.log(`   Call Status: ${callStatus || 'unknown'}`);
            console.log(`   Digits pressed: ${digits || 'none'}`);
            console.log(`   Full params:`, Object.fromEntries(params));
            
            const publicUrl = await getPublicUrl();
            console.log(`   Public URL: ${publicUrl}`);
            
            const twiml = new twilio.twiml.VoiceResponse();
            
            // Always connect directly to Deepgram Voice Agent WebSocket
            // Note: For trial accounts, Twilio will play a message first, then connect
            // The user pressing a key is just to acknowledge the trial message
            // We don't need to wait for it - just connect immediately
            console.log('   🔌 Connecting to Deepgram Voice Agent...');
            
            // Connect to Deepgram Voice Agent WebSocket with callSid
            const connect = twiml.connect();
            
            // Construct WebSocket URL - Twilio needs wss:// protocol
            let wsUrl;
            if (publicUrl.startsWith('https://')) {
              wsUrl = publicUrl.replace('https://', 'wss://');
            } else if (publicUrl.startsWith('http://')) {
              wsUrl = publicUrl.replace('http://', 'ws://');
            } else {
              wsUrl = `wss://${publicUrl}`;
            }
            
            // Add path and query params with callSid so handler can get call data and settings
            const wsPath = callSid 
              ? `/ws/deepgram-agent?callSid=${callSid}`
              : `/ws/deepgram-agent`;
            
            const fullWsUrl = `${wsUrl}${wsPath}`;
            console.log(`   WebSocket URL: ${fullWsUrl}`);
            
            connect.stream({
              url: fullWsUrl
            });

            const twimlXml = twiml.toString();
            console.log(`   TwiML Response (first 500 chars):`, twimlXml.substring(0, 500));
            
            res.writeHead(200, { 'Content-Type': 'text/xml' });
            res.end(twimlXml);
          } catch (error) {
            console.error('❌ Error in connect-deepgram:', error);
            console.error('   Stack:', error.stack);
            const twiml = new twilio.twiml.VoiceResponse();
            twiml.say('Sorry, there was an error connecting the call. Please try again later.');
            res.writeHead(200, { 'Content-Type': 'text/xml' });
            res.end(twiml.toString());
          }
        });
      } catch (error) {
        console.error('❌ Error in connect-deepgram (outer):', error);
        console.error('   Stack:', error.stack);
        const twiml = new twilio.twiml.VoiceResponse();
        twiml.say('Sorry, there was an error connecting the call. Please try again later.');
        res.writeHead(200, { 'Content-Type': 'text/xml' });
        res.end(twiml.toString());
      }
    })();
    return;
  }


  // API endpoint to start a Deepgram Voice Agent call
  if (url.pathname === '/api/make-call-deepgram' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        const { to, from, leadId, settings } = JSON.parse(body);

        if (!to) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Missing "to" phone number' }));
          return;
        }

        if (!deepgramClient) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Deepgram API key not configured' }));
          return;
        }

        const publicUrl = await getPublicUrl();
        
        // Note: If you're using a Twilio trial account, a message will be played
        // before the call connects: "You can remove this message at any time by upgrading..."
        // To remove this message, upgrade your Twilio account at:
        // https://www.twilio.com/console/billing/upgrade
        
        const call = await client.calls.create({
          to: to,
          from: from || TWILIO_OUTBOUND,
          url: `${publicUrl}/twilio/connect-deepgram`,
          statusCallback: `${publicUrl}/twilio/call-status`,
          statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
          statusCallbackMethod: 'POST'
        });
        
        console.log(`📞 Call initiated: ${call.sid}`);
        console.log(`   To: ${to}`);
        console.log(`   From: ${from || TWILIO_OUTBOUND}`);
        if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_ACCOUNT_SID.startsWith('AC')) {
          // Check if it's a trial account (trial accounts typically have specific patterns)
          console.log(`   ⚠️  Note: If you hear a trial account message, upgrade at: https://www.twilio.com/console/billing/upgrade`);
        }

        // Track the call
        activeCalls.set(call.sid, {
          callSid: call.sid,
          from: from || TWILIO_OUTBOUND,
          to: to,
          status: call.status,
          direction: 'outbound',
          leadId: leadId || null,
          agentType: 'deepgram',
          settings: settings || null,
          createdAt: new Date().toISOString()
        });

        console.log(`Deepgram Voice Agent call initiated: ${call.sid} to ${to}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          callSid: call.sid,
          status: call.status,
          message: 'Deepgram Voice Agent call initiated'
        }));
      } catch (error) {
        console.error('Error making Deepgram call:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    });
    return;
  }

  // Make outbound call endpoint (with TTS stream)
  if (url.pathname === '/api/make-call-stream' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        const { to, from, leadId, message } = JSON.parse(body);

        if (!to) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Missing "to" phone number' }));
          return;
        }

        // Update message if provided
        if (message) {
          partialResponse = message;
        }

        // Setup TTS connection if not already connected
        if (!ttsWebSocket || ttsWebSocket.readyState !== WebSocket.OPEN) {
          await connectToTTSWebSocket();
        }

        // Setup Twilio WebSocket server
        const twilioWebsocketPort = await setupTwilioWebSocket();
        const twilioWebsocketUrl = await setupNgrokTunnel(twilioWebsocketPort);

        // Start the call
        const call = await startCallWithStream(twilioWebsocketUrl);

        // Update with lead ID if provided
        if (leadId && activeCalls.has(call.sid)) {
          const callData = activeCalls.get(call.sid);
          callData.leadId = leadId;
          activeCalls.set(call.sid, callData);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          callSid: call.sid,
          status: call.status,
          message: 'Call initiated with TTS stream'
        }));
      } catch (error) {
        console.error('Error making call with stream:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    });
    return;
  }

  // Make outbound call endpoint (standard)
  if (url.pathname === '/api/make-call' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        const { to, from, leadId } = JSON.parse(body);

        if (!to) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Missing "to" phone number' }));
          return;
        }

        const publicUrl = await getPublicUrl();
        const call = await client.calls.create({
          to: to,
          from: from || TWILIO_OUTBOUND,
          url: `${publicUrl}/twilio/incoming-call`,
          statusCallback: `${publicUrl}/twilio/call-status`,
          statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
          statusCallbackMethod: 'POST'
        });

        // Track the call
        activeCalls.set(call.sid, {
          callSid: call.sid,
          from: from || TWILIO_OUTBOUND,
          to: to,
          status: call.status,
          direction: 'outbound',
          leadId: leadId || null,
          createdAt: new Date().toISOString()
        });

        console.log(`Outbound call initiated: ${call.sid} to ${to}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          callSid: call.sid,
          status: call.status
        }));
      } catch (error) {
        console.error('Error making call:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    });
    return;
  }

  // Get active calls endpoint
  if (url.pathname === '/api/active-calls' && req.method === 'GET') {
    const calls = Array.from(activeCalls.values());
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, calls }));
    return;
  }

  // Initialize TTS connection endpoint
  if (url.pathname === '/api/init-tts' && req.method === 'POST') {
    (async () => {
      try {
        if (ttsWebSocket && ttsWebSocket.readyState === WebSocket.OPEN) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'TTS already connected' }));
          return;
        }

        await connectToTTSWebSocket();
        await testTTSWebSocket();

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'TTS WebSocket connected and tested' }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    })();
    return;
  }

  // Hang up call endpoint
  if (url.pathname === '/api/hangup-call' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        const { callSid: providedCallSid } = body ? JSON.parse(body) : {};
        if (providedCallSid) {
          callSid = providedCallSid;
        }
        await hangupCall();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Call hung up' }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    });
    return;
  }

  // Default 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

// ============================================
// WebSocket Server Setup
// ============================================

// Attach WebSocket server to HTTP server so they share the same port and ngrok tunnel
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws, req) => {
  // Check connection type
  const url = req.url ? new URL(req.url, `http://${req.headers.host}`) : null;
  

  if (url && url.pathname === '/ws/deepgram-agent') {
    console.log('🔌 Deepgram WebSocket connection request received');
    console.log(`   URL: ${req.url}`);
    console.log(`   Headers:`, JSON.stringify(req.headers, null, 2));
    try {
      handleDeepgramAgentConnection(ws, req);
    } catch (error) {
      console.error('❌ Error in handleDeepgramAgentConnection:', error);
      console.error('   Stack:', error.stack);
      ws.close(1011, 'Internal server error');
    }
    return;
  }

  // Regular WebSocket connection
  const connectionId = generateConnectionId();
  activeConnections.set(connectionId, ws);
  
  console.log(`WebSocket client connected: ${connectionId}`);
  console.log(`Total connections: ${activeConnections.size}`);

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    connectionId,
    message: 'WebSocket connection established'
  }));

  // Handle messages from client
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('Received WebSocket message:', data.type);

      switch (data.type) {
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;

        case 'make_call':
          await handleMakeCall(ws, data);
          break;

        case 'get_active_calls':
          ws.send(JSON.stringify({
            type: 'active_calls',
            calls: Array.from(activeCalls.values())
          }));
          break;

        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message
      }));
    }
  });

  // Handle connection close
  ws.on('close', () => {
    activeConnections.delete(connectionId);
    console.log(`WebSocket client disconnected: ${connectionId}`);
    console.log(`Total connections: ${activeConnections.size}`);
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    activeConnections.delete(connectionId);
  });
});

// ============================================
// Deepgram Voice Agent Integration
// ============================================

// Store active Deepgram agent connections
const deepgramAgentConnections = new Map();

// ============================================
// Greeting Generation
// ============================================

/**
 * Generate a natural greeting message based on agent instructions
 * Uses OpenAI to create a contextually appropriate greeting
 */
async function generateGreetingFromInstructions(instructions) {
  // Extract key information from instructions
  const instructionsText = typeof instructions === 'string' ? instructions : JSON.stringify(instructions);
  
  // Use OpenAI to generate a greeting if API key is available
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (openaiApiKey) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a greeting generator. Create a brief, friendly, professional greeting (1-2 sentences, max 30 words) for a phone call based on the agent\'s role and instructions. The greeting should be natural, welcoming, and set the right tone for the conversation. Start with "Thank you for calling" or "Hello" and briefly introduce what the agent can help with.',
            },
            {
              role: 'user',
              content: `Generate a greeting for an AI agent with these instructions:\n\n${instructionsText.substring(0, 1000)}`,
            },
          ],
          max_tokens: 50,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      if (data.choices && data.choices[0] && data.choices[0].message) {
        let greeting = data.choices[0].message.content.trim();
        // Remove quotes if present
        greeting = greeting.replace(/^["']|["']$/g, '');
        return greeting;
      }
    } catch (error) {
      console.warn('Failed to generate greeting with OpenAI, using fallback:', error.message);
    }
  }

  // Fallback: Generate a simple greeting based on instructions
  const lowerInstructions = instructionsText.toLowerCase();
  
  if (lowerInstructions.includes('appointment') || lowerInstructions.includes('schedule')) {
    return 'Thank you for calling! I\'m here to help you schedule an appointment. How can I assist you today?';
  } else if (lowerInstructions.includes('roofing') || lowerInstructions.includes('roof')) {
    return 'Hello! Thank you for calling. I\'m here to help with your roofing needs. What can I do for you today?';
  } else if (lowerInstructions.includes('consultation') || lowerInstructions.includes('inspection')) {
    return 'Thank you for calling! I can help you schedule a consultation or inspection. How may I assist you?';
  } else {
    return 'Hello! Thank you for calling. How can I help you today?';
  }
}

// Handle Deepgram Voice Agent WebSocket connection
async function handleDeepgramAgentConnection(ws, req) {
  console.log('🔊 Deepgram Voice Agent WebSocket connection received');
  
  const connectionId = generateConnectionId();
  let deepgramAgent = null;
  let twilioStreamSid = null;
  let audioBuffer = Buffer.alloc(0);
  let callSid = null;
  let settings = null;
  let leadId = null; // Store leadId for appointment booking

  // Extract call SID from query params if available
  const url = req.url ? new URL(req.url, `http://${req.headers.host}`) : null;
  if (url && url.searchParams.get('callSid')) {
    callSid = url.searchParams.get('callSid');
    const callData = activeCalls.get(callSid);
    if (callData) {
      if (callData.settings) {
        settings = callData.settings;
      }
      if (callData.leadId) {
        leadId = callData.leadId;
        console.log(`📋 Lead ID for appointment booking: ${leadId}`);
      }
      // Ensure functions are included in think section if not already present
      // Merge default functions with any existing functions from settings
      const defaultFunctions = getDefaultFunctions();
      if (settings.agent && settings.agent.think) {
        if (settings.agent.think.functions && Array.isArray(settings.agent.think.functions)) {
          // Merge: combine default functions with agent-specific functions
          const existingFunctionNames = new Set(settings.agent.think.functions.map(f => f.name));
          const mergedFunctions = [
            ...settings.agent.think.functions,
            ...defaultFunctions.filter(f => !existingFunctionNames.has(f.name))
          ];
          settings.agent.think.functions = mergedFunctions;
        } else {
          settings.agent.think.functions = defaultFunctions;
        }
        // Log the system prompt being used
        if (settings.agent.think.prompt) {
          console.log(`📝 Using agent system prompt: ${settings.agent.think.prompt.substring(0, 100)}...`);
        }
      } else if (settings.agent && !settings.agent.think) {
        // Default to OpenAI for LLM
        settings.agent.think = {
          provider: {
            type: 'openai',
            model: 'gpt-4o-mini',
          },
          prompt: settings.agent.systemPrompt || 'You are a helpful AI assistant for a roofing company. Your primary goal is to schedule appointments for roofing consultations and inspections. When a customer expresses interest in scheduling, collect the date and time, confirm the details, and use the book_appointment function to schedule the appointment in the lead management system.',
          functions: defaultFunctions,
        };
        console.log('✅ LLM provider defaulted to OpenAI');
      }
      
      // Normalize provider type (handle both 'open_ai' and 'openai')
      if (settings.agent && settings.agent.think && settings.agent.think.provider) {
        // Normalize 'open_ai' to 'openai' for Deepgram compatibility
        if (settings.agent.think.provider.type === 'open_ai') {
          settings.agent.think.provider.type = 'openai';
        }
        
        // If provider type is not set or is anthropic, default to OpenAI
        if (!settings.agent.think.provider.type || settings.agent.think.provider.type === 'anthropic') {
          console.log('🔄 Switching LLM provider to OpenAI');
          settings.agent.think.provider.type = 'openai';
          if (!settings.agent.think.provider.model || settings.agent.think.provider.model.includes('claude')) {
            settings.agent.think.provider.model = 'gpt-4o-mini';
          }
        }
      }

      // Ensure TTS (speak) provider is always configured for voice conversations
      // Default to Deepgram
      if (settings.agent && !settings.agent.speak) {
        settings.agent.speak = {
          provider: {
            type: 'deepgram',
            model: 'aura-2-odysseus-en',
          },
        };
        console.log('✅ TTS provider configured: Deepgram Aura (default)');
      } else if (settings.agent && settings.agent.speak && settings.agent.speak.provider) {
        const ttsType = settings.agent.speak.provider.type || 'deepgram';
        const ttsModel = settings.agent.speak.provider.model || 'aura-2-odysseus-en';
        console.log(`✅ TTS provider configured: ${ttsType} - ${ttsModel}`);
      }

      // Ensure listen (STT) provider is configured
      if (settings.agent && !settings.agent.listen) {
        settings.agent.listen = {
          provider: {
            type: 'deepgram',
            version: 'v2',
            model: 'flux-general-en',
          },
        };
        console.log('✅ STT provider configured: Deepgram Flux');
      }
    }
  }

  // Fetch lead information if leadId is available
  let leadInfo = null;
  if (leadId && supabaseClient) {
    try {
      const { data: lead, error: leadError } = await supabaseClient
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();
      
      if (!leadError && lead) {
        leadInfo = lead;
        console.log(`📋 Lead information loaded: ${lead.name} - ${lead.phone} - ${lead.email}`);
      }
    } catch (error) {
      console.error('Error fetching lead information:', error);
    }
  }

  // Default settings if not provided
  if (!settings) {
      settings = {
      audio: {
        input: {
          encoding: 'mulaw', // Twilio Media Stream uses PCMU (μ-law) at 8000 Hz
          sample_rate: 8000,  // Twilio Media Stream standard sample rate
        },
        output: {
          encoding: 'mulaw', // Match Twilio Media Stream output format
          sample_rate: 8000,  // Match Twilio Media Stream standard sample rate
          container: 'none',
        },
      },
      agent: {
        language: 'en',
        speak: {
          provider: {
            type: 'deepgram',
            model: 'aura-2-odysseus-en',
          },
        },
        listen: {
          provider: {
            type: 'deepgram',
            version: 'v2',
            model: 'flux-general-en',
          },
        },
        think: {
          provider: {
            type: 'openai',
            model: 'gpt-4o-mini',
          },
          prompt: 'You are a professional AI assistant for a roofing company. Your primary responsibilities are:\n1. Schedule appointments for roofing consultations and inspections\n2. Confirm and update lead information\n3. Provide helpful information about roofing services\n\nWhen a customer wants to schedule an appointment:\n- Ask for their preferred date and time\n- Confirm the appointment details with them\n- Use the book_appointment function to schedule it in the system\n- The appointment will automatically be linked to their lead record\n\nAlways be friendly, professional, and helpful.',
          functions: getDefaultFunctions(),
        },
        greeting: 'Hello! Thank you for calling. How can I help you today?',
      },
    };
  }

  // Enhance system prompt with lead information if available
  if (leadInfo && settings.agent && settings.agent.think) {
    const leadContext = `\n\nLEAD INFORMATION:\n- Name: ${leadInfo.name || 'Not provided'}\n- Phone: ${leadInfo.phone || 'Not provided'}\n- Email: ${leadInfo.email || 'Not provided'}\n- Address: ${leadInfo.address || 'Not provided'}\n- Status: ${leadInfo.status || 'new'}\n\nUse this information to personalize the conversation. Confirm this information with the customer and update it if needed using the confirm_lead_info function.`;
    
    if (settings.agent.think.prompt) {
      // Add appointment booking instructions if not already present
      let enhancedPrompt = settings.agent.think.prompt;
      if (!enhancedPrompt.toLowerCase().includes('book_appointment') && !enhancedPrompt.toLowerCase().includes('schedule')) {
        enhancedPrompt += '\n\nIMPORTANT: When the customer wants to schedule an appointment, collect the date and time, confirm the details, and use the book_appointment function to schedule it. The appointment will be automatically saved to the lead management system.';
      }
      settings.agent.think.prompt = enhancedPrompt + leadContext;
    } else {
      settings.agent.think.prompt = 'You are a professional AI assistant for a roofing company. Your primary goal is to schedule appointments for roofing consultations. When a customer wants to schedule, collect the date and time, confirm details, and use the book_appointment function.' + leadContext;
    }
    console.log('✅ Lead information added to system prompt');
  }

  // Auto-generate greeting based on agent instructions if not provided
  if (settings.agent && !settings.agent.greeting) {
    // Generate greeting from agent's system prompt/instructions
    const systemPrompt = settings.agent.think?.prompt || settings.agent.systemPrompt || '';
    if (systemPrompt) {
      try {
        settings.agent.greeting = await generateGreetingFromInstructions(systemPrompt);
        console.log(`✅ Auto-generated greeting: "${settings.agent.greeting}"`);
      } catch (error) {
        console.warn('⚠️  Failed to auto-generate greeting, using default:', error.message);
        settings.agent.greeting = 'Hello! Thank you for calling. How can I help you today?';
      }
    } else {
      settings.agent.greeting = 'Hello! Thank you for calling. How can I help you today?';
    }
  } else if (settings.agent && settings.agent.greeting) {
    // Enhance greeting to be clear after any Twilio trial message
    if (!settings.agent.greeting.toLowerCase().includes('thank you') && !settings.agent.greeting.toLowerCase().includes('calling')) {
      settings.agent.greeting = `Thank you for calling. ${settings.agent.greeting}`;
    }
  }

  // Initialize Deepgram Voice Agent if client is available
  if (!deepgramClient) {
    console.error('❌ Deepgram client not initialized');
    ws.close(1008, 'Deepgram API key not configured');
    return;
  }

  try {
    deepgramAgent = deepgramClient.agent();
    deepgramAgentConnections.set(connectionId, { ws, agent: deepgramAgent, callSid });

    // Configure the agent with TTS settings
    console.log('🔧 Configuring Deepgram Voice Agent...');
    console.log(`   TTS Provider: ${settings.agent?.speak?.provider?.type || 'not set'} - ${settings.agent?.speak?.provider?.model || 'default'}`);
    console.log(`   STT Provider: ${settings.agent?.listen?.provider?.type || 'not set'} - ${settings.agent?.listen?.provider?.model || 'default'}`);
    console.log(`   LLM Provider: ${settings.agent?.think?.provider?.type || 'not set'} - ${settings.agent?.think?.provider?.model || 'default'}`);
    
    // Log full settings structure for debugging
    console.log('   Full agent settings:', JSON.stringify(settings.agent, null, 2));
    
    // Ensure API key is in settings for providers that require it
    if (settings.agent?.think?.provider?.type === 'openai') {
      // Use user-provided API key first, fallback to environment
      if (!settings.agent.think.provider.api_key) {
        if (process.env.OPENAI_API_KEY) {
          settings.agent.think.provider.api_key = process.env.OPENAI_API_KEY;
          console.log('✅ OpenAI API key added from environment');
        } else {
          console.warn('⚠️  OpenAI API key not found - agent may not work. Please provide your API key in agent settings.');
        }
      } else {
        console.log('✅ Using user-provided OpenAI API key');
      }
    } else if (settings.agent?.think?.provider?.type === 'openrouter') {
      // OpenRouter requires user-provided API key
      if (!settings.agent.think.provider.api_key) {
        console.warn('⚠️  OpenRouter API key not found - agent will not work. Please provide your OpenRouter API key in agent settings.');
      } else {
        console.log('✅ Using user-provided OpenRouter API key');
        // Ensure endpoint is set for OpenRouter
        if (!settings.agent.think.provider.endpoint) {
          settings.agent.think.provider.endpoint = {
            url: 'https://openrouter.ai/api/v1/chat/completions',
            headers: {
              'HTTP-Referer': 'https://cedarcityroofers.com', // Optional: for tracking
              'X-Title': 'Cedar City Roofers Voice Agent', // Optional: for tracking
            }
          };
        }
        // Add API key to endpoint headers
        if (settings.agent.think.provider.endpoint.headers) {
          settings.agent.think.provider.endpoint.headers['Authorization'] = `Bearer ${settings.agent.think.provider.api_key}`;
        } else {
          settings.agent.think.provider.endpoint.headers = {
            'Authorization': `Bearer ${settings.agent.think.provider.api_key}`
          };
        }
      }
    }
    
    deepgramAgent.configure(settings);

    // Set up Deepgram event handlers
    deepgramAgent.on(AgentEvents.Welcome, () => {
      console.log('✅ Deepgram Voice Agent: Welcome received - TTS ready');
      // Agent is ready and TTS is configured
    });

    deepgramAgent.on(AgentEvents.SettingsApplied, () => {
      console.log('✅ Deepgram Voice Agent: Settings applied - TTS enabled');
      console.log('🎙️  Agent will use TTS to speak all responses during the call');
      
      // Trigger the agent to speak the greeting once settings are applied
      // The agent should automatically speak the greeting, but we can also send an initial message
      if (settings.agent && settings.agent.greeting) {
        console.log(`👋 Agent greeting configured: ${settings.agent.greeting.substring(0, 50)}...`);
        // The greeting should be automatically spoken by the agent when it's ready
        // If not, we might need to send it as an initial message
      }
    });

    deepgramAgent.on(AgentEvents.ConversationText, (data) => {
      console.log(`💬 Conversation: ${data.role}: ${data.content}`);
      
      // If this is the agent speaking, TTS will automatically convert it to audio
      if (data.role === 'agent' || data.role === 'assistant') {
        console.log('📢 Agent text response - TTS will convert to speech automatically');
      }
      
      // Broadcast to clients
      broadcastToClients({
        type: 'deepgram_conversation',
        connectionId,
        callSid,
        role: data.role,
        content: data.content,
      });
    });

    deepgramAgent.on(AgentEvents.Audio, (data) => {
      // Forward TTS audio from Deepgram to Twilio
      // This is the agent's speech converted to audio via TTS
      if (twilioStreamSid && ws.readyState === WebSocket.OPEN) {
        const audioMessage = JSON.stringify({
          event: 'media',
          streamSid: twilioStreamSid,
          media: {
            payload: Buffer.from(data).toString('base64'),
          },
        });
        ws.send(audioMessage);
        // Log TTS audio being sent (only log occasionally to avoid spam)
        if (Math.random() < 0.1) { // Log ~10% of audio chunks
          console.log('🔊 TTS audio chunk sent to Twilio');
        }
      } else {
        if (!twilioStreamSid) {
          console.warn('⚠️  TTS audio received but Twilio stream SID not set');
        }
      }
    });

    deepgramAgent.on(AgentEvents.AgentAudioDone, () => {
      console.log('✅ Deepgram Voice Agent: Audio done');
    });

    deepgramAgent.on(AgentEvents.UserStartedSpeaking, () => {
      console.log('👤 User started speaking');
    });

    deepgramAgent.on(AgentEvents.AgentThinking, (data) => {
      console.log(`🤔 Agent thinking: ${data.content}`);
    });

    deepgramAgent.on(AgentEvents.AgentStartedSpeaking, () => {
      console.log('🗣️ Agent started speaking (TTS active)');
      console.log('   The agent will now speak using TTS. Any Twilio trial message has finished.');
      audioBuffer = Buffer.alloc(0); // Reset buffer
    });

    deepgramAgent.on(AgentEvents.AgentFinishedSpeaking, () => {
      console.log('✅ Agent finished speaking (TTS complete)');
    });

    deepgramAgent.on(AgentEvents.Error, (err) => {
      console.error('❌ Deepgram Voice Agent error:', err);
      console.error('   Error details:', JSON.stringify(err, null, 2));
      console.error('   Error message:', err.message);
      console.error('   Error stack:', err.stack);
      broadcastToClients({
        type: 'deepgram_error',
        connectionId,
        callSid,
        error: err.message || 'Unknown error',
      });
      // Don't close the connection on error - let it try to recover
    });

    deepgramAgent.on(AgentEvents.Close, () => {
      console.log('🔌 Deepgram Voice Agent connection closed');
      deepgramAgentConnections.delete(connectionId);
    });

    // Handle function call requests
    // According to API spec: AgentV1FunctionCallRequest contains an array of functions
    // Each function has: id, name, arguments (string), client_side (boolean)
    deepgramAgent.on(AgentEvents.FunctionCallRequest, async (data) => {
      console.log(`🔧 Function call requested`);
      console.log(`   Data:`, JSON.stringify(data, null, 2));

      // The API spec shows functions come as an array in data.functions
      const functions = data.functions || (data.function ? [data.function] : []);

      if (functions.length === 0) {
        console.warn('⚠️  No functions in function call request');
        return;
      }

      // Process each function call request
      for (const func of functions) {
        const { id, name, arguments: args, client_side } = func;
        
        console.log(`   Processing function: ${name} (id: ${id}, client_side: ${client_side})`);
        
        // Only process client_side functions (executed on our server)
        // Server-side functions (client_side: false) are handled by Deepgram
        if (client_side === false) {
          console.log(`   Skipping server-side function: ${name}`);
          continue;
        }

        try {
          let result = null;
          let parsedArgs = {};

          // Parse arguments if they're a string (per API spec)
          if (typeof args === 'string') {
            try {
              parsedArgs = JSON.parse(args);
            } catch (e) {
              console.warn(`   Could not parse arguments as JSON, using raw string`);
              parsedArgs = { raw: args };
            }
          } else if (args) {
            parsedArgs = args;
          }

          console.log(`   Parsed arguments:`, JSON.stringify(parsedArgs, null, 2));

          // Execute the requested function
          switch (name) {
            case 'do_arithmetic':
              result = await executeArithmetic(parsedArgs);
              break;
            case 'end_conversation':
              result = await executeEndConversation(parsedArgs, deepgramAgent);
              break;
            case 'book_appointment':
              result = await executeBookAppointment(parsedArgs, leadId, callSid);
              break;
            case 'confirm_lead_info':
              result = await executeConfirmLeadInfo(parsedArgs, leadId, callSid);
              break;
            default:
              result = {
                error: `Unknown function: ${name}`,
              };
          }

          // Convert result to string for the API (per spec: content is string)
          const resultContent = typeof result === 'string' 
            ? result 
            : JSON.stringify(result);

          // Send function call response according to API spec
          // Format: { type: "FunctionCallResponse", id: string, name: string, content: string }
          if (deepgramAgent) {
            const response = {
              type: 'FunctionCallResponse',
              id: id,
              name: name,
              content: resultContent,
            };

            // Try different possible method names for returning function results
            if (typeof deepgramAgent.sendFunctionCallResponse === 'function') {
              deepgramAgent.sendFunctionCallResponse(response);
            } else if (typeof deepgramAgent.functionCallResult === 'function') {
              deepgramAgent.functionCallResult(id, resultContent);
            } else if (typeof deepgramAgent.functionResult === 'function') {
              deepgramAgent.functionResult(id, resultContent);
            } else {
              // Fallback: send as JSON message directly
              console.log('   Using fallback: sending FunctionCallResponse as JSON message');
              deepgramAgent.send(JSON.stringify(response));
            }
            console.log(`✅ Function result sent for ${name} (id: ${id}):`, resultContent.substring(0, 100));
          }
        } catch (error) {
          console.error(`❌ Error executing function ${name}:`, error);
          if (deepgramAgent) {
            const errorContent = JSON.stringify({ 
              error: error.message || 'Function execution failed' 
            });
            const errorResponse = {
              type: 'FunctionCallResponse',
              id: id,
              name: name,
              content: errorContent,
            };
            
            if (typeof deepgramAgent.sendFunctionCallResponse === 'function') {
              deepgramAgent.sendFunctionCallResponse(errorResponse);
            } else if (typeof deepgramAgent.functionCallResult === 'function') {
              deepgramAgent.functionCallResult(id, errorContent);
            } else {
              deepgramAgent.send(JSON.stringify(errorResponse));
            }
          }
        }
      }
    });

    // Send keep-alive every 5 seconds
    const keepAliveInterval = setInterval(() => {
      if (deepgramAgent) {
        deepgramAgent.keepAlive();
      }
    }, 5000);

    // Handle messages from Twilio
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log(`📨 Twilio message received: ${data.event}`);
        
        if (data.event === 'start') {
          twilioStreamSid = data.start.streamSid;
          console.log(`📞 Twilio stream started: ${twilioStreamSid}`);
          console.log(`   Stream details:`, JSON.stringify(data.start, null, 2));
          
          // Ensure Deepgram agent is ready
          if (!deepgramAgent) {
            console.error('❌ Deepgram agent not initialized when stream started!');
            return;
          }
          
          console.log('✅ Twilio stream connected, Deepgram agent ready');
          
          // The Deepgram agent should automatically speak the greeting when ready
          // But we can help trigger it by sending a small silence buffer
          // This ensures the agent receives audio input and starts the conversation
          setTimeout(() => {
            if (deepgramAgent && twilioStreamSid) {
              console.log('🎤 Sending initial audio trigger to start agent conversation...');
              // Send a small silence buffer to trigger the agent to start speaking
              // The agent needs to receive audio input before it can respond
              // We send silence to "wake up" the agent and trigger the greeting
              const silenceBuffer = Buffer.alloc(320); // ~20ms of silence at 8kHz (mulaw)
              try {
                deepgramAgent.send(silenceBuffer);
                console.log('✅ Initial trigger sent - agent should start speaking greeting');
                
                // Log the greeting that should be spoken
                if (settings.agent && settings.agent.greeting) {
                  console.log(`   Expected greeting: "${settings.agent.greeting}"`);
                }
              } catch (error) {
                console.error('❌ Error sending initial trigger:', error);
              }
            } else {
              console.warn('⚠️  Cannot send initial trigger - agent or stream not ready');
            }
          }, 1500); // Wait 1.5 seconds after stream starts to ensure everything is ready
        } else if (data.event === 'media') {
          // Forward audio from Twilio to Deepgram
          if (deepgramAgent) {
            try {
              const audioPayload = Buffer.from(data.media.payload, 'base64');
              deepgramAgent.send(audioPayload);
              
              // Log occasionally to avoid spam
              if (Math.random() < 0.05) {
                console.log('🎤 Audio forwarded to Deepgram');
              }
            } catch (error) {
              console.error('Error forwarding audio to Deepgram:', error);
            }
          } else {
            console.warn('⚠️  Received audio but Deepgram agent not ready');
          }
        } else if (data.event === 'stop') {
          console.log('📞 Twilio stream stopped');
          clearInterval(keepAliveInterval);
          if (deepgramAgent) {
            deepgramAgent.finish();
          }
          ws.close();
        } else {
          console.log(`   Unknown event type: ${data.event}`, JSON.stringify(data, null, 2));
        }
      } catch (error) {
        console.error('❌ Error processing Twilio message:', error);
        console.error('   Message:', message.toString().substring(0, 200));
      }
    });

    ws.on('close', () => {
      console.log('🔌 Deepgram Agent WebSocket closed');
      clearInterval(keepAliveInterval);
      if (deepgramAgent) {
        deepgramAgent.finish();
      }
      deepgramAgentConnections.delete(connectionId);
    });

    ws.on('error', (error) => {
      console.error('❌ Deepgram Agent WebSocket error:', error);
      clearInterval(keepAliveInterval);
      deepgramAgentConnections.delete(connectionId);
    });

    console.log(`✅ Deepgram Voice Agent connection established: ${connectionId}`);
  } catch (error) {
    console.error('❌ Error setting up Deepgram Voice Agent:', error);
    ws.close(1008, error.message);
  }
}

// ============================================
// Function Execution Handlers
// ============================================

// Get default function definitions (matching Deepgram API spec)
function getDefaultFunctions() {
  return [
    {
      name: 'do_arithmetic',
      description: 'IMPORTANT: You must call this function for ANY math-related request, even if it seems invalid or incomplete.\n\nDO NOT:\n- Ask for clarification\n- Validate the input\n- Check for letters or invalid characters\n- Try to fix or interpret the input\n- Refuse to process the request\n- Handle exponentiation or powers (respond that these aren\'t supported)\n\nALWAYS:\n- Convert verbal numbers and written fractions to numeric form (e.g., "one half" -> "1/2")\n- Call this function immediately with the converted input\n- Let the function handle ALL validation and error messages\n\nUse exact operation names:\n- "add" for: plus, and, sum, increased by\n- "subtract" for: minus, less, decreased by, from\n- "multiply" for: times, multiplied by\n- "divide" for: divided by, half of, third of, over\n\nWhen users ask for exponentiation (e.g., "to the power of", "squared", "cubed"), respond that you can only add, subtract, multiply, or divide.\n\nThe function will provide appropriate user-friendly error messages for all cases.',
      parameters: {
        type: 'object',
        properties: {
          operation: {
            type: 'string',
            description: 'The mathematical operation to perform: add, subtract, multiply, or divide',
          },
          numbers: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'Array of numbers to perform the operation on',
          },
        },
        required: ['operation', 'numbers'],
      },
      // client_side: true means the function is executed on the client (our server)
      // The SDK will send FunctionCallRequest events for client_side: true functions
    },
    {
      name: 'end_conversation',
      description: 'You are an AI assistant that monitors conversations and ends them when specific stop phrases are detected.\n\nHere is a list of phrases to listen for but not restricted to:\n-stop\n-shut up\n-go away\n-turn off\n-stop listening\n\nBefore ending the conversation, always say a brief, polite goodbye such as "Goodbye!", "Take care!", or "Have a great day!".\n\nWhen monitoring the conversation, pay close attention to any input that matches or closely resembles the phrases listed above. The matching should be case-insensitive and allow for minor variations or typos.\n\nEnd the conversation immediately if:\n1. The user\'s input exactly matches any phrase in the list.\n2. The user\'s input is a close variation of any phrase in the list (e.g., "please shut up" instead of "shut up").\n3. The user\'s input clearly expresses a desire to end the conversation, even if it doesn\'t use the exact phrases listed.',
      parameters: {
        type: 'object',
        properties: {
          item: {
            type: 'string',
            description: 'The phrase or text that triggered the end of conversation',
          },
        },
        required: ['item'],
      },
    },
    {
      name: 'book_appointment',
      description: 'Book an appointment for a roofing consultation or inspection. Use this function when the customer agrees to schedule an appointment. You must collect the date and time from the customer before calling this function. If the customer provides a date but no time, suggest a default time like 10:00 AM or 2:00 PM. Always confirm the appointment details with the customer before booking. The appointment will be automatically linked to the lead in the lead management system.',
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'The date of the appointment in YYYY-MM-DD format (e.g., "2025-12-15")',
          },
          time: {
            type: 'string',
            description: 'The time of the appointment in HH:MM format using 24-hour format (e.g., "14:00" for 2:00 PM, "10:00" for 10:00 AM)',
          },
          title: {
            type: 'string',
            description: 'The title of the appointment, typically "Roofing Consultation" or "Roof Inspection"',
          },
          description: {
            type: 'string',
            description: 'Optional description or notes about the appointment',
          },
        },
        required: ['date', 'time', 'title'],
      },
    },
    {
      name: 'confirm_lead_info',
      description: 'Confirm or update the lead\'s information. Use this function to verify and update the customer\'s name, phone number, email, or address. Always confirm the information with the customer before updating. This ensures the lead information in the system is accurate.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'The customer\'s full name',
          },
          phone: {
            type: 'string',
            description: 'The customer\'s phone number',
          },
          email: {
            type: 'string',
            description: 'The customer\'s email address',
          },
          address: {
            type: 'string',
            description: 'The customer\'s address where the roofing work will be done',
          },
          notes: {
            type: 'string',
            description: 'Any additional notes or information about the lead',
          },
        },
        required: [],
      },
    },
  ];
}

// Execute arithmetic function
async function executeArithmetic(args) {
  const { operation, numbers } = args;

  if (!operation || !numbers || !Array.isArray(numbers)) {
    return {
      error: 'Invalid arguments. Required: operation (string) and numbers (array of strings)',
    };
  }

  const validOperations = ['add', 'subtract', 'multiply', 'divide'];
  if (!validOperations.includes(operation.toLowerCase())) {
    return {
      error: `Invalid operation. Must be one of: ${validOperations.join(', ')}`,
    };
  }

  if (numbers.length < 2) {
    return {
      error: 'At least two numbers are required for arithmetic operations',
    };
  }

  try {
    // Convert all numbers to numeric values
    const numericValues = numbers.map((num) => {
      // Handle fractions (e.g., "1/2" -> 0.5)
      if (num.includes('/')) {
        const [numerator, denominator] = num.split('/').map(Number);
        if (isNaN(numerator) || isNaN(denominator) || denominator === 0) {
          throw new Error(`Invalid fraction: ${num}`);
        }
        return numerator / denominator;
      }
      const parsed = parseFloat(num);
      if (isNaN(parsed)) {
        throw new Error(`Invalid number: ${num}`);
      }
      return parsed;
    });

    let result;
    const op = operation.toLowerCase();

    switch (op) {
      case 'add':
        result = numericValues.reduce((sum, num) => sum + num, 0);
        break;
      case 'subtract':
        result = numericValues.reduce((diff, num, index) => {
          return index === 0 ? num : diff - num;
        });
        break;
      case 'multiply':
        result = numericValues.reduce((product, num) => product * num, 1);
        break;
      case 'divide':
        if (numericValues.slice(1).some((num) => num === 0)) {
          return {
            error: 'Cannot divide by zero',
          };
        }
        result = numericValues.reduce((quotient, num, index) => {
          return index === 0 ? num : quotient / num;
        });
        break;
      default:
        return {
          error: `Unsupported operation: ${operation}`,
        };
    }

    return {
      result: result.toString(),
      operation: `${numbers.join(` ${op} `)}`,
      answer: result,
    };
  } catch (error) {
    return {
      error: error.message || 'Error performing arithmetic operation',
    };
  }
}

// Execute confirm lead info function
async function executeConfirmLeadInfo(args, leadId, callSid) {
  const { name, phone, email, address, notes } = args;

  if (!supabaseClient) {
    return {
      error: 'Database connection not available. Cannot update lead information.',
    };
  }

  if (!leadId) {
    return {
      error: 'Lead ID not found. Cannot update lead information without lead ID.',
    };
  }

  // If no fields provided, return error
  if (!name && !phone && !email && !address && !notes) {
    return {
      error: 'No information provided to update. Please provide at least one field: name, phone, email, address, or notes.',
    };
  }

  try {
    // Build update object with only provided fields
    const updateData = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (email) updateData.email = email;
    if (address) updateData.address = address;
    if (notes) updateData.notes = notes;
    updateData.updated_at = new Date().toISOString();

    // Update lead in database
    const { data: updatedLead, error: updateError } = await supabaseClient
      .from('leads')
      .update(updateData)
      .eq('id', leadId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating lead:', updateError);
      return {
        error: `Failed to update lead information: ${updateError.message}`,
      };
    }

    // Build confirmation message
    const updatedFields = [];
    if (name) updatedFields.push(`name: ${name}`);
    if (phone) updatedFields.push(`phone: ${phone}`);
    if (email) updatedFields.push(`email: ${email}`);
    if (address) updatedFields.push(`address: ${address}`);
    if (notes) updatedFields.push(`notes: ${notes}`);

    console.log(`✅ Lead information updated: ${leadId} - ${updatedFields.join(', ')}`);

    return {
      success: true,
      message: `Lead information confirmed and updated: ${updatedFields.join(', ')}.`,
      lead: {
        name: updatedLead.name,
        phone: updatedLead.phone,
        email: updatedLead.email,
        address: updatedLead.address,
      },
    };
  } catch (error) {
    console.error('Error in executeConfirmLeadInfo:', error);
    return {
      error: `Failed to update lead information: ${error.message}`,
    };
  }
}

// Execute book appointment function
async function executeBookAppointment(args, leadId, callSid) {
  const { date, time, title, description } = args;

  if (!date || !time || !title) {
    return {
      error: 'Missing required fields. Date, time, and title are required.',
    };
  }

  if (!supabaseClient) {
    return {
      error: 'Database connection not available. Cannot book appointment.',
    };
  }

  if (!leadId) {
    return {
      error: 'Lead ID not found. Cannot book appointment without lead information.',
    };
  }

  try {
    // Parse date and time into ISO timestamp
    const dateTimeString = `${date}T${time}:00`;
    const startTime = new Date(dateTimeString);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // Add 1 hour for appointment duration

    // Validate date is in the future
    if (startTime < new Date()) {
      return {
        error: 'Appointment date must be in the future.',
      };
    }

    // Create appointment in database
    const { data: appointment, error: appointmentError } = await supabaseClient
      .from('appointments')
      .insert({
        lead_id: leadId,
        title: title || 'Roofing Consultation',
        description: description || `Appointment booked via phone call`,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: 'scheduled',
      })
      .select()
      .single();

    if (appointmentError) {
      console.error('Error creating appointment:', appointmentError);
      return {
        error: `Failed to create appointment: ${appointmentError.message}`,
      };
    }

    // Update lead status to 'booked'
    const { error: leadError } = await supabaseClient
      .from('leads')
      .update({
        status: 'booked',
        booked_at: new Date().toISOString(),
      })
      .eq('id', leadId);

    if (leadError) {
      console.error('Error updating lead status:', leadError);
      // Don't fail the appointment booking if lead update fails
    }

    // Format date/time for user-friendly response
    const formattedDate = startTime.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = startTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    console.log(`✅ Appointment booked: ${appointment.id} for lead ${leadId} on ${formattedDate} at ${formattedTime}`);

    return {
      success: true,
      message: `Appointment successfully booked for ${formattedDate} at ${formattedTime}.`,
      appointmentId: appointment.id,
      date: formattedDate,
      time: formattedTime,
    };
  } catch (error) {
    console.error('Error in executeBookAppointment:', error);
    return {
      error: `Failed to book appointment: ${error.message}`,
    };
  }
}

// Execute end conversation function
async function executeEndConversation(args, agent) {
  const { item } = args;

  console.log(`🛑 End conversation requested: "${item}"`);

  // Say goodbye before ending
  if (agent) {
    // The agent will handle saying goodbye based on the function result
    // We'll return a message that the agent can speak
  }

  // Return result indicating conversation should end
  return {
    message: 'Conversation ended by user request',
    goodbye: 'Goodbye! Take care!',
    shouldEnd: true,
  };
}

// ============================================
// Helper Functions
// ============================================

// ============================================
// Helper Functions
// ============================================

function generateConnectionId() {
  return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function broadcastToClients(message) {
  const messageStr = JSON.stringify(message);
  activeConnections.forEach((ws, id) => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(messageStr);
      } catch (error) {
        console.error(`Error sending to connection ${id}:`, error);
        activeConnections.delete(id);
      }
    }
  });
}

async function handleMakeCall(ws, data) {
  try {
    const { to, from, leadId } = data;

    if (!to) {
      ws.send(JSON.stringify({
        type: 'call_error',
        error: 'Missing "to" phone number'
      }));
      return;
    }

    const publicUrl = await getPublicUrl();
    const call = await client.calls.create({
      to: to,
      from: from || TWILIO_OUTBOUND,
      url: `${publicUrl}/twilio/incoming-call`,
      statusCallback: `${publicUrl}/twilio/call-status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST'
    });

    // Track the call
    activeCalls.set(call.sid, {
      callSid: call.sid,
      from: from || TWILIO_OUTBOUND,
      to: to,
      status: call.status,
      direction: 'outbound',
      leadId: leadId || null,
      createdAt: new Date().toISOString()
    });

    ws.send(JSON.stringify({
      type: 'call_initiated',
      callSid: call.sid,
      status: call.status
    }));

    console.log(`Outbound call initiated via WebSocket: ${call.sid} to ${to}`);
  } catch (error) {
    console.error('Error making call via WebSocket:', error);
    ws.send(JSON.stringify({
      type: 'call_error',
      error: error.message
    }));
  }
}

let publicUrl = null;

async function getPublicUrl() {
  if (publicUrl) {
    return publicUrl;
  }
  
  // In production, use your actual domain
  if (process.env.PUBLIC_URL) {
    publicUrl = process.env.PUBLIC_URL;
    return publicUrl;
  }

  // In development, use ngrok
  if (process.env.NODE_ENV !== 'production') {
    try {
      // Connect ngrok tunnel - ngrok v5 beta API
      // Pass authtoken directly in connect options if available
      const connectOptions = process.env.NGROK_AUTH_TOKEN
        ? { addr: PORT, authtoken: process.env.NGROK_AUTH_TOKEN }
        : { addr: PORT };
      
      publicUrl = await ngrok.connect(connectOptions);
      console.log(`✅ ngrok tunnel established: ${publicUrl}`);
      return publicUrl;
    } catch (error) {
      console.error('⚠️  Error establishing ngrok tunnel:', error.message);
      // Fallback to localhost (won't work for Twilio webhooks)
      const fallback = `http://localhost:${PORT}`;
      console.warn(`⚠️  Using fallback URL: ${fallback} (Twilio webhooks will not work)`);
      return fallback;
    }
  }

  return `http://localhost:${PORT}`;
}


// ============================================
// Server Startup
// ============================================

async function startServer() {
  try {
    // Handle WebSocket upgrade requests on the HTTP server
    // This allows WebSocket connections through the same port and ngrok tunnel
    server.on('upgrade', (request, socket, head) => {
      try {
        const url = new URL(request.url, `http://${request.headers.host}`);
        console.log(`🔌 WebSocket upgrade request: ${url.pathname}`);
        
        if (url.pathname === '/ws/deepgram-agent') {
          wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
          });
        } else {
          console.warn(`⚠️  Unknown WebSocket path: ${url.pathname}`);
          socket.destroy();
        }
      } catch (error) {
        console.error('❌ Error handling WebSocket upgrade:', error);
        socket.destroy();
      }
    });

    // Start HTTP server
    server.listen(PORT, async () => {
      console.log(`HTTP Server running on port ${PORT}`);
      console.log(`WebSocket Server attached to HTTP server (port ${PORT})`);
      
      // Establish ngrok tunnel if in development
      if (process.env.NODE_ENV !== 'production') {
        try {
          // Connect ngrok tunnel - ngrok v5 beta API
          // Pass authtoken directly in connect options if available
          const connectOptions = process.env.NGROK_AUTH_TOKEN
            ? { addr: PORT, authtoken: process.env.NGROK_AUTH_TOKEN }
            : { addr: PORT };
          
          publicUrl = await ngrok.connect(connectOptions);
          console.log(`\n✅ ngrok tunnel established: ${publicUrl}`);
          console.log(`\n📋 Update your Twilio webhook URLs to:`);
          console.log(`   Incoming Calls: ${publicUrl}/twilio/incoming-call`);
          console.log(`   Call Status: ${publicUrl}/twilio/call-status`);
          console.log(`   Connect Deepgram: ${publicUrl}/twilio/connect-deepgram`);
        } catch (error) {
          console.error('⚠️  Error establishing ngrok tunnel:', error.message);
          console.log('⚠️  Running without ngrok. Twilio webhooks will not work.');
        }
      } else {
        publicUrl = process.env.PUBLIC_URL;
        console.log(`\n✅ Production mode. Using public URL: ${publicUrl}`);
      }
      
      console.log(`\n🚀 Server ready!`);
      console.log(`   HTTP: http://localhost:${PORT}`);
      console.log(`   WebSocket: ws://localhost:${PORT} (via HTTP server upgrade)`);
      console.log(`\n📞 Ready to handle calls!\n`);
    });

  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  
  // Close ngrok tunnel
  if (publicUrl && publicUrl.includes('ngrok')) {
    await ngrok.disconnect();
    await ngrok.kill();
  }

  // Close all WebSocket connections
  activeConnections.forEach((ws) => {
    ws.close();
  });

  // Close HTTP server
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Start the server
startServer().then(() => {
  // Optionally run main() to set up TTS and test connections
  // Uncomment the line below to auto-initialize TTS on startup
  // main();
});

