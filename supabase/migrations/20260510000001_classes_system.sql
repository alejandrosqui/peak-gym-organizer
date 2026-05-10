-- ══════════════════════════════════════════════════════════════════
-- SISTEMA DE CLASES Y HORARIOS
-- ══════════════════════════════════════════════════════════════════

-- ── 1. gym_spaces — Ambientes físicos del gym ─────────────────────
CREATE TABLE IF NOT EXISTS public.gym_spaces (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id      UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  capacity    INTEGER NOT NULL DEFAULT 20,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.gym_spaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view own gym spaces" ON public.gym_spaces
  FOR SELECT TO authenticated
  USING (gym_id = get_gym_id_for_user(auth.uid()));

CREATE POLICY "Staff manage own gym spaces" ON public.gym_spaces
  FOR INSERT TO authenticated
  WITH CHECK (is_staff_or_owner(auth.uid()) AND gym_id = get_gym_id_for_user(auth.uid()));

CREATE POLICY "Staff update own gym spaces" ON public.gym_spaces
  FOR UPDATE TO authenticated
  USING (is_staff_or_owner(auth.uid()) AND gym_id = get_gym_id_for_user(auth.uid()));

CREATE POLICY "Staff delete own gym spaces" ON public.gym_spaces
  FOR DELETE TO authenticated
  USING (is_staff_or_owner(auth.uid()) AND gym_id = get_gym_id_for_user(auth.uid()));


-- ── 2. class_schedules — Clases recurrentes con horario ──────────
CREATE TABLE IF NOT EXISTS public.class_schedules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id          UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  space_id        UUID REFERENCES public.gym_spaces(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  days            INTEGER[] NOT NULL,   -- 0=Dom 1=Lun 2=Mar 3=Mié 4=Jue 5=Vie 6=Sáb
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  max_capacity    INTEGER NOT NULL DEFAULT 20,
  instructor_name TEXT,
  color           TEXT DEFAULT '#f97316',
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All view own gym schedules" ON public.class_schedules
  FOR SELECT TO authenticated
  USING (gym_id = get_gym_id_for_user(auth.uid()));

CREATE POLICY "Staff manage own gym schedules" ON public.class_schedules
  FOR INSERT TO authenticated
  WITH CHECK (is_staff_or_owner(auth.uid()) AND gym_id = get_gym_id_for_user(auth.uid()));

CREATE POLICY "Staff update own gym schedules" ON public.class_schedules
  FOR UPDATE TO authenticated
  USING (is_staff_or_owner(auth.uid()) AND gym_id = get_gym_id_for_user(auth.uid()));

CREATE POLICY "Staff delete own gym schedules" ON public.class_schedules
  FOR DELETE TO authenticated
  USING (is_staff_or_owner(auth.uid()) AND gym_id = get_gym_id_for_user(auth.uid()));


-- ── 3. student_class_subscriptions — Alumno inscripto a una clase ─
CREATE TABLE IF NOT EXISTS public.student_class_subscriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  schedule_id   UUID NOT NULL REFERENCES public.class_schedules(id) ON DELETE CASCADE,
  gym_id        UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  weekly_limit  INTEGER NOT NULL DEFAULT 3,   -- cuántas veces por semana puede ir
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, schedule_id)
);

ALTER TABLE public.student_class_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own gym subscriptions" ON public.student_class_subscriptions
  FOR SELECT TO authenticated
  USING (
    (is_staff_or_owner(auth.uid()) AND gym_id = get_gym_id_for_user(auth.uid()))
    OR student_id = get_student_id_for_user(auth.uid())
  );

CREATE POLICY "Staff manage subscriptions" ON public.student_class_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (is_staff_or_owner(auth.uid()) AND gym_id = get_gym_id_for_user(auth.uid()));

CREATE POLICY "Staff update subscriptions" ON public.student_class_subscriptions
  FOR UPDATE TO authenticated
  USING (is_staff_or_owner(auth.uid()) AND gym_id = get_gym_id_for_user(auth.uid()));

CREATE POLICY "Staff delete subscriptions" ON public.student_class_subscriptions
  FOR DELETE TO authenticated
  USING (is_staff_or_owner(auth.uid()) AND gym_id = get_gym_id_for_user(auth.uid()));


-- ── 4. class_enrollments — Confirmación de asistencia por fecha ───
--   status:
--     confirmed      → confirmó asistencia
--     cancelled_early→ canceló antes de las 23hs del día anterior (NO descuenta)
--     cancelled_late → canceló después del límite (SÍ descuenta del cupo semanal)
--     waitlist       → lista de espera (cupo lleno)
--     attended       → asistió (marcado por el admin)
--     absent         → no se presentó
--     extended       → movió la clase a la semana siguiente
CREATE TABLE IF NOT EXISTS public.class_enrollments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  schedule_id  UUID NOT NULL REFERENCES public.class_schedules(id) ON DELETE CASCADE,
  gym_id       UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  date         DATE NOT NULL,
  status       TEXT NOT NULL DEFAULT 'confirmed'
                 CHECK (status IN ('confirmed','cancelled_early','cancelled_late','waitlist','attended','absent','extended')),
  enrolled_at  TIMESTAMPTZ DEFAULT now(),
  cancelled_at TIMESTAMPTZ,
  UNIQUE(student_id, schedule_id, date)
);

ALTER TABLE public.class_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own gym enrollments" ON public.class_enrollments
  FOR SELECT TO authenticated
  USING (
    (is_staff_or_owner(auth.uid()) AND gym_id = get_gym_id_for_user(auth.uid()))
    OR student_id = get_student_id_for_user(auth.uid())
  );

CREATE POLICY "Staff manage enrollments" ON public.class_enrollments
  FOR INSERT TO authenticated
  WITH CHECK (
    (is_staff_or_owner(auth.uid()) AND gym_id = get_gym_id_for_user(auth.uid()))
    OR student_id = get_student_id_for_user(auth.uid())
  );

CREATE POLICY "Staff update enrollments" ON public.class_enrollments
  FOR UPDATE TO authenticated
  USING (
    (is_staff_or_owner(auth.uid()) AND gym_id = get_gym_id_for_user(auth.uid()))
    OR student_id = get_student_id_for_user(auth.uid())
  );

CREATE POLICY "Staff delete enrollments" ON public.class_enrollments
  FOR DELETE TO authenticated
  USING (
    (is_staff_or_owner(auth.uid()) AND gym_id = get_gym_id_for_user(auth.uid()))
    OR student_id = get_student_id_for_user(auth.uid())
  );
