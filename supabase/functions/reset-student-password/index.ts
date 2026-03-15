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

    const { student_id, new_password } = await req.json();
    if (!student_id || !new_password) {
      throw new Error("student_id and new_password are required");
    }

    const { data: student, error: studentErr } = await supabaseAdmin
      .from("students")
      .select("id, user_id, full_name")
      .eq("id", student_id)
      .single();

    if (studentErr || !student) throw new Error("Student not found");
    if (!student.user_id) throw new Error("Student has no portal access");

    // Reset password
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
      student.user_id,
      { password: new_password }
    );
    if (updateErr) throw new Error(updateErr.message);

    // Set must_change_password flag
    await supabaseAdmin.from("students").update({ must_change_password: true }).eq("id", student_id);

    return new Response(
      JSON.stringify({ success: true }),
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
