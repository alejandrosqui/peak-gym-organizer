import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: caller } } = await supabaseUser.auth.getUser();
    if (!caller) throw new Error("Not authenticated");

    const { data: callerIsStaff } = await supabaseAdmin.rpc("is_staff_or_owner", { _user_id: caller.id });
    if (!callerIsStaff) throw new Error("Unauthorized");

    const { email, password, role, gym_id } = await req.json();
    if (!email || !password || !gym_id) {
      throw new Error("email, password, and gym_id are required");
    }

    const validRoles = ['manager', 'staff'];
    const userRole = validRoles.includes(role) ? role : 'manager';

    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = existingUsers?.users?.find((u: any) => u.email === email);
    if (emailExists) throw new Error("El email ya está registrado");

    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createErr) throw new Error(createErr.message);

    await supabaseAdmin.from("user_roles").insert({
      user_id: newUser.user.id,
      role: userRole,
      gym_id,
    });

    return new Response(
      JSON.stringify({ success: true, user_id: newUser.user.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
