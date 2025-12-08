import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Twilio API base URL
const TWILIO_API_BASE = 'https://api.twilio.com/2010-04-01';

serve(async (req) => {
  const url = new URL(req.url);
  const path = url.pathname.split('/').pop();
  
  console.log(`📞 Twilio Voice Function called: ${req.method} ${url.pathname}`);
  console.log(`   Path segment: ${path}`);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
  const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
  const DEEPGRAM_API_KEY = Deno.env.get('DEEPGRAM_API_KEY');

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    console.error('❌ Missing Twilio credentials');
    return new Response(
      JSON.stringify({ error: 'Twilio credentials not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Route based on path or action parameter
    const action = url.searchParams.get('action') || path;
    
    switch (action) {
      case 'make-call':
        return await handleMakeCall(req, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, DEEPGRAM_API_KEY);
      
      case 'call-status':
        return await handleCallStatus(req);
      
      case 'connect-deepgram':
        return await handleConnectDeepgram(req, url);
      
      case 'twiml-response':
        return await handleTwimlResponse(req, url);
        
      case 'health':
        return new Response(
          JSON.stringify({ 
            status: 'ok', 
            timestamp: new Date().toISOString(),
            hasDeepgram: !!DEEPGRAM_API_KEY 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      
      default:
        // Default to make-call for POST requests
        if (req.method === 'POST') {
          return await handleMakeCall(req, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, DEEPGRAM_API_KEY);
        }
        return new Response(
          JSON.stringify({ error: 'Unknown action', action }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: unknown) {
    console.error('❌ Error in twilio-voice function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Handle making an outbound call
async function handleMakeCall(
  req: Request, 
  accountSid: string, 
  authToken: string,
  deepgramApiKey: string | undefined
) {
  const body = await req.json();
  const { to, from, leadId, settings } = body;

  if (!to) {
    return new Response(
      JSON.stringify({ success: false, error: 'Missing "to" phone number' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!from) {
    return new Response(
      JSON.stringify({ success: false, error: 'Missing "from" phone number' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!deepgramApiKey) {
    return new Response(
      JSON.stringify({ success: false, error: 'Deepgram API key not configured' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log(`📞 Initiating call to ${to} from ${from}`);
  console.log(`   Lead ID: ${leadId || 'none'}`);

  // Get the function URL for webhooks
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const functionUrl = `${supabaseUrl}/functions/v1/twilio-voice`;

  // Create TwiML URL with settings encoded
  const settingsParam = settings ? encodeURIComponent(JSON.stringify(settings)) : '';
  const twimlUrl = `${functionUrl}?action=connect-deepgram&leadId=${leadId || ''}&settings=${settingsParam}`;
  const statusCallbackUrl = `${functionUrl}?action=call-status`;

  // Make Twilio API call
  const twilioUrl = `${TWILIO_API_BASE}/Accounts/${accountSid}/Calls.json`;
  const auth = btoa(`${accountSid}:${authToken}`);

  const formData = new URLSearchParams();
  formData.append('To', to);
  formData.append('From', from);
  formData.append('Url', twimlUrl);
  formData.append('StatusCallback', statusCallbackUrl);
  formData.append('StatusCallbackEvent', 'initiated');
  formData.append('StatusCallbackEvent', 'ringing');
  formData.append('StatusCallbackEvent', 'answered');
  formData.append('StatusCallbackEvent', 'completed');
  formData.append('StatusCallbackMethod', 'POST');

  console.log(`   TwiML URL: ${twimlUrl}`);
  console.log(`   Status Callback: ${statusCallbackUrl}`);

  const response = await fetch(twilioUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  const result = await response.json();

  if (!response.ok) {
    console.error('❌ Twilio API error:', result);
    return new Response(
      JSON.stringify({ success: false, error: result.message || 'Failed to initiate call' }),
      { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log(`✅ Call initiated: ${result.sid}`);

  return new Response(
    JSON.stringify({
      success: true,
      callSid: result.sid,
      status: result.status,
      message: 'Deepgram Voice Agent call initiated'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Handle call status webhook from Twilio
async function handleCallStatus(req: Request) {
  const formData = await req.formData();
  const callSid = formData.get('CallSid');
  const callStatus = formData.get('CallStatus');
  const from = formData.get('From');
  const to = formData.get('To');

  console.log(`📞 Call Status Update: ${callSid} - ${callStatus}`);
  console.log(`   From: ${from} To: ${to}`);

  // Return empty response for webhook
  return new Response('', { 
    status: 200, 
    headers: { 'Content-Type': 'text/xml' } 
  });
}

// Handle connect to Deepgram - returns TwiML
async function handleConnectDeepgram(req: Request, url: URL) {
  console.log('📞 Connect Deepgram webhook called');
  
  const leadId = url.searchParams.get('leadId');
  const settingsParam = url.searchParams.get('settings');
  
  let settings = null;
  if (settingsParam) {
    try {
      settings = JSON.parse(decodeURIComponent(settingsParam));
    } catch (e) {
      console.warn('Failed to parse settings:', e);
    }
  }

  // Get form data from Twilio
  let callSid = '';
  try {
    const formData = await req.formData();
    callSid = formData.get('CallSid')?.toString() || '';
    console.log(`   Call SID: ${callSid}`);
  } catch (e) {
    console.warn('Could not parse form data:', e);
  }

  // Build TwiML response that connects to Deepgram
  // Note: For Deepgram Voice Agent, we need to use a WebSocket stream
  // Twilio's <Stream> connects to our WebSocket handler
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  
  // Convert https:// to wss:// for WebSocket connection
  const wsUrl = supabaseUrl?.replace('https://', 'wss://').replace('.supabase.co', '.functions.supabase.co');
  const streamUrl = `${wsUrl}/v1/twilio-deepgram-stream?callSid=${callSid}&leadId=${leadId || ''}`;
  
  // Get greeting from settings or use default
  const greeting = settings?.agent?.greeting || 
    "Hello! Thank you for calling. I'm your AI assistant. How can I help you today?";

  // Create TwiML response
  // Since we can't do real-time WebSocket bidirectional audio in an edge function,
  // we'll use Twilio's <Say> and <Gather> for a simpler interaction
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Matthew">${escapeXml(greeting)}</Say>
  <Pause length="1"/>
  <Gather input="speech" timeout="5" action="${supabaseUrl}/functions/v1/twilio-voice?action=twiml-response&amp;leadId=${leadId || ''}" method="POST">
    <Say voice="Polly.Matthew">Please tell me how I can assist you.</Say>
  </Gather>
  <Say voice="Polly.Matthew">I didn't hear a response. Goodbye!</Say>
</Response>`;

  console.log('   Returning TwiML response');

  return new Response(twiml, {
    headers: { 'Content-Type': 'text/xml' }
  });
}

// Handle TwiML response after speech input
async function handleTwimlResponse(req: Request, url: URL) {
  console.log('📞 TwiML Response webhook called');
  
  const leadId = url.searchParams.get('leadId');
  const DEEPGRAM_API_KEY = Deno.env.get('DEEPGRAM_API_KEY');
  
  let speechResult = '';
  try {
    const formData = await req.formData();
    speechResult = formData.get('SpeechResult')?.toString() || '';
    console.log(`   Speech Result: ${speechResult}`);
  } catch (e) {
    console.warn('Could not parse form data:', e);
  }

  // If no speech detected, end the call
  if (!speechResult) {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Matthew">I couldn't understand that. Please call back and try again. Goodbye!</Say>
  <Hangup/>
</Response>`;
    return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
  }

  // Use Deepgram or a simple response
  let aiResponse = "Thank you for your message. A team member will follow up with you shortly. Is there anything else I can help you with?";
  
  // For now, we'll use a simple response. In a full implementation,
  // you would call an LLM here to generate a contextual response.
  // The app.js used Deepgram's Voice Agent which handles this automatically.
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Matthew">${escapeXml(aiResponse)}</Say>
  <Pause length="1"/>
  <Gather input="speech" timeout="5" action="${supabaseUrl}/functions/v1/twilio-voice?action=twiml-response&amp;leadId=${leadId || ''}" method="POST">
    <Say voice="Polly.Matthew">Please go ahead.</Say>
  </Gather>
  <Say voice="Polly.Matthew">Thank you for calling. Goodbye!</Say>
  <Hangup/>
</Response>`;

  return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
}

// Helper to escape XML special characters
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
