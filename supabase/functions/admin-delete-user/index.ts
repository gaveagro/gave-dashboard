import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ success: false, error: "Missing Authorization" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ success: false, error: "Invalid session" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: isAdmin, error: roleErr } = await admin.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (roleErr || !isAdmin) return json({ success: false, error: "Unauthorized: admin only" }, 403);

    const { user_id } = await req.json();
    if (!user_id) return json({ success: false, error: "user_id is required" }, 400);
    if (user_id === userData.user.id) {
      return json({ success: false, error: "No puedes eliminar tu propio usuario" }, 400);
    }

    // Delete profile first (RLS bypassed via service role)
    const { error: profileErr } = await admin
      .from("profiles")
      .delete()
      .eq("user_id", user_id);
    if (profileErr) return json({ success: false, error: profileErr.message }, 400);

    const { error: authErr } = await admin.auth.admin.deleteUser(user_id);
    if (authErr) return json({ success: false, error: authErr.message }, 400);

    return json({ success: true });
  } catch (e) {
    return json({ success: false, error: (e as Error).message }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
