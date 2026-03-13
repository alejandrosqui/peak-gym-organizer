
-- Add user_id column to students for linking student accounts
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS students_user_id_unique ON public.students(user_id) WHERE user_id IS NOT NULL;

-- Update get_user_role function to handle new roles
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Helper: check if user is owner or manager (staff-level access)
CREATE OR REPLACE FUNCTION public.is_staff_or_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role IN ('owner', 'manager', 'admin', 'staff')
  )
$$;

-- Helper: get linked student_id for a user
CREATE OR REPLACE FUNCTION public.get_student_id_for_user(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id FROM public.students WHERE user_id = _user_id LIMIT 1
$$;

-- Update students RLS: students can see their own record
DROP POLICY IF EXISTS "Authenticated users can view students" ON public.students;
CREATE POLICY "Staff and owners can view all students" ON public.students
  FOR SELECT TO authenticated
  USING (public.is_staff_or_owner(auth.uid()) OR user_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can insert students" ON public.students;
CREATE POLICY "Staff and owners can insert students" ON public.students
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_or_owner(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can update students" ON public.students;
CREATE POLICY "Staff and owners can update students" ON public.students
  FOR UPDATE TO authenticated
  USING (public.is_staff_or_owner(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete students" ON public.students;
CREATE POLICY "Owners can delete students" ON public.students
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin'));

-- Update payments RLS: students can see their own payments
DROP POLICY IF EXISTS "Authenticated users can view payments" ON public.payments;
CREATE POLICY "View payments" ON public.payments
  FOR SELECT TO authenticated
  USING (
    public.is_staff_or_owner(auth.uid()) 
    OR student_id = public.get_student_id_for_user(auth.uid())
  );

DROP POLICY IF EXISTS "Authenticated users can insert payments" ON public.payments;
CREATE POLICY "Staff and owners can insert payments" ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_or_owner(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can update payments" ON public.payments;
CREATE POLICY "Staff and owners can update payments" ON public.payments
  FOR UPDATE TO authenticated
  USING (public.is_staff_or_owner(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete payments" ON public.payments;
CREATE POLICY "Owners can delete payments" ON public.payments
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin'));

-- Update routines RLS: students can view routines assigned to them
DROP POLICY IF EXISTS "Authenticated users can view routines" ON public.routines;
CREATE POLICY "View routines" ON public.routines
  FOR SELECT TO authenticated
  USING (
    public.is_staff_or_owner(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.student_routines sr 
      WHERE sr.routine_id = id AND sr.student_id = public.get_student_id_for_user(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Authenticated users can insert routines" ON public.routines;
CREATE POLICY "Staff and owners can insert routines" ON public.routines
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_or_owner(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can update routines" ON public.routines;
CREATE POLICY "Staff and owners can update routines" ON public.routines
  FOR UPDATE TO authenticated
  USING (public.is_staff_or_owner(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete routines" ON public.routines;
CREATE POLICY "Owners can delete routines" ON public.routines
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin'));

-- Update nutrition_plans RLS
DROP POLICY IF EXISTS "Authenticated users can view plans" ON public.nutrition_plans;
CREATE POLICY "View nutrition plans" ON public.nutrition_plans
  FOR SELECT TO authenticated
  USING (
    public.is_staff_or_owner(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.student_nutrition_plans snp 
      WHERE snp.nutrition_plan_id = id AND snp.student_id = public.get_student_id_for_user(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Authenticated users can insert plans" ON public.nutrition_plans;
CREATE POLICY "Staff and owners can insert plans" ON public.nutrition_plans
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_or_owner(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can update plans" ON public.nutrition_plans;
CREATE POLICY "Staff and owners can update plans" ON public.nutrition_plans
  FOR UPDATE TO authenticated
  USING (public.is_staff_or_owner(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete plans" ON public.nutrition_plans;
CREATE POLICY "Owners can delete plans" ON public.nutrition_plans
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin'));

-- Update student_routines RLS
DROP POLICY IF EXISTS "Authenticated users can manage student routines" ON public.student_routines;
CREATE POLICY "View student routines" ON public.student_routines
  FOR SELECT TO authenticated
  USING (public.is_staff_or_owner(auth.uid()) OR student_id = public.get_student_id_for_user(auth.uid()));
CREATE POLICY "Staff manage student routines" ON public.student_routines
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_or_owner(auth.uid()));
CREATE POLICY "Staff update student routines" ON public.student_routines
  FOR UPDATE TO authenticated
  USING (public.is_staff_or_owner(auth.uid()));
CREATE POLICY "Staff delete student routines" ON public.student_routines
  FOR DELETE TO authenticated
  USING (public.is_staff_or_owner(auth.uid()));

-- Update student_nutrition_plans RLS
DROP POLICY IF EXISTS "Authenticated users can manage student plans" ON public.student_nutrition_plans;
CREATE POLICY "View student nutrition plans" ON public.student_nutrition_plans
  FOR SELECT TO authenticated
  USING (public.is_staff_or_owner(auth.uid()) OR student_id = public.get_student_id_for_user(auth.uid()));
CREATE POLICY "Staff manage student nutrition plans" ON public.student_nutrition_plans
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_or_owner(auth.uid()));
CREATE POLICY "Staff update student nutrition plans" ON public.student_nutrition_plans
  FOR UPDATE TO authenticated
  USING (public.is_staff_or_owner(auth.uid()));
CREATE POLICY "Staff delete student nutrition plans" ON public.student_nutrition_plans
  FOR DELETE TO authenticated
  USING (public.is_staff_or_owner(auth.uid()));

-- Update routine_exercises RLS
DROP POLICY IF EXISTS "Authenticated users can view exercises" ON public.routine_exercises;
CREATE POLICY "View routine exercises" ON public.routine_exercises
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert exercises" ON public.routine_exercises;
CREATE POLICY "Staff can insert exercises" ON public.routine_exercises
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_or_owner(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can update exercises" ON public.routine_exercises;
CREATE POLICY "Staff can update exercises" ON public.routine_exercises
  FOR UPDATE TO authenticated
  USING (public.is_staff_or_owner(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can delete exercises" ON public.routine_exercises;
CREATE POLICY "Staff can delete exercises" ON public.routine_exercises
  FOR DELETE TO authenticated
  USING (public.is_staff_or_owner(auth.uid()));

-- Update user_roles: allow owner to manage (keep admin for backward compat)
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Owners can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin'));
