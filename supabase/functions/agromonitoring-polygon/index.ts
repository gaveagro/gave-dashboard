import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const AGROMONITORING_API_URL = 'https://api.agromonitoring.com/agro/1.0';

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

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub;

    // Verify admin role
    const { data: profile } = await supabaseAuth
      .from('profiles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('AGROMONITORING_API_KEY');
    if (!apiKey) throw new Error('AGROMONITORING_API_KEY not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const action = typeof body.action === 'string' ? body.action : '';
    const plotId = typeof body.plotId === 'string' ? body.plotId : '';
    const polygonData = body.polygonData || {};

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    switch (action) {
      case 'create': {
        if (!plotId || !uuidRegex.test(plotId)) {
          return new Response(JSON.stringify({ error: 'Invalid plotId' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: plot, error: plotError } = await supabase
          .from('plots')
          .select('id, name, coordinates, latitude, longitude, area')
          .eq('id', plotId)
          .single();

        if (plotError || !plot) throw new Error(`Plot not found: ${plotError?.message}`);

        let geoJson: any;
        if (plot.coordinates) {
          const coordPairs = plot.coordinates.split(' ').map((pair: string) => {
            const [lat, lng] = pair.split(',').map(Number);
            return [lng, lat];
          });
          if (coordPairs.length > 0) {
            const first = coordPairs[0];
            const last = coordPairs[coordPairs.length - 1];
            if (first[0] !== last[0] || first[1] !== last[1]) coordPairs.push(first);
          }
          geoJson = { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [coordPairs] } };
        } else if (plot.latitude && plot.longitude) {
          const lat = Number(plot.latitude);
          const lng = Number(plot.longitude);
          const offset = 0.005;
          geoJson = { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[ [lng-offset,lat-offset],[lng+offset,lat-offset],[lng+offset,lat+offset],[lng-offset,lat+offset],[lng-offset,lat-offset] ]] } };
        } else {
          throw new Error('Plot has no coordinates');
        }

        const createResponse = await fetch(`${AGROMONITORING_API_URL}/polygons?appid=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: plot.name, geo_json: geoJson })
        });

        if (!createResponse.ok) throw new Error(`Failed to create polygon: ${await createResponse.text()}`);

        const agroPolygon = await createResponse.json();
        const coords = geoJson.geometry.coordinates[0];
        const centerLng = coords.reduce((sum: number, c: number[]) => sum + c[0], 0) / coords.length;
        const centerLat = coords.reduce((sum: number, c: number[]) => sum + c[1], 0) / coords.length;

        const { data: savedPolygon, error: saveError } = await supabase
          .from('agromonitoring_polygons')
          .insert({ plot_id: plotId, polygon_id: agroPolygon.id, name: plot.name, geo_json: geoJson, area_hectares: agroPolygon.area || plot.area, center_lat: centerLat, center_lng: centerLng })
          .select().single();

        if (saveError) throw saveError;

        return new Response(JSON.stringify({ success: true, polygon: savedPolygon }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'list': {
        const listResponse = await fetch(`${AGROMONITORING_API_URL}/polygons?appid=${apiKey}`);
        if (!listResponse.ok) throw new Error('Failed to list polygons');
        return new Response(JSON.stringify({ success: true, polygons: await listResponse.json() }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'delete': {
        const polygonId = typeof polygonData.polygonId === 'string' ? polygonData.polygonId : '';
        if (!polygonId) throw new Error('polygonId required for delete');

        const deleteResponse = await fetch(`${AGROMONITORING_API_URL}/polygons/${encodeURIComponent(polygonId)}?appid=${apiKey}`, { method: 'DELETE' });
        if (!deleteResponse.ok) throw new Error('Failed to delete polygon');

        await supabase.from('agromonitoring_polygons').delete().eq('polygon_id', polygonId);

        return new Response(JSON.stringify({ success: true, message: 'Polygon deleted' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('Agromonitoring polygon error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
