import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRO_PRICE_ARS = 21000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify Supabase JWT
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.slice(7);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get gym_id from user role
    const { data: roleData, error: roleErr } = await supabase
      .from("user_roles")
      .select("gym_id")
      .eq("user_id", user.id)
      .single();

    if (roleErr || !roleData?.gym_id) {
      return new Response(JSON.stringify({ error: "Gym not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const gymId = roleData.gym_id;

    // Check current plan
    const { data: gymData } = await supabase
      .from("gyms")
      .select("plan, name")
      .eq("id", gymId)
      .single();

    if (gymData?.plan === "pro") {
      return new Response(JSON.stringify({ error: "Ya tenés el plan Pro" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mpAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!mpAccessToken) {
      throw new Error("MERCADOPAGO_ACCESS_TOKEN not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const notificationUrl = `${supabaseUrl}/functions/v1/mercadopago-webhook`;

    // Create Checkout Pro preference
    const preference = {
      items: [
        {
          id: "peak-gym-pro",
          title: `Peak Gym Pro - ${gymData?.name || "Gimnasio"}`,
          description: "Plan Pro: alumnos ilimitados, todas las funciones",
          quantity: 1,
          unit_price: PRO_PRICE_ARS,
          currency_id: "ARS",
        },
      ],
      external_reference: gymId,
      notification_url: notificationUrl,
      back_urls: {
        success: `${req.headers.get("origin") || "https://peakgym.app"}/upgrade?status=success`,
        failure: `${req.headers.get("origin") || "https://peakgym.app"}/upgrade?status=failure`,
        pending: `${req.headers.get("origin") || "https://peakgym.app"}/upgrade?status=pending`,
      },
      auto_return: "approved",
      statement_descriptor: "PEAK GYM PRO",
      expires: false,
    };

    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mpAccessToken}`,
      },
      body: JSON.stringify(preference),
    });

    if (!mpRes.ok) {
      const mpError = await mpRes.text();
      throw new Error(`MercadoPago error: ${mpError}`);
    }

    const mpData = await mpRes.json();

    return new Response(
      JSON.stringify({
        init_point: mpData.init_point,
        preference_id: mpData.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
