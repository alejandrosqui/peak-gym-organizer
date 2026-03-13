
-- Gym settings table for default payment link and future config
CREATE TABLE public.gym_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL DEFAULT '',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.gym_settings ENABLE ROW LEVEL SECURITY;

-- Only staff/owners can view settings
CREATE POLICY "Staff can view settings" ON public.gym_settings
  FOR SELECT TO authenticated
  USING (is_staff_or_owner(auth.uid()));

-- Only owners can manage settings
CREATE POLICY "Owners can manage settings" ON public.gym_settings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Insert default payment link setting
INSERT INTO public.gym_settings (key, value) VALUES ('payment_link', '');

-- Add payment reference and link fields to payments table
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS payment_reference text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_link text DEFAULT NULL;
