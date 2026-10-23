-- Step 2 of 2. Run ONLY after the app code that uses the step-1 functions
-- is live. Running it earlier makes the live dashboard fall back to sample
-- data and breaks the admin panel until the new code deploys.
--
-- Afterwards the anon key (the one in the public JS bundle) can:
--   * insert new survey responses
--   * read the settings table (key findings shown on the dashboard)
--   * call the functions from step 1
-- and nothing else: no reading, editing or deleting responses directly.

alter table public.responses enable row level security;
alter table public.settings  enable row level security;

-- Drop whatever policies exist today so nothing permissive lingers.
do $$
declare p record;
begin
  for p in
    select policyname, tablename from pg_policies
    where schemaname = 'public' and tablename in ('responses', 'settings')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end
$$;

create policy "anyone can submit a response"
  on public.responses for insert to anon, authenticated
  with check (true);

create policy "anyone can read settings"
  on public.settings for select to anon, authenticated
  using (true);

revoke all on public.responses from anon, authenticated;
revoke all on public.settings  from anon, authenticated;
grant insert on public.responses to anon, authenticated;
grant select on public.settings  to anon, authenticated;
