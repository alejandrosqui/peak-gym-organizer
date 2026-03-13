
-- 1. Create gyms table
CREATE TABLE public.gyms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_user_id uuid NOT NULL,
  plan text NOT NULL DEFAULT 'free',
  max_students integer NOT NULL DEFAULT 25,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;

-- 2. Add gym_id to existing tables
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS gym_id uuid REFERENCES public.gyms(id);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS gym_id uuid REFERENCES public.gyms(id);
ALTER TABLE public.routines ADD COLUMN IF NOT EXISTS gym_id uuid REFERENCES public.gyms(id);
ALTER TABLE public.nutrition_plans ADD COLUMN IF NOT EXISTS gym_id uuid REFERENCES public.gyms(id);
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS gym_id uuid REFERENCES public.gyms(id);
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS gym_id uuid REFERENCES public.gyms(id);

-- 3. Create default gym and migrate existing data
DO $$
DECLARE
  _owner_id uuid;
  _gym_id uuid;
BEGIN
  SELECT user_id INTO _owner_id FROM public.user_roles WHERE role IN ('owner', 'admin') LIMIT 1;
  IF _owner_id IS NOT NULL THEN
    INSERT INTO public.gyms (name, owner_user_id) VALUES ('Mi Gimnasio', _owner_id) RETURNING id INTO _gym_id;
    UPDATE public.students SET gym_id = _gym_id WHERE gym_id IS NULL;
    UPDATE public.payments SET gym_id = _gym_id WHERE gym_id IS NULL;
    UPDATE public.routines SET gym_id = _gym_id WHERE gym_id IS NULL;
    UPDATE public.nutrition_plans SET gym_id = _gym_id WHERE gym_id IS NULL;
    UPDATE public.user_roles SET gym_id = _gym_id WHERE gym_id IS NULL;
    UPDATE public.gym_settings SET gym_id = _gym_id WHERE gym_id IS NULL;
  END IF;
END $$;

-- 4. Helper function to get gym_id for a user
CREATE OR REPLACE FUNCTION public.get_gym_id_for_user(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT gym_id FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- 5. Gyms RLS
CREATE POLICY "Users can view own gym" ON public.gyms FOR SELECT TO authenticated
  USING (id = get_gym_id_for_user(auth.uid()));

CREATE POLICY "Owners can update own gym" ON public.gyms FOR UPDATE TO authenticated
  USING (id = get_gym_id_for_user(auth.uid()) AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'admin')));

-- 6. Replace students RLS
DROP POLICY IF EXISTS "Staff and owners can view all students" ON public.students;
DROP POLICY IF EXISTS "Staff and owners can insert students" ON public.students;
DROP POLICY IF EXISTS "Staff and owners can update students" ON public.students;
DROP POLICY IF EXISTS "Owners can delete students" ON public.students;

CREATE POLICY "View students own gym" ON public.students FOR SELECT TO authenticated
  USING (gym_id = get_gym_id_for_user(auth.uid()) AND (is_staff_or_owner(auth.uid()) OR user_id = auth.uid()));
CREATE POLICY "Insert students own gym" ON public.students FOR INSERT TO authenticated
  WITH CHECK (gym_id = get_gym_id_for_user(auth.uid()) AND is_staff_or_owner(auth.uid()));
CREATE POLICY "Update students own gym" ON public.students FOR UPDATE TO authenticated
  USING (gym_id = get_gym_id_for_user(auth.uid()) AND (is_staff_or_owner(auth.uid()) OR user_id = auth.uid()));
CREATE POLICY "Delete students own gym" ON public.students FOR DELETE TO authenticated
  USING (gym_id = get_gym_id_for_user(auth.uid()) AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'admin')));

-- 7. Replace payments RLS
DROP POLICY IF EXISTS "View payments" ON public.payments;
DROP POLICY IF EXISTS "Staff and owners can insert payments" ON public.payments;
DROP POLICY IF EXISTS "Staff and owners can update payments" ON public.payments;
DROP POLICY IF EXISTS "Owners can delete payments" ON public.payments;

CREATE POLICY "View payments own gym" ON public.payments FOR SELECT TO authenticated
  USING (gym_id = get_gym_id_for_user(auth.uid()) AND (is_staff_or_owner(auth.uid()) OR student_id = get_student_id_for_user(auth.uid())));
CREATE POLICY "Insert payments own gym" ON public.payments FOR INSERT TO authenticated
  WITH CHECK (gym_id = get_gym_id_for_user(auth.uid()) AND is_staff_or_owner(auth.uid()));
CREATE POLICY "Update payments own gym" ON public.payments FOR UPDATE TO authenticated
  USING (gym_id = get_gym_id_for_user(auth.uid()) AND is_staff_or_owner(auth.uid()));
CREATE POLICY "Delete payments own gym" ON public.payments FOR DELETE TO authenticated
  USING (gym_id = get_gym_id_for_user(auth.uid()) AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'admin')));

-- 8. Replace routines RLS
DROP POLICY IF EXISTS "View routines" ON public.routines;
DROP POLICY IF EXISTS "Staff and owners can insert routines" ON public.routines;
DROP POLICY IF EXISTS "Staff and owners can update routines" ON public.routines;
DROP POLICY IF EXISTS "Owners can delete routines" ON public.routines;

CREATE POLICY "View routines own gym" ON public.routines FOR SELECT TO authenticated
  USING (gym_id = get_gym_id_for_user(auth.uid()));
CREATE POLICY "Insert routines own gym" ON public.routines FOR INSERT TO authenticated
  WITH CHECK (gym_id = get_gym_id_for_user(auth.uid()) AND is_staff_or_owner(auth.uid()));
CREATE POLICY "Update routines own gym" ON public.routines FOR UPDATE TO authenticated
  USING (gym_id = get_gym_id_for_user(auth.uid()) AND is_staff_or_owner(auth.uid()));
CREATE POLICY "Delete routines own gym" ON public.routines FOR DELETE TO authenticated
  USING (gym_id = get_gym_id_for_user(auth.uid()) AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'admin')));

-- 9. Replace nutrition_plans RLS
DROP POLICY IF EXISTS "View nutrition plans" ON public.nutrition_plans;
DROP POLICY IF EXISTS "Staff and owners can insert plans" ON public.nutrition_plans;
DROP POLICY IF EXISTS "Staff and owners can update plans" ON public.nutrition_plans;
DROP POLICY IF EXISTS "Owners can delete plans" ON public.nutrition_plans;

CREATE POLICY "View plans own gym" ON public.nutrition_plans FOR SELECT TO authenticated
  USING (gym_id = get_gym_id_for_user(auth.uid()));
CREATE POLICY "Insert plans own gym" ON public.nutrition_plans FOR INSERT TO authenticated
  WITH CHECK (gym_id = get_gym_id_for_user(auth.uid()) AND is_staff_or_owner(auth.uid()));
CREATE POLICY "Update plans own gym" ON public.nutrition_plans FOR UPDATE TO authenticated
  USING (gym_id = get_gym_id_for_user(auth.uid()) AND is_staff_or_owner(auth.uid()));
CREATE POLICY "Delete plans own gym" ON public.nutrition_plans FOR DELETE TO authenticated
  USING (gym_id = get_gym_id_for_user(auth.uid()) AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'admin')));

-- 10. Replace gym_settings RLS
DROP POLICY IF EXISTS "Staff can view settings" ON public.gym_settings;
DROP POLICY IF EXISTS "Owners can manage settings" ON public.gym_settings;

CREATE POLICY "View settings own gym" ON public.gym_settings FOR SELECT TO authenticated
  USING (gym_id = get_gym_id_for_user(auth.uid()) AND is_staff_or_owner(auth.uid()));
CREATE POLICY "Manage settings own gym" ON public.gym_settings FOR ALL TO authenticated
  USING (gym_id = get_gym_id_for_user(auth.uid()) AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'admin')))
  WITH CHECK (gym_id = get_gym_id_for_user(auth.uid()) AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'admin')));

-- 11. Replace user_roles owner management policy
DROP POLICY IF EXISTS "Owners can manage roles" ON public.user_roles;

CREATE POLICY "Owners manage roles own gym" ON public.user_roles FOR ALL TO authenticated
  USING (gym_id = get_gym_id_for_user(auth.uid()) AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'admin')))
  WITH CHECK (gym_id = get_gym_id_for_user(auth.uid()) AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'admin')));
