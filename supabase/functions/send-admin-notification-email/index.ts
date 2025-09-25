import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationEmailRequest {
  users: Array<{
    email: string;
    name: string;
  }>;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success';
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
    const { users, title, message, type }: NotificationEmailRequest = await req.json();

    console.log("Sending admin notification emails:", { userCount: users.length, title, type });

    const emailPromises = users.map(async (user) => {
      const typeEmoji = {
        info: "📢",
        warning: "⚠️", 
        success: "✅"
      }[type] || "📢";

      const typeColor = {
        info: "#3b82f6",
        warning: "#f59e0b",
        success: "#10b981"
      }[type] || "#3b82f6";

      const typeBgColor = {
        info: "#eff6ff",
        warning: "#fef3c7",
        success: "#ecfdf5"
      }[type] || "#eff6ff";

      const typeLabel = {
        info: "Información",
        warning: "Advertencia", 
        success: "Notificación"
      }[type] || "Notificación";

      return resend.emails.send({
        from: "GaveAgro <notificaciones@gaveagro.com>",
        to: [user.email],
        subject: `${typeEmoji} ${title} - GaveAgro`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">${typeEmoji} Nueva Notificación</h1>
            </div>
            
            <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
                Hola ${user.name}, tienes una nueva notificación en tu plataforma GaveAgro.
              </p>
              
              <div style="background: ${typeBgColor}; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${typeColor};">
                <div style="display: flex; align-items: center; margin-bottom: 10px;">
                  <span style="background: ${typeColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; margin-right: 10px;">
                    ${typeLabel}
                  </span>
                </div>
                <h2 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">${title}</h2>
                <p style="color: #374151; margin: 0; line-height: 1.6;">${message}</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://gaveagro.com/dashboard" 
                   style="background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Ver en mi Dashboard
                </a>
              </div>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              
              <div style="text-align: center; color: #6b7280; font-size: 14px;">
                <p style="margin: 5px 0;">🌱 GaveAgro - Inversión Forestal Sostenible</p>
                <p style="margin: 5px 0;">Este es un mensaje automático del sistema de notificaciones.</p>
                <p style="margin: 5px 0;">Si no deseas recibir estas notificaciones, puedes configurarlo en tu perfil.</p>
              </div>
            </div>
          </div>
        `,
      });
    });

    const results = await Promise.allSettled(emailPromises);
    
    const successCount = results.filter(result => result.status === 'fulfilled').length;
    const errorCount = results.filter(result => result.status === 'rejected').length;

    console.log(`Email notifications sent: ${successCount} successful, ${errorCount} failed`);

    return new Response(JSON.stringify({ 
      success: true,
      message: `Emails enviados: ${successCount} exitosos, ${errorCount} fallidos`,
      successCount,
      errorCount
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-admin-notification-email function:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "Failed to send notification emails",
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