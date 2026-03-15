
-- Enforce student plan limits at the database level via trigger.
-- This prevents bypassing the client-side check by calling the API directly.

CREATE OR REPLACE FUNCTION public.check_student_plan_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
  gym_max_students INTEGER;
BEGIN
  -- Get the gym's student limit
  SELECT max_students INTO gym_max_students
  FROM public.gyms
  WHERE id = NEW.gym_id;

  -- -1 means unlimited (Pro/Enterprise plans)
  IF gym_max_students IS NOT NULL AND gym_max_students != -1 THEN
    SELECT COUNT(*) INTO current_count
    FROM public.students
    WHERE gym_id = NEW.gym_id;

    IF current_count >= gym_max_students THEN
      RAISE EXCEPTION 'student_limit_reached: Has alcanzado el límite de % alumnos del plan actual.', gym_max_students;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER enforce_student_plan_limit
  BEFORE INSERT ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.check_student_plan_limit();
