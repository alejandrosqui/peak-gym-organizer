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
    const { gym_name, email, password } = await req.json();
    if (!gym_name || !email || !password) {
      throw new Error("gym_name, email, and password are required");
    }

    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if email already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = existingUsers?.users?.find((u: any) => u.email === email);
    if (emailExists) throw new Error("El email ya está registrado");

    // Create auth user
    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createErr) throw new Error(createErr.message);

    // Create gym
    const { data: gym, error: gymErr } = await supabaseAdmin
      .from("gyms")
      .insert({ name: gym_name, owner_user_id: newUser.user.id })
      .select()
      .single();
    if (gymErr) throw new Error(gymErr.message);

    // Assign owner role with gym_id
    await supabaseAdmin.from("user_roles").insert({
      user_id: newUser.user.id,
      role: "owner",
      gym_id: gym.id,
    });

    // Create default gym_settings
    await supabaseAdmin.from("gym_settings").insert({
      key: "payment_link",
      value: "",
      gym_id: gym.id,
    });

    return new Response(
      JSON.stringify({ success: true, gym_id: gym.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
