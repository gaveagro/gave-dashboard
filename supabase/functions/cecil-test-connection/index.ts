import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub;

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const cecilApiKey = Deno.env.get('CECIL_API_KEY');
    if (!cecilApiKey) {
      throw new Error('CECIL_API_KEY is not configured');
    }

    const cecilApiUrl = 'https://api.cecil.app';
    
    const testResponse = await fetch(`${cecilApiUrl}/datasets`, {
      headers: { 'Authorization': `Bearer ${cecilApiKey}` },
    });

    if (!testResponse.ok) {
      throw new Error(`Cecil API connection failed: ${testResponse.status}`);
    }

    const datasets = await testResponse.json();

    let organizationInfo = null;
    try {
      const orgResponse = await fetch(`${cecilApiUrl}/organisation`, {
        headers: { 'Authorization': `Bearer ${cecilApiKey}` },
      });
      if (orgResponse.ok) organizationInfo = await orgResponse.json();
    } catch (_) {}

    let aoisInfo = null;
    try {
      const aoisResponse = await fetch(`${cecilApiUrl}/aois`, {
        headers: { 'Authorization': `Bearer ${cecilApiKey}` },
      });
      if (aoisResponse.ok) aoisInfo = await aoisResponse.json();
    } catch (_) {}

    return new Response(JSON.stringify({
      success: true,
      message: 'Cecil API connection successful',
      data: {
        datasets,
        organization: organizationInfo,
        aois: aoisInfo,
        connection_test: 'passed',
        timestamp: new Date().toISOString()
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Cecil connection test failed:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Connection test failed'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
