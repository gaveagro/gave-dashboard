import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
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
        status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const body = await req.json();

    // Validate inputs
    const user_name = typeof body.user_name === 'string' ? body.user_name.trim().slice(0, 200) : '';
    const user_email = typeof body.user_email === 'string' ? body.user_email.trim().slice(0, 255) : '';
    const user_phone = typeof body.user_phone === 'string' ? body.user_phone.trim().slice(0, 20) : undefined;
    const species_name = typeof body.species_name === 'string' ? body.species_name.trim().slice(0, 100) : '';
    const plant_count = typeof body.plant_count === 'number' && body.plant_count > 0 && body.plant_count <= 1000000 ? body.plant_count : null;
    const establishment_year = typeof body.establishment_year === 'number' && body.establishment_year >= 2000 && body.establishment_year <= 2100 ? body.establishment_year : null;
    const total_investment = typeof body.total_investment === 'number' && body.total_investment > 0 ? body.total_investment : null;
    const weight_per_plant = typeof body.weight_per_plant === 'number' && body.weight_per_plant > 0 ? body.weight_per_plant : null;
    const price_per_kg = typeof body.price_per_kg === 'number' && body.price_per_kg > 0 ? body.price_per_kg : null;

    if (!user_name || !user_email || !species_name || !plant_count || !establishment_year || !total_investment || !weight_per_plant || !price_per_kg) {
      return new Response(JSON.stringify({ error: 'Invalid input data' }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const emailResponse = await resend.emails.send({
      from: "dashboard@send.gaveagro.com",
      to: ["hola@gaveagro.com"],
      subject: "Nueva Solicitud de Inversión - Dashboard",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🌱 Nueva Solicitud de Inversión</h1>
          </div>
          <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #1f2937; margin-top: 0;">Datos del Inversionista</h2>
              <p><strong>Nombre:</strong> ${escapeHtml(user_name)}</p>
              <p><strong>Email:</strong> ${escapeHtml(user_email)}</p>
              ${user_phone ? `<p><strong>Teléfono:</strong> ${escapeHtml(user_phone)}</p>` : ''}
            </div>
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e;">
              <h2 style="color: #1f2937; margin-top: 0;">Detalles de la Inversión</h2>
              <p><strong>Especie:</strong> ${escapeHtml(species_name)}</p>
              <p><strong>Cantidad de plantas:</strong> ${plant_count.toLocaleString()}</p>
              <p><strong>Año:</strong> ${establishment_year}</p>
              <p><strong>Peso por planta:</strong> ${weight_per_plant} kg</p>
              <p><strong>Precio por kg:</strong> $${price_per_kg.toLocaleString()} MXN</p>
              <p style="font-size: 18px; font-weight: bold; color: #16a34a;">Inversión Total: $${total_investment.toLocaleString()} MXN</p>
            </div>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <div style="text-align: center; color: #6b7280; font-size: 14px;">
              <p>🌱 GaveAgro - Inversión Forestal Sostenible</p>
            </div>
          </div>
        </div>
      `,
    });

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Notification sent successfully" 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in send-investment-request-notification:", error);
    return new Response(
      JSON.stringify({ error: 'Failed to send notification' }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
