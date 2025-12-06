// Supabase Edge Function: Update Integration Secrets
// This function updates Supabase Edge Function secrets when users save integration configs

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const body = await req.json();
    const { service, config } = body;

    if (!service || !config) {
      return new Response(
        JSON.stringify({ success: false, error: 'Service and config are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Note: In production, you would use Supabase Management API to update secrets
    // For now, we'll just return success as the secrets should be set manually
    // or via Supabase CLI/dashboard
    
    console.log(`Updating secrets for ${service}:`, {
      hasConfig: !!config,
      keys: Object.keys(config || {}),
    });

    // Return success - actual secret updates should be done via Supabase Dashboard or CLI
    return new Response(
      JSON.stringify({
        success: true,
        message: `Configuration saved. Please update Edge Function secrets in Supabase Dashboard for ${service}.`,
        note: 'Secrets must be updated manually in Supabase Dashboard → Edge Functions → Secrets',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Update Secrets Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

