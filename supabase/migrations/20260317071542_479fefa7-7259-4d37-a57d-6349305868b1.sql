
CREATE TABLE public.focus_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  abandoned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (no auth required for local-first app)
CREATE POLICY "Anyone can insert focus sessions"
  ON public.focus_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can read focus sessions"
  ON public.focus_sessions FOR SELECT
  USING (true);

CREATE POLICY "Anyone can update focus sessions"
  ON public.focus_sessions FOR UPDATE
  USING (true);
