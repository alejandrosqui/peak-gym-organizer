
-- Fix RLS on student_routines and student_nutrition_plans.
-- These tables previously only checked role (is_staff_or_owner) without
-- verifying the student belongs to the same gym as the caller.

-- ── student_routines ─────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "View student routines" ON public.student_routines;
DROP POLICY IF EXISTS "Staff manage student routines" ON public.student_routines;
DROP POLICY IF EXISTS "Staff update student routines" ON public.student_routines;
DROP POLICY IF EXISTS "Staff delete student routines" ON public.student_routines;

CREATE POLICY "View student routines own gym" ON public.student_routines
  FOR SELECT TO authenticated
  USING (
    -- Staff/owners can see assignments for students in their gym
    (
      is_staff_or_owner(auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.id = student_id
          AND s.gym_id = get_gym_id_for_user(auth.uid())
      )
    )
    -- Students can see their own assignment
    OR student_id = get_student_id_for_user(auth.uid())
  );

CREATE POLICY "Staff manage student routines own gym" ON public.student_routines
  FOR INSERT TO authenticated
  WITH CHECK (
    is_staff_or_owner(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_id
        AND s.gym_id = get_gym_id_for_user(auth.uid())
    )
  );

CREATE POLICY "Staff update student routines own gym" ON public.student_routines
  FOR UPDATE TO authenticated
  USING (
    is_staff_or_owner(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_id
        AND s.gym_id = get_gym_id_for_user(auth.uid())
    )
  );

CREATE POLICY "Staff delete student routines own gym" ON public.student_routines
  FOR DELETE TO authenticated
  USING (
    is_staff_or_owner(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_id
        AND s.gym_id = get_gym_id_for_user(auth.uid())
    )
  );

-- ── student_nutrition_plans ───────────────────────────────────────────────────

DROP POLICY IF EXISTS "View student nutrition plans" ON public.student_nutrition_plans;
DROP POLICY IF EXISTS "Staff manage student nutrition plans" ON public.student_nutrition_plans;
DROP POLICY IF EXISTS "Staff update student nutrition plans" ON public.student_nutrition_plans;
DROP POLICY IF EXISTS "Staff delete student nutrition plans" ON public.student_nutrition_plans;

CREATE POLICY "View student nutrition plans own gym" ON public.student_nutrition_plans
  FOR SELECT TO authenticated
  USING (
    (
      is_staff_or_owner(auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.id = student_id
          AND s.gym_id = get_gym_id_for_user(auth.uid())
      )
    )
    OR student_id = get_student_id_for_user(auth.uid())
  );

CREATE POLICY "Staff manage student nutrition plans own gym" ON public.student_nutrition_plans
  FOR INSERT TO authenticated
  WITH CHECK (
    is_staff_or_owner(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_id
        AND s.gym_id = get_gym_id_for_user(auth.uid())
    )
  );

CREATE POLICY "Staff update student nutrition plans own gym" ON public.student_nutrition_plans
  FOR UPDATE TO authenticated
  USING (
    is_staff_or_owner(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_id
        AND s.gym_id = get_gym_id_for_user(auth.uid())
    )
  );

CREATE POLICY "Staff delete student nutrition plans own gym" ON public.student_nutrition_plans
  FOR DELETE TO authenticated
  USING (
    is_staff_or_owner(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_id
        AND s.gym_id = get_gym_id_for_user(auth.uid())
    )
  );
