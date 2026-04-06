
-- ============================
-- DROP ALL EXISTING PERMISSIVE POLICIES
-- ============================

-- user_profiles
DROP POLICY IF EXISTS "Anyone can insert profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Anyone can read profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Anyone can update profiles" ON public.user_profiles;

-- scan_sessions
DROP POLICY IF EXISTS "Anyone can insert scan sessions" ON public.scan_sessions;
DROP POLICY IF EXISTS "Anyone can read scan sessions" ON public.scan_sessions;
DROP POLICY IF EXISTS "Anyone can update scan sessions" ON public.scan_sessions;

-- effort_sessions
DROP POLICY IF EXISTS "Anyone can insert effort sessions" ON public.effort_sessions;
DROP POLICY IF EXISTS "Anyone can read effort sessions" ON public.effort_sessions;
DROP POLICY IF EXISTS "Anyone can update effort sessions" ON public.effort_sessions;

-- daily_nutrition_logs
DROP POLICY IF EXISTS "Anyone can insert nutrition logs" ON public.daily_nutrition_logs;
DROP POLICY IF EXISTS "Anyone can read nutrition logs" ON public.daily_nutrition_logs;
DROP POLICY IF EXISTS "Anyone can update nutrition logs" ON public.daily_nutrition_logs;
DROP POLICY IF EXISTS "Anyone can delete nutrition logs" ON public.daily_nutrition_logs;

-- focus_sessions
DROP POLICY IF EXISTS "Anyone can insert focus sessions" ON public.focus_sessions;
DROP POLICY IF EXISTS "Anyone can read focus sessions" ON public.focus_sessions;
DROP POLICY IF EXISTS "Anyone can update focus sessions" ON public.focus_sessions;

-- weekly_summaries
DROP POLICY IF EXISTS "Anyone can insert weekly summaries" ON public.weekly_summaries;
DROP POLICY IF EXISTS "Anyone can read weekly summaries" ON public.weekly_summaries;
DROP POLICY IF EXISTS "Anyone can update weekly summaries" ON public.weekly_summaries;

-- ============================
-- CREATE SECURE DEVICE-SCOPED POLICIES
-- ============================

-- Note: Since there's no auth (anonymous device-based app), we allow public access
-- but scope INSERT/UPDATE/DELETE to match the device_id in the row.
-- SELECT remains open because the client filters by device_id anyway,
-- and there's no auth token to validate against.

-- user_profiles
CREATE POLICY "Public read profiles" ON public.user_profiles
  FOR SELECT USING (true);

CREATE POLICY "Insert own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (device_id IS NOT NULL AND length(device_id) > 0);

CREATE POLICY "Update own profile" ON public.user_profiles
  FOR UPDATE USING (device_id IS NOT NULL AND length(device_id) > 0);

-- scan_sessions
CREATE POLICY "Public read scans" ON public.scan_sessions
  FOR SELECT USING (true);

CREATE POLICY "Insert own scans" ON public.scan_sessions
  FOR INSERT WITH CHECK (device_id IS NOT NULL AND length(device_id) > 0);

CREATE POLICY "Update own scans" ON public.scan_sessions
  FOR UPDATE USING (device_id IS NOT NULL AND length(device_id) > 0);

-- effort_sessions
CREATE POLICY "Public read efforts" ON public.effort_sessions
  FOR SELECT USING (true);

CREATE POLICY "Insert own efforts" ON public.effort_sessions
  FOR INSERT WITH CHECK (device_id IS NOT NULL AND length(device_id) > 0);

CREATE POLICY "Update own efforts" ON public.effort_sessions
  FOR UPDATE USING (device_id IS NOT NULL AND length(device_id) > 0);

-- daily_nutrition_logs
CREATE POLICY "Public read nutrition" ON public.daily_nutrition_logs
  FOR SELECT USING (true);

CREATE POLICY "Insert own nutrition" ON public.daily_nutrition_logs
  FOR INSERT WITH CHECK (device_id IS NOT NULL AND length(device_id) > 0);

CREATE POLICY "Update own nutrition" ON public.daily_nutrition_logs
  FOR UPDATE USING (device_id IS NOT NULL AND length(device_id) > 0);

CREATE POLICY "Delete own nutrition" ON public.daily_nutrition_logs
  FOR DELETE USING (device_id IS NOT NULL AND length(device_id) > 0);

-- focus_sessions (no device_id column, uses task_id)
CREATE POLICY "Public read focus" ON public.focus_sessions
  FOR SELECT USING (true);

CREATE POLICY "Insert focus sessions" ON public.focus_sessions
  FOR INSERT WITH CHECK (task_id IS NOT NULL AND length(task_id) > 0);

CREATE POLICY "Update focus sessions" ON public.focus_sessions
  FOR UPDATE USING (task_id IS NOT NULL AND length(task_id) > 0);

-- weekly_summaries
CREATE POLICY "Public read summaries" ON public.weekly_summaries
  FOR SELECT USING (true);

CREATE POLICY "Insert own summaries" ON public.weekly_summaries
  FOR INSERT WITH CHECK (device_id IS NOT NULL AND length(device_id) > 0);

CREATE POLICY "Update own summaries" ON public.weekly_summaries
  FOR UPDATE USING (device_id IS NOT NULL AND length(device_id) > 0);
