ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS sport_history text,
ADD COLUMN IF NOT EXISTS schedule text,
ADD COLUMN IF NOT EXISTS workload text,
ADD COLUMN IF NOT EXISTS focus_lock_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS blocked_categories text[] NOT NULL DEFAULT '{}'::text[];