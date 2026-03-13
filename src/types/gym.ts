export type AppRole = 'owner' | 'manager' | 'student' | 'admin' | 'staff';

export interface Student {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  age: number | null;
  weight: number | null;
  height: number | null;
  training_goal: string | null;
  enrollment_date: string;
  due_day: number;
  status: 'active' | 'inactive' | 'overdue';
  observations: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  // joined data
  routine_name?: string | null;
  nutrition_plan_name?: string | null;
}

export interface Payment {
  id: string;
  student_id: string;
  amount: number;
  due_date: string;
  payment_date: string | null;
  status: 'paid' | 'pending' | 'overdue';
  payment_method: string | null;
  notes: string | null;
  created_at: string;
  // joined
  student_name?: string;
}

export interface Routine {
  id: string;
  name: string;
  goal: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  days_per_week: number;
  description: string | null;
  created_at: string;
  updated_at: string;
  exercises?: RoutineExercise[];
}

export interface RoutineExercise {
  id: string;
  routine_id: string;
  exercise_name: string;
  sets: number;
  reps: string;
  rest_seconds: number;
  sort_order: number;
  observations: string | null;
  created_at: string;
}

export interface NutritionPlan {
  id: string;
  name: string;
  goal: string;
  estimated_calories: number | null;
  daily_protein: string | null;
  suggested_meals: string | null;
  suggested_supplements: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserWithRole {
  id: string;
  email: string;
  role: AppRole;
  created_at: string;
}
