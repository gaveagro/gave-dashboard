import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AGROMONITORING_API_URL = 'https://api.agromonitoring.com/agro/1.0';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('AGROMONITORING_API_KEY');
    if (!apiKey) {
      throw new Error('AGROMONITORING_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, plotId, polygonData } = await req.json();
    console.log(`Agromonitoring polygon action: ${action}, plotId: ${plotId}`);

    switch (action) {
      case 'create': {
        // Get plot coordinates from database
        const { data: plot, error: plotError } = await supabase
          .from('plots')
          .select('id, name, coordinates, latitude, longitude, area')
          .eq('id', plotId)
          .single();

        if (plotError || !plot) {
          throw new Error(`Plot not found: ${plotError?.message}`);
        }

        // Parse coordinates - expecting format like "lat,lng lat,lng lat,lng..."
        let geoJson: any;
        
        if (plot.coordinates) {
          const coordPairs = plot.coordinates.split(' ').map((pair: string) => {
            const [lat, lng] = pair.split(',').map(Number);
            return [lng, lat]; // GeoJSON uses [lng, lat] order
          });
          
          // Close the polygon if not already closed
          if (coordPairs.length > 0) {
            const first = coordPairs[0];
            const last = coordPairs[coordPairs.length - 1];
            if (first[0] !== last[0] || first[1] !== last[1]) {
              coordPairs.push(first);
            }
          }
          
          geoJson = {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Polygon",
              coordinates: [coordPairs]
            }
          };
        } else if (plot.latitude && plot.longitude) {
          // Create a simple square polygon around the point
          const lat = Number(plot.latitude);
          const lng = Number(plot.longitude);
          const offset = 0.005; // ~500m offset
          
          geoJson = {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Polygon",
              coordinates: [[
                [lng - offset, lat - offset],
                [lng + offset, lat - offset],
                [lng + offset, lat + offset],
                [lng - offset, lat + offset],
                [lng - offset, lat - offset]
              ]]
            }
          };
        } else {
          throw new Error('Plot has no coordinates');
        }

        console.log('Creating polygon with GeoJSON:', JSON.stringify(geoJson));

        // Create polygon in Agromonitoring
        const createResponse = await fetch(`${AGROMONITORING_API_URL}/polygons?appid=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: plot.name,
            geo_json: geoJson
          })
        });

        if (!createResponse.ok) {
          const errorText = await createResponse.text();
          console.error('Agromonitoring create error:', errorText);
          throw new Error(`Failed to create polygon: ${errorText}`);
        }

        const agroPolygon = await createResponse.json();
        console.log('Agromonitoring polygon created:', agroPolygon);

        // Calculate center
        const coords = geoJson.geometry.coordinates[0];
        const centerLng = coords.reduce((sum: number, c: number[]) => sum + c[0], 0) / coords.length;
        const centerLat = coords.reduce((sum: number, c: number[]) => sum + c[1], 0) / coords.length;

        // Save to our database
        const { data: savedPolygon, error: saveError } = await supabase
          .from('agromonitoring_polygons')
          .insert({
            plot_id: plotId,
            polygon_id: agroPolygon.id,
            name: plot.name,
            geo_json: geoJson,
            area_hectares: agroPolygon.area || plot.area,
            center_lat: centerLat,
            center_lng: centerLng
          })
          .select()
          .single();

        if (saveError) {
          console.error('Error saving polygon to database:', saveError);
          throw saveError;
        }

        return new Response(JSON.stringify({
          success: true,
          polygon: savedPolygon,
          agromonitoring: agroPolygon
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'list': {
        const listResponse = await fetch(`${AGROMONITORING_API_URL}/polygons?appid=${apiKey}`);
        
        if (!listResponse.ok) {
          throw new Error('Failed to list polygons');
        }

        const polygons = await listResponse.json();
        
        return new Response(JSON.stringify({
          success: true,
          polygons
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'delete': {
        const { polygonId } = polygonData || {};
        
        if (!polygonId) {
          throw new Error('polygonId required for delete');
        }

        const deleteResponse = await fetch(`${AGROMONITORING_API_URL}/polygons/${polygonId}?appid=${apiKey}`, {
          method: 'DELETE'
        });

        if (!deleteResponse.ok) {
          throw new Error('Failed to delete polygon');
        }

        // Remove from our database
        await supabase
          .from('agromonitoring_polygons')
          .delete()
          .eq('polygon_id', polygonId);

        return new Response(JSON.stringify({
          success: true,
          message: 'Polygon deleted'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('Agromonitoring polygon error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
