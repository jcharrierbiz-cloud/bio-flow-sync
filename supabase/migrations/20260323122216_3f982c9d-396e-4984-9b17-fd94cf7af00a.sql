
CREATE TABLE public.scan_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NULL,
  device_id TEXT NOT NULL,
  scanned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  bpm INTEGER NOT NULL,
  hrv_rmssd NUMERIC NOT NULL,
  stress_index INTEGER NOT NULL,
  readiness_score INTEGER NOT NULL,
  is_morning_scan BOOLEAN NOT NULL DEFAULT false,
  day_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.scan_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert scan sessions" ON public.scan_sessions FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can read scan sessions" ON public.scan_sessions FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can update scan sessions" ON public.scan_sessions FOR UPDATE TO public USING (true);
