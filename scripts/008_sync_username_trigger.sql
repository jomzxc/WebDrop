-- Create a function that updates the username in public.peers
-- whenever a user's profile is updated.
CREATE OR REPLACE FUNCTION public.handle_profile_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the username actually changed
  IF NEW.username IS DISTINCT FROM OLD.username THEN
    -- Update all instances of the username in the peers table
    UPDATE public.peers
    SET username = NEW.username
    WHERE user_id = NEW.id;
  END IF;
  
  -- This is an AFTER trigger, so we must return NEW
  RETURN NEW;
END;
$$;

-- Create the trigger that fires the function
DROP TRIGGER IF EXISTS on_profile_updated ON public.profiles;
DROP TRIGGER IF EXISTS on_profile_username_synced ON public.profiles;

CREATE TRIGGER on_profile_username_synced
  AFTER UPDATE OF username ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_profile_update();
