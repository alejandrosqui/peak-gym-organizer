import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Public endpoint — no CORS needed (called server-to-server by MercadoPago)

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const mpAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!mpAccessToken) {
      return new Response("Misconfigured", { status: 500 });
    }

    // MercadoPago sends JSON body with type and data.id
    const body = await req.json();
    const { type, data } = body;

    // Only process payment notifications
    if (type !== "payment" || !data?.id) {
      return new Response("OK", { status: 200 });
    }

    const paymentId = data.id;

    // Verify payment via MercadoPago API (never trust the webhook body alone)
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${mpAccessToken}` },
    });

    if (!mpRes.ok) {
      console.error(`Failed to fetch payment ${paymentId}: ${mpRes.status}`);
      return new Response("Error fetching payment", { status: 500 });
    }

    const payment = await mpRes.json();

    // Only activate if payment is approved
    if (payment.status !== "approved") {
      console.log(`Payment ${paymentId} status: ${payment.status} — skipping`);
      return new Response("OK", { status: 200 });
    }

    const gymId = payment.external_reference;
    if (!gymId) {
      console.error(`Payment ${paymentId} has no external_reference`);
      return new Response("Missing external_reference", { status: 400 });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Upgrade gym to Pro
    const { error: updateErr } = await supabaseAdmin
      .from("gyms")
      .update({ plan: "pro", max_students: -1 })
      .eq("id", gymId);

    if (updateErr) {
      console.error(`Failed to upgrade gym ${gymId}: ${updateErr.message}`);
      return new Response("DB update failed", { status: 500 });
    }

    // Log the payment for audit trail
    await supabaseAdmin.from("payment_events").insert({
      gym_id: gymId,
      mp_payment_id: String(paymentId),
      mp_status: payment.status,
      amount: payment.transaction_amount,
      currency: payment.currency_id,
    }).maybeSingle();
    // Note: if payment_events table doesn't exist yet, the insert fails silently

    console.log(`Gym ${gymId} upgraded to Pro via payment ${paymentId}`);

    return new Response("OK", { status: 200 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Webhook error:", msg);
    return new Response("Internal error", { status: 500 });
  }
});
