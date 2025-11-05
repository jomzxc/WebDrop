-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Trigger for profiles table
drop trigger if exists on_profile_updated on public.profiles;
drop trigger if exists on_profile_updated_timestamp on public.profiles;

create trigger on_profile_updated_timestamp
  before update on public.profiles
  for each row
  execute function public.handle_updated_at();
