
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'staff');

-- User roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS for user_roles
CREATE POLICY "Admins can manage roles" ON public.user_roles
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own role" ON public.user_roles
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Students table
CREATE TABLE public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    age INTEGER,
    weight DECIMAL(5,2),
    height DECIMAL(5,2),
    training_goal TEXT,
    enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_day INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'overdue')),
    observations TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view students" ON public.students
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert students" ON public.students
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update students" ON public.students
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins can delete students" ON public.students
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Payments table
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    due_date DATE NOT NULL,
    payment_date DATE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'overdue')),
    payment_method TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view payments" ON public.payments
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert payments" ON public.payments
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update payments" ON public.payments
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins can delete payments" ON public.payments
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Routines table
CREATE TABLE public.routines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    goal TEXT NOT NULL,
    level TEXT NOT NULL CHECK (level IN ('beginner', 'intermediate', 'advanced')),
    days_per_week INTEGER NOT NULL DEFAULT 3,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view routines" ON public.routines
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert routines" ON public.routines
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update routines" ON public.routines
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins can delete routines" ON public.routines
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Routine exercises table
CREATE TABLE public.routine_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    routine_id UUID REFERENCES public.routines(id) ON DELETE CASCADE NOT NULL,
    exercise_name TEXT NOT NULL,
    sets INTEGER NOT NULL DEFAULT 3,
    reps TEXT NOT NULL DEFAULT '12',
    rest_seconds INTEGER NOT NULL DEFAULT 60,
    sort_order INTEGER NOT NULL DEFAULT 0,
    observations TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.routine_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view exercises" ON public.routine_exercises
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert exercises" ON public.routine_exercises
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update exercises" ON public.routine_exercises
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete exercises" ON public.routine_exercises
FOR DELETE TO authenticated USING (true);

-- Nutrition plans table
CREATE TABLE public.nutrition_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    goal TEXT NOT NULL,
    estimated_calories INTEGER,
    daily_protein TEXT,
    suggested_meals TEXT,
    suggested_supplements TEXT,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.nutrition_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view plans" ON public.nutrition_plans
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert plans" ON public.nutrition_plans
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update plans" ON public.nutrition_plans
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins can delete plans" ON public.nutrition_plans
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Student-routine assignments
CREATE TABLE public.student_routines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    routine_id UUID REFERENCES public.routines(id) ON DELETE CASCADE NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(student_id)
);
ALTER TABLE public.student_routines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage student routines" ON public.student_routines
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Student-nutrition plan assignments
CREATE TABLE public.student_nutrition_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    nutrition_plan_id UUID REFERENCES public.nutrition_plans(id) ON DELETE CASCADE NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(student_id)
);
ALTER TABLE public.student_nutrition_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage student plans" ON public.student_nutrition_plans
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_routines_updated_at BEFORE UPDATE ON public.routines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_nutrition_plans_updated_at BEFORE UPDATE ON public.nutrition_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;
