
-- Create user_profiles table for onboarding data
CREATE TABLE public.user_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT,
  pseudo TEXT NOT NULL,
  age INTEGER NOT NULL,
  weight NUMERIC,
  weight_unit TEXT DEFAULT 'kg' CHECK (weight_unit IN ('kg', 'lbs')),
  height NUMERIC,
  height_unit TEXT DEFAULT 'cm' CHECK (height_unit IN ('cm', 'ft')),
  fitness_level TEXT CHECK (fitness_level IN ('sedentary', 'light', 'moderate', 'very_active', 'athlete')),
  organization_level TEXT CHECK (organization_level IN ('chaotic', 'flexible', 'organized', 'structured')),
  status TEXT CHECK (status IN ('student', 'working', 'both', 'entrepreneur', 'transition')),
  main_goal TEXT CHECK (main_goal IN ('cognitive', 'stress', 'sleep', 'productivity', 'fitness', 'holistic')),
  goal_details TEXT,
  ai_coach_config JSONB,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  audio_greeting_enabled BOOLEAN NOT NULL DEFAULT true,
  notification_enabled BOOLEAN NOT NULL DEFAULT false,
  reminder_minutes INTEGER NOT NULL DEFAULT 30,
  morning_scan_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Public policies (app works without auth for now, device_id based)
CREATE POLICY "Anyone can insert profiles"
  ON public.user_profiles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can read profiles"
  ON public.user_profiles FOR SELECT
  USING (true);

CREATE POLICY "Anyone can update profiles"
  ON public.user_profiles FOR UPDATE
  USING (true);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
