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

    const { data: isStaff } = await supabaseAdmin.rpc("is_staff_or_owner", { _user_id: caller.id });
    if (!isStaff) throw new Error("Unauthorized");

    const { student_id, email, password } = await req.json();
    if (!student_id || !email || !password) {
      throw new Error("student_id, email, and password are required");
    }

    const { data: student, error: studentErr } = await supabaseAdmin
      .from("students")
      .select("id, user_id, full_name, gym_id")
      .eq("id", student_id)
      .single();

    if (studentErr || !student) throw new Error("Student not found");
    if (student.user_id) throw new Error("Student already has portal access");

    // Try to create the user directly; handle duplicate email gracefully
    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createErr) {
      if (createErr.message?.includes("already been registered") || createErr.message?.includes("already exists")) {
        throw new Error("Este email ya está registrado en el sistema. Usá otro email o contactá al administrador.");
      }
      throw new Error(createErr.message);
    }

    await supabaseAdmin.from("user_roles").insert({
      user_id: newUser.user.id,
      role: "student",
      gym_id: student.gym_id,
    });

    await supabaseAdmin.from("students").update({ 
      user_id: newUser.user.id,
      must_change_password: true,
    }).eq("id", student_id);

    return new Response(
      JSON.stringify({ success: true, user_id: newUser.user.id, email }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
