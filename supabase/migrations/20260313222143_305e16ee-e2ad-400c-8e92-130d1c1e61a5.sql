
-- Add unique constraint on gym_settings(key, gym_id) for upsert to work
CREATE UNIQUE INDEX IF NOT EXISTS gym_settings_key_gym_id_unique ON public.gym_settings (key, gym_id);
