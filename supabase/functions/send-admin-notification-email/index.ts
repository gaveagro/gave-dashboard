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

    const userId = claimsData.claims.sub;

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        status: 403, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const body = await req.json();

    // Validate inputs
    if (!Array.isArray(body.users) || body.users.length === 0 || body.users.length > 100) {
      return new Response(JSON.stringify({ error: 'Invalid users list' }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const title = typeof body.title === 'string' ? body.title.trim().slice(0, 200) : '';
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 2000) : '';
    const type = ['info', 'warning', 'success'].includes(body.type) ? body.type : 'info';

    if (!title || !message) {
      return new Response(JSON.stringify({ error: 'Title and message are required' }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const validUsers = body.users
      .filter((u: any) => typeof u.email === 'string' && u.email.includes('@') && typeof u.name === 'string')
      .slice(0, 100)
      .map((u: any) => ({ email: u.email.trim().slice(0, 255), name: u.name.trim().slice(0, 200) }));

    if (validUsers.length === 0) {
      return new Response(JSON.stringify({ error: 'No valid users provided' }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const emailPromises = validUsers.map(async (user: { email: string; name: string }) => {
      const typeEmoji = { info: "📢", warning: "⚠️", success: "✅" }[type] || "📢";
      const typeColor = { info: "#3b82f6", warning: "#f59e0b", success: "#10b981" }[type] || "#3b82f6";
      const typeBgColor = { info: "#eff6ff", warning: "#fef3c7", success: "#ecfdf5" }[type] || "#eff6ff";
      const typeLabel = { info: "Información", warning: "Advertencia", success: "Notificación" }[type] || "Notificación";

      return resend.emails.send({
        from: "GaveAgro <notificaciones@gaveagro.com>",
        to: [user.email],
        subject: `${typeEmoji} ${escapeHtml(title)} - GaveAgro`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">${typeEmoji} Nueva Notificación</h1>
            </div>
            <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
                Hola ${escapeHtml(user.name)}, tienes una nueva notificación en tu plataforma GaveAgro.
              </p>
              <div style="background: ${typeBgColor}; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${typeColor};">
                <div style="display: flex; align-items: center; margin-bottom: 10px;">
                  <span style="background: ${typeColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; margin-right: 10px;">
                    ${typeLabel}
                  </span>
                </div>
                <h2 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">${escapeHtml(title)}</h2>
                <p style="color: #374151; margin: 0; line-height: 1.6;">${escapeHtml(message)}</p>
              </div>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              <div style="text-align: center; color: #6b7280; font-size: 14px;">
                <p style="margin: 5px 0;">🌱 GaveAgro - Inversión Forestal Sostenible</p>
              </div>
            </div>
          </div>
        `,
      });
    });

    const results = await Promise.allSettled(emailPromises);
    const successCount = results.filter(result => result.status === 'fulfilled').length;
    const errorCount = results.filter(result => result.status === 'rejected').length;

    return new Response(JSON.stringify({ 
      success: true,
      message: `Emails enviados: ${successCount} exitosos, ${errorCount} fallidos`,
      successCount,
      errorCount
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in send-admin-notification-email function:", error);
    return new Response(
      JSON.stringify({ error: 'Failed to send notification emails' }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
