
-- Set defaults so inserts auto-populate user_id with the authenticated user
ALTER TABLE public.scan_sessions       ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.effort_sessions     ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.weekly_summaries    ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.focus_sessions      ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.user_profiles       ALTER COLUMN user_id SET DEFAULT auth.uid();

-- daily_nutrition_logs has no user_id column yet
ALTER TABLE public.daily_nutrition_logs ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid();

-- ============ scan_sessions ============
DROP POLICY IF EXISTS "Public read scans"  ON public.scan_sessions;
DROP POLICY IF EXISTS "Insert own scans"   ON public.scan_sessions;
DROP POLICY IF EXISTS "Update own scans"   ON public.scan_sessions;
CREATE POLICY "Select own scans" ON public.scan_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Insert own scans" ON public.scan_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own scans" ON public.scan_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Delete own scans" ON public.scan_sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ effort_sessions ============
DROP POLICY IF EXISTS "Public read efforts" ON public.effort_sessions;
DROP POLICY IF EXISTS "Insert own efforts"  ON public.effort_sessions;
DROP POLICY IF EXISTS "Update own efforts"  ON public.effort_sessions;
CREATE POLICY "Select own efforts" ON public.effort_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Insert own efforts" ON public.effort_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own efforts" ON public.effort_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Delete own efforts" ON public.effort_sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ weekly_summaries ============
DROP POLICY IF EXISTS "Public read summaries" ON public.weekly_summaries;
DROP POLICY IF EXISTS "Insert own summaries"  ON public.weekly_summaries;
DROP POLICY IF EXISTS "Update own summaries"  ON public.weekly_summaries;
CREATE POLICY "Select own summaries" ON public.weekly_summaries FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Insert own summaries" ON public.weekly_summaries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own summaries" ON public.weekly_summaries FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Delete own summaries" ON public.weekly_summaries FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ daily_nutrition_logs ============
DROP POLICY IF EXISTS "Public read nutrition" ON public.daily_nutrition_logs;
DROP POLICY IF EXISTS "Insert own nutrition"  ON public.daily_nutrition_logs;
DROP POLICY IF EXISTS "Update own nutrition"  ON public.daily_nutrition_logs;
DROP POLICY IF EXISTS "Delete own nutrition"  ON public.daily_nutrition_logs;
CREATE POLICY "Select own nutrition" ON public.daily_nutrition_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Insert own nutrition" ON public.daily_nutrition_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own nutrition" ON public.daily_nutrition_logs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Delete own nutrition" ON public.daily_nutrition_logs FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ focus_sessions ============
DROP POLICY IF EXISTS "Public read focus"     ON public.focus_sessions;
DROP POLICY IF EXISTS "Insert focus sessions" ON public.focus_sessions;
DROP POLICY IF EXISTS "Update focus sessions" ON public.focus_sessions;
CREATE POLICY "Select own focus" ON public.focus_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Insert own focus" ON public.focus_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own focus" ON public.focus_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Delete own focus" ON public.focus_sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ user_profiles ============
DROP POLICY IF EXISTS "Public read profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Insert own profile"   ON public.user_profiles;
DROP POLICY IF EXISTS "Update own profile"   ON public.user_profiles;
CREATE POLICY "Select own profile" ON public.user_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Insert own profile" ON public.user_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own profile" ON public.user_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Delete own profile" ON public.user_profiles FOR DELETE TO authenticated USING (auth.uid() = user_id);
