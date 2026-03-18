CREATE TABLE public.daily_nutrition_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  tip_index integer NOT NULL,
  checked boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(device_id, log_date, tip_index)
);

ALTER TABLE public.daily_nutrition_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert nutrition logs" ON public.daily_nutrition_logs FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can read nutrition logs" ON public.daily_nutrition_logs FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can update nutrition logs" ON public.daily_nutrition_logs FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete nutrition logs" ON public.daily_nutrition_logs FOR DELETE TO public USING (true);