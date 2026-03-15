import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const users = [
      { email: "admin@gmail.com", password: "admin123", role: "admin" },
      { email: "staff@gmail.com", password: "staff123", role: "staff" },
    ];

    const results = [];

    for (const u of users) {
      // Check if user exists
      const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
      const found = existing?.users?.find((x: any) => x.email === u.email);
      
      if (found) {
        // Ensure role exists
        await supabaseAdmin.from("user_roles").upsert(
          { user_id: found.id, role: u.role },
          { onConflict: "user_id" }
        );
        results.push({ email: u.email, status: "already exists, role ensured" });
        continue;
      }

      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
      });

      if (error) {
        results.push({ email: u.email, error: error.message });
        continue;
      }

      await supabaseAdmin.from("user_roles").insert({
        user_id: data.user.id,
        role: u.role,
      });

      results.push({ email: u.email, status: "created" });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
