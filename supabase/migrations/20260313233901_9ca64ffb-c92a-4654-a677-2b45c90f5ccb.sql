
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_reminder_type text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reminder_count integer NOT NULL DEFAULT 0;
