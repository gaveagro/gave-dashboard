import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvestmentRequestData {
  user_name: string;
  user_email: string;
  user_phone?: string;
  species_name: string;
  plant_count: number;
  establishment_year: number;
  total_investment: number;
  weight_per_plant: number;
  price_per_kg: number;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
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
    const requestData: InvestmentRequestData = await req.json();

    console.log("Sending investment request notification:", requestData);

    // Send email to admin
    const emailResponse = await resend.emails.send({
      from: "GaveAgro <notificaciones@gaveagro.com>",
      to: ["hola@gaveagro.com"],
      subject: `Nueva Solicitud de Inversión - ${requestData.user_name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🌱 Nueva Solicitud de Inversión</h1>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
              Se ha recibido una nueva solicitud de inversión en la plataforma GaveAgro.
            </p>
            
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #1f2937; margin-top: 0; margin-bottom: 15px; font-size: 18px;">Datos del Inversionista</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #374151; width: 40%;">Nombre:</td>
                  <td style="padding: 8px 0; color: #1f2937;">${requestData.user_name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #374151;">Email:</td>
                  <td style="padding: 8px 0; color: #1f2937;">${requestData.user_email}</td>
                </tr>
                ${requestData.user_phone ? `
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #374151;">Teléfono:</td>
                  <td style="padding: 8px 0; color: #1f2937;">${requestData.user_phone}</td>
                </tr>
                ` : ''}
              </table>
            </div>
            
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e;">
              <h2 style="color: #1f2937; margin-top: 0; margin-bottom: 15px; font-size: 18px;">Detalles de la Inversión</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #374151; width: 40%;">Especie:</td>
                  <td style="padding: 8px 0; color: #1f2937;">${requestData.species_name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #374151;">Cantidad de plantas:</td>
                  <td style="padding: 8px 0; color: #1f2937;">${requestData.plant_count.toLocaleString()} plantas</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #374151;">Año de establecimiento:</td>
                  <td style="padding: 8px 0; color: #1f2937;">${requestData.establishment_year}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #374151;">Peso por planta:</td>
                  <td style="padding: 8px 0; color: #1f2937;">${requestData.weight_per_plant} kg</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #374151;">Precio por kg:</td>
                  <td style="padding: 8px 0; color: #1f2937;">$${requestData.price_per_kg.toLocaleString()} MXN</td>
                </tr>
                <tr style="border-top: 2px solid #22c55e;">
                  <td style="padding: 15px 0 8px 0; font-weight: bold; color: #16a34a; font-size: 16px;">Inversión Total:</td>
                  <td style="padding: 15px 0 8px 0; color: #16a34a; font-size: 18px; font-weight: bold;">$${requestData.total_investment.toLocaleString()} MXN</td>
                </tr>
              </table>
            </div>
            
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <p style="margin: 0; color: #92400e; font-weight: 500;">
                💡 <strong>Acción requerida:</strong> Revisa esta solicitud en el panel de administración y procede con la aprobación o rechazo correspondiente.
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="https://gaveagro.com/admin" 
                 style="background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Ver en Panel de Admin
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <div style="text-align: center; color: #6b7280; font-size: 14px;">
              <p style="margin: 5px 0;">🌱 GaveAgro - Inversión Forestal Sostenible</p>
              <p style="margin: 5px 0;">Este es un mensaje automático del sistema de notificaciones.</p>
            </div>
          </div>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: emailResponse.data?.id,
      message: "Notification sent successfully" 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-investment-request-notification function:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "Failed to send notification",
        details: error.toString()
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);