
-- Recreate claim_device_data: take user_id explicitly, restrict EXECUTE to service_role.
DROP FUNCTION IF EXISTS public.claim_device_data(text);

CREATE OR REPLACE FUNCTION public.claim_device_data(p_device_id text, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
begin
  if p_user_id is null or p_device_id is null then
    return;
  end if;
  update public.user_profiles       set user_id = p_user_id where device_id = p_device_id and user_id is null;
  update public.scan_sessions        set user_id = p_user_id where device_id = p_device_id and user_id is null;
  update public.effort_sessions      set user_id = p_user_id where device_id = p_device_id and user_id is null;
  update public.daily_nutrition_logs set user_id = p_user_id where device_id = p_device_id and user_id is null;
  update public.weekly_summaries     set user_id = p_user_id where device_id = p_device_id and user_id is null;
end;
$$;

REVOKE ALL ON FUNCTION public.claim_device_data(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_device_data(text, uuid) TO service_role;
