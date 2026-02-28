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
    const userEmail = typeof body.userEmail === 'string' ? body.userEmail.trim().slice(0, 255) : '';
    const userName = typeof body.userName === 'string' ? body.userName.trim().slice(0, 200) : '';
    const userPhone = typeof body.userPhone === 'string' ? body.userPhone.trim().slice(0, 20) : undefined;
    const plantCount = typeof body.plantCount === 'number' && Number.isInteger(body.plantCount) && body.plantCount > 0 && body.plantCount <= 1000000 ? body.plantCount : null;
    const speciesName = typeof body.speciesName === 'string' ? body.speciesName.trim().slice(0, 100) : '';
    const establishmentYear = typeof body.establishmentYear === 'number' && body.establishmentYear >= 2000 && body.establishmentYear <= 2100 ? body.establishmentYear : null;
    const totalInvestment = typeof body.totalInvestment === 'number' && body.totalInvestment > 0 && body.totalInvestment <= 999999999 ? body.totalInvestment : null;
    const weightPerPlant = typeof body.weightPerPlant === 'number' && body.weightPerPlant > 0 && body.weightPerPlant <= 1000 ? body.weightPerPlant : null;
    const pricePerKg = typeof body.pricePerKg === 'number' && body.pricePerKg > 0 && body.pricePerKg <= 100000 ? body.pricePerKg : null;

    if (!userEmail || !userName || !plantCount || !speciesName || !establishmentYear || !totalInvestment || !weightPerPlant || !pricePerKg) {
      return new Response(JSON.stringify({ error: 'Invalid input data' }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const emailResponse = await resend.emails.send({
      from: "dashboard@send.gaveagro.com",
      to: ["hola@gaveagro.com"],
      subject: "Nueva Solicitud de Inversión - Dashboard",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #059669; text-align: center;">Nueva Solicitud de Inversión</h1>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #333; margin-top: 0;">Información del Inversionista</h2>
            <p><strong>Nombre:</strong> ${escapeHtml(userName)}</p>
            <p><strong>Email:</strong> ${escapeHtml(userEmail)}</p>
            ${userPhone ? `<p><strong>Teléfono:</strong> ${escapeHtml(userPhone)}</p>` : ''}
          </div>
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #333; margin-top: 0;">Detalles de la Inversión</h2>
            <p><strong>Especie:</strong> ${escapeHtml(speciesName)}</p>
            <p><strong>Cantidad de plantas:</strong> ${plantCount.toLocaleString()}</p>
            <p><strong>Año de establecimiento:</strong> ${establishmentYear}</p>
            <p><strong>Inversión total:</strong> $${totalInvestment.toLocaleString()} MXN</p>
            <p><strong>Peso esperado por planta:</strong> ${weightPerPlant} kg</p>
            <p><strong>Precio esperado por kg:</strong> $${pricePerKg} MXN</p>
          </div>
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">Gavé Agrotecnología - Agricultura Regenerativa</p>
          </div>
        </div>
      `,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending investment notification:", error);
    return new Response(
      JSON.stringify({ error: 'Failed to send notification' }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
