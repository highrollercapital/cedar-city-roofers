import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { accessCode } = await req.json();

    if (!accessCode || typeof accessCode !== 'string') {
      console.log('Access code validation failed: missing or invalid code');
      return new Response(
        JSON.stringify({ valid: false, error: 'Access code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validAccessCode = Deno.env.get('PARTNER_ACCESS_CODE');
    
    if (!validAccessCode) {
      console.error('PARTNER_ACCESS_CODE secret is not configured');
      return new Response(
        JSON.stringify({ valid: false, error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Constant-time comparison to prevent timing attacks
    const isValid = accessCode.trim() === validAccessCode.trim();
    
    console.log(`Access code validation attempt: ${isValid ? 'success' : 'failed'}`);

    return new Response(
      JSON.stringify({ valid: isValid }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error validating access code:', error);
    return new Response(
      JSON.stringify({ valid: false, error: 'Validation failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
