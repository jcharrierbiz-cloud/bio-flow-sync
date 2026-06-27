ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS parental_consent BOOLEAN,
  ADD COLUMN IF NOT EXISTS consent_age INTEGER;