-- Audit table for MercadoPago payment events
CREATE TABLE IF NOT EXISTS payment_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id      uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  mp_payment_id text NOT NULL,
  mp_status   text NOT NULL,
  amount      numeric,
  currency    text DEFAULT 'ARS',
  created_at  timestamptz DEFAULT now()
);

-- Only the service role (webhook) can insert; gym owners can read their own
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gym owner can view payment events"
  ON payment_events FOR SELECT
  USING (
    gym_id IN (
      SELECT gym_id FROM user_roles WHERE user_id = auth.uid()
    )
  );
