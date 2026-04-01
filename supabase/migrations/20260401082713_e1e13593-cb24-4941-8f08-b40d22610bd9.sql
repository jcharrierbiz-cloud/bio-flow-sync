
-- Create effort_sessions table
CREATE TABLE public.effort_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  user_id UUID,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  intensity TEXT NOT NULL DEFAULT 'Moderate',
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  day_date DATE NOT NULL DEFAULT CURRENT_DATE,
  journal_text TEXT,
  followup_notes TEXT[] DEFAULT '{}',
  ai_analysis JSONB,
  analyzed_at TIMESTAMPTZ,
  session_type_detected TEXT,
  intensity_level TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.effort_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert effort sessions" ON public.effort_sessions FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can read effort sessions" ON public.effort_sessions FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can update effort sessions" ON public.effort_sessions FOR UPDATE TO public USING (true);

-- Create weekly_summaries table
CREATE TABLE public.weekly_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  user_id UUID,
  week_start_date DATE NOT NULL,
  sport_synthesis TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.weekly_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert weekly summaries" ON public.weekly_summaries FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can read weekly summaries" ON public.weekly_summaries FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can update weekly summaries" ON public.weekly_summaries FOR UPDATE TO public USING (true);
