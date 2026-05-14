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
    if (!authHeader) {
      return json({ success: false, error: "Missing Authorization header" }, 401);
    }

    // Verify caller is admin
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return json({ success: false, error: "Invalid session" }, 401);
    }
    const callerId = userData.user.id;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: isAdmin, error: roleErr } = await admin.rpc("has_role", {
      _user_id: callerId,
      _role: "admin",
    });
    if (roleErr || !isAdmin) {
      return json({ success: false, error: "Unauthorized: admin only" }, 403);
    }

    const body = await req.json();
    const {
      email,
      password,
      name,
      phone,
      role = "investor",
      account_balance = 0,
    } = body ?? {};

    if (!email || !password || !name) {
      return json(
        { success: false, error: "email, password and name are required" },
        400,
      );
    }
    if (typeof password !== "string" || password.length < 6) {
      return json(
        { success: false, error: "Password must be at least 6 characters" },
        400,
      );
    }

    // Create user with confirmed email
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, admin_created: true },
    });

    if (createErr || !created.user) {
      return json(
        { success: false, error: createErr?.message ?? "Could not create user" },
        400,
      );
    }

    const newUserId = created.user.id;

    // Upsert profile (trigger may have created a base row)
    const { error: profileErr } = await admin
      .from("profiles")
      .upsert(
        {
          user_id: newUserId,
          email,
          name,
          phone: phone ?? null,
          role,
          account_balance,
        },
        { onConflict: "user_id" },
      );

    if (profileErr) {
      // Rollback auth user to avoid orphans
      await admin.auth.admin.deleteUser(newUserId);
      return json({ success: false, error: profileErr.message }, 400);
    }

    return json({ success: true, user_id: newUserId });
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
