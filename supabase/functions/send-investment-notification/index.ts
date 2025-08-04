
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvestmentNotificationRequest {
  userEmail: string;
  userName: string;
  userPhone?: string;
  plantCount: number;
  speciesName: string;
  establishmentYear: number;
  totalInvestment: number;
  weightPerPlant: number;
  pricePerKg: number;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      userEmail, 
      userName, 
      userPhone, 
      plantCount, 
      speciesName, 
      establishmentYear, 
      totalInvestment,
      weightPerPlant,
      pricePerKg
    }: InvestmentNotificationRequest = await req.json();

    const emailResponse = await resend.emails.send({
      from: "dashboard@send.gaveagro.com",
      to: ["hola@gaveagro.com"],
      subject: "Nueva Solicitud de Inversión - Dashboard",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #059669; text-align: center;">Nueva Solicitud de Inversión</h1>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #333; margin-top: 0;">Información del Inversionista</h2>
            <p><strong>Nombre:</strong> ${userName}</p>
            <p><strong>Email:</strong> ${userEmail}</p>
            ${userPhone ? `<p><strong>Teléfono:</strong> ${userPhone}</p>` : ''}
          </div>

          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #333; margin-top: 0;">Detalles de la Inversión</h2>
            <p><strong>Especie:</strong> ${speciesName}</p>
            <p><strong>Cantidad de plantas:</strong> ${plantCount.toLocaleString()}</p>
            <p><strong>Año de establecimiento:</strong> ${establishmentYear}</p>
            <p><strong>Inversión total:</strong> $${totalInvestment.toLocaleString()} MXN</p>
            <p><strong>Peso esperado por planta:</strong> ${weightPerPlant} kg</p>
            <p><strong>Precio esperado por kg:</strong> $${pricePerKg} MXN</p>
          </div>

          <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #333; margin-top: 0;">Próximos Pasos</h2>
            <p>El usuario ha manifestado interés en proceder con esta inversión utilizando el simulador.</p>
            <p>Por favor, contacta al inversionista para continuar con el proceso.</p>
          </div>

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">
              Gavé Agrotecnología - Agricultura Regenerativa
            </p>
          </div>
        </div>
      `,
    });

    console.log("Investment notification sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending investment notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
