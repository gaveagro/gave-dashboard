import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const cecilApiKey = Deno.env.get('CECIL_API_KEY');
    
    if (!cecilApiKey) {
      throw new Error('CECIL_API_KEY is not configured');
    }

    console.log('Testing Cecil API connection...');

    // Test Cecil API connectivity using the correct URL
    const cecilApiUrl = 'https://api.cecil.app';
    
    console.log(`Testing Cecil API at: ${cecilApiUrl}`);
    
    const testResponse = await fetch(`${cecilApiUrl}/datasets`, {
      headers: {
        'Authorization': `Bearer ${cecilApiKey}`,
      },
    });

    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      throw new Error(`Cecil API connection failed: ${testResponse.status} - ${errorText}. Please verify your CECIL_API_KEY is valid and active.`);
    }

    const datasets = await testResponse.json();
    console.log('Cecil API connection successful. Available datasets:', datasets.length);

    // Test organization info if available
    let organizationInfo = null;
    try {
      const orgResponse = await fetch(`${cecilApiUrl}/organisation`, {
        headers: {
          'Authorization': `Bearer ${cecilApiKey}`,
        },
      });

      if (orgResponse.ok) {
        organizationInfo = await orgResponse.json();
        console.log('Organization info retrieved:', organizationInfo);
      }
    } catch (orgError) {
      console.log('Organization info not available or failed to retrieve');
    }

    // Test AOI listing
    let aoisInfo = null;
    try {
      const aoisResponse = await fetch(`${cecilApiUrl}/aois`, {
        headers: {
          'Authorization': `Bearer ${cecilApiKey}`,
        },
      });

      if (aoisResponse.ok) {
        aoisInfo = await aoisResponse.json();
        console.log('AOIs retrieved:', aoisInfo.length || 0);
      }
    } catch (aoisError) {
      console.log('AOIs info not available or failed to retrieve');
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Cecil API connection successful',
      data: {
        datasets: datasets,
        organization: organizationInfo,
        aois: aoisInfo,
        working_base_url: cecilApiUrl,
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
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});