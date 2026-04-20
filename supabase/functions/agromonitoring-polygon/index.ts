import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const AGROMONITORING_API_URL = 'https://api.agromonitoring.com/agro/1.0';

/**
 * Robustly parse a "coordinates" string into [lng, lat] pairs.
 * Accepts formats:
 *  - "lat,lng lat,lng lat,lng"
 *  - "lat, lng; lat, lng; lat, lng"
 *  - "lat,lng"  (single point — caller must fall back)
 */
function parseCoordinatesString(raw: string): number[][] {
  if (!raw || typeof raw !== 'string') return [];
  // Split on space, semicolon, or newline. Keep the comma as the lat/lng separator.
  const tokens = raw
    .split(/[;\n]|\s{2,}|\s(?=-?\d)/)
    .map((t) => t.trim())
    .filter(Boolean);

  const pairs: number[][] = [];
  for (const token of tokens) {
    const cleaned = token.replace(/[()]/g, '').trim();
    const parts = cleaned.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length !== 2) continue;
    const lat = Number(parts[0]);
    const lng = Number(parts[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) continue;
    pairs.push([lng, lat]); // GeoJSON uses [lng, lat]
  }

  // De-duplicate consecutive identical pairs
  const dedup: number[][] = [];
  for (const p of pairs) {
    const last = dedup[dedup.length - 1];
    if (!last || last[0] !== p[0] || last[1] !== p[1]) dedup.push(p);
  }
  return dedup;
}

/** Build a square polygon (in degrees) around a single point, sized by hectares. */
function buildSquareFromPoint(lat: number, lng: number, areaHa: number): number[][] {
  const safeArea = Number.isFinite(areaHa) && areaHa > 0 ? areaHa : 1;
  const sideMeters = Math.sqrt(safeArea * 10000); // 1 ha = 10,000 m²
  // Latitude: 1 deg ≈ 111,320 m. Longitude shrinks with cos(lat).
  const halfLatDeg = sideMeters / 2 / 111320;
  const halfLngDeg = sideMeters / 2 / (111320 * Math.cos((lat * Math.PI) / 180));
  return [
    [lng - halfLngDeg, lat - halfLatDeg],
    [lng + halfLngDeg, lat - halfLatDeg],
    [lng + halfLngDeg, lat + halfLatDeg],
    [lng - halfLngDeg, lat + halfLatDeg],
    [lng - halfLngDeg, lat - halfLatDeg], // close ring
  ];
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
    }

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return jsonResponse({ success: false, error: 'Invalid token' }, 401);
    }

    const userId = claimsData.claims.sub;

    const { data: profile } = await supabaseAuth
      .from('profiles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (profile?.role !== 'admin') {
      return jsonResponse({ success: false, error: 'Forbidden: Admin access required' }, 403);
    }

    const apiKey = Deno.env.get('AGROMONITORING_API_KEY');
    if (!apiKey) return jsonResponse({ success: false, error: 'AGROMONITORING_API_KEY not configured' }, 500);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json();
    const action = typeof body.action === 'string' ? body.action : '';
    const plotId = typeof body.plotId === 'string' ? body.plotId : '';
    const polygonData = body.polygonData || {};

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    switch (action) {
      case 'create': {
        if (!plotId || !uuidRegex.test(plotId)) {
          return jsonResponse({ success: false, error: 'Invalid plotId' }, 400);
        }

        const { data: plot, error: plotError } = await supabase
          .from('plots')
          .select('id, name, coordinates, latitude, longitude, area')
          .eq('id', plotId)
          .single();

        if (plotError || !plot) {
          return jsonResponse({ success: false, error: `Plot not found: ${plotError?.message || 'unknown'}` }, 404);
        }

        // Check if polygon already exists for this plot
        const { data: existing } = await supabase
          .from('agromonitoring_polygons')
          .select('id')
          .eq('plot_id', plotId)
          .maybeSingle();

        if (existing) {
          return jsonResponse({ success: false, error: 'Polygon already exists for this plot' }, 409);
        }

        // 1. Try to parse the coordinates string into a valid polygon (>=3 distinct pts).
        let coordPairs: number[][] = [];
        if (plot.coordinates) {
          const parsed = parseCoordinatesString(plot.coordinates);
          if (parsed.length >= 3) {
            coordPairs = [...parsed];
            const first = coordPairs[0];
            const last = coordPairs[coordPairs.length - 1];
            if (first[0] !== last[0] || first[1] !== last[1]) coordPairs.push(first);
          }
        }

        // 2. Fallback: build a square sized by `area` (hectares) around lat/lng
        //    (or around the single parsed point).
        if (coordPairs.length < 4) {
          let centerLat: number | null = null;
          let centerLng: number | null = null;
          if (plot.latitude != null && plot.longitude != null) {
            centerLat = Number(plot.latitude);
            centerLng = Number(plot.longitude);
          } else if (plot.coordinates) {
            const single = parseCoordinatesString(plot.coordinates)[0];
            if (single) {
              centerLng = single[0];
              centerLat = single[1];
            }
          }
          if (centerLat == null || centerLng == null || !Number.isFinite(centerLat) || !Number.isFinite(centerLng)) {
            return jsonResponse({
              success: false,
              error: 'Plot has no usable coordinates (need lat/lng or a coordinate string).',
              details: { coordinates: plot.coordinates, latitude: plot.latitude, longitude: plot.longitude },
            }, 400);
          }
          coordPairs = buildSquareFromPoint(centerLat, centerLng, Number(plot.area));
        }

        const geoJson = {
          type: 'Feature',
          properties: {},
          geometry: { type: 'Polygon', coordinates: [coordPairs] },
        };

        console.log('agromonitoring-polygon: creating polygon', {
          plotId,
          plotName: plot.name,
          ringPoints: coordPairs.length,
          firstPoint: coordPairs[0],
        });

        const createResponse = await fetch(`${AGROMONITORING_API_URL}/polygons?appid=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: plot.name, geo_json: geoJson }),
        });

        if (!createResponse.ok) {
          const text = await createResponse.text();
          console.error('Agromonitoring API error:', createResponse.status, text);
          return jsonResponse({
            success: false,
            error: `Agromonitoring API error (${createResponse.status})`,
            details: text,
            geoJson,
          }, 502);
        }

        const agroPolygon = await createResponse.json();
        const coords = geoJson.geometry.coordinates[0];
        const centerLng = coords.reduce((s: number, c: number[]) => s + c[0], 0) / coords.length;
        const centerLat = coords.reduce((s: number, c: number[]) => s + c[1], 0) / coords.length;

        const { data: savedPolygon, error: saveError } = await supabase
          .from('agromonitoring_polygons')
          .insert({
            plot_id: plotId,
            polygon_id: agroPolygon.id,
            name: plot.name,
            geo_json: geoJson,
            area_hectares: agroPolygon.area || plot.area,
            center_lat: centerLat,
            center_lng: centerLng,
          })
          .select()
          .single();

        if (saveError) {
          return jsonResponse({ success: false, error: `DB insert failed: ${saveError.message}` }, 500);
        }

        return jsonResponse({ success: true, polygon: savedPolygon });
      }

      case 'list': {
        const listResponse = await fetch(`${AGROMONITORING_API_URL}/polygons?appid=${apiKey}`);
        if (!listResponse.ok) {
          const text = await listResponse.text();
          return jsonResponse({ success: false, error: `Agromonitoring list failed: ${text}` }, 502);
        }
        return jsonResponse({ success: true, polygons: await listResponse.json() });
      }

      case 'delete': {
        const polygonId = typeof polygonData.polygonId === 'string' ? polygonData.polygonId : '';
        if (!polygonId) return jsonResponse({ success: false, error: 'polygonId required for delete' }, 400);

        const deleteResponse = await fetch(
          `${AGROMONITORING_API_URL}/polygons/${encodeURIComponent(polygonId)}?appid=${apiKey}`,
          { method: 'DELETE' }
        );
        if (!deleteResponse.ok) {
          const text = await deleteResponse.text();
          return jsonResponse({ success: false, error: `Agromonitoring delete failed: ${text}` }, 502);
        }

        await supabase.from('agromonitoring_polygons').delete().eq('polygon_id', polygonId);
        return jsonResponse({ success: true, message: 'Polygon deleted' });
      }

      default:
        return jsonResponse({ success: false, error: `Unknown action: ${action}` }, 400);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Agromonitoring polygon error:', message);
    return jsonResponse({ success: false, error: message }, 500);
  }
});
