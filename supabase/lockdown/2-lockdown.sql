-- Step 2 of 2. Run ONLY after the app code that uses the step-1 functions
-- is live. Running it earlier makes the live dashboard fall back to sample
-- data and breaks the admin panel until the new code deploys.
--
-- Afterwards the anon key (the one in the public JS bundle) can:
--   * insert new survey responses, only with a work email
--   * read the settings table (key findings shown on the dashboard)
--   * call the functions from step 1
-- and nothing else: no reading, editing or deleting responses directly.
--
-- All or nothing: if any statement fails, none of it applies. A half-run
-- script could leave responses with RLS on and no insert policy, which
-- silently drops every new submission.

begin;

-- The dashboard's key findings. The app has always read and written this
-- table, but it was never created, so saves from the admin panel failed.
create table if not exists public.settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

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

-- Work emails only. The pattern and domain list repeat EMAIL_PATTERN and
-- PERSONAL_EMAIL_DOMAINS in src/App.jsx; keep the two in step, or the form
-- will accept answers the database then refuses.
create policy "anyone can submit a response with a work email"
  on public.responses for insert to anon, authenticated
  with check (
    lower(btrim(data->>'q12Email')) ~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$'
    and split_part(lower(btrim(data->>'q12Email')), '@', 2) <> all (array[
      'gmail.com','googlemail.com','yahoo.com','yahoo.ca','yahoo.co.uk','ymail.com','rocketmail.com',
      'outlook.com','hotmail.com','hotmail.ca','hotmail.co.uk','live.com','live.ca','msn.com',
      'icloud.com','me.com','mac.com','aol.com','gmx.com','gmx.net','mail.com',
      'proton.me','protonmail.com','pm.me','zohomail.com','yandex.com','yandex.ru',
      'comcast.net','att.net','sbcglobal.net','verizon.net','cox.net','charter.net',
      'earthlink.net','bellsouth.net','shaw.ca','rogers.com','sympatico.ca'
    ])
  );

create policy "anyone can read settings"
  on public.settings for select to anon, authenticated
  using (true);

revoke all on public.responses from anon, authenticated;
revoke all on public.settings  from anon, authenticated;
grant insert on public.responses to anon, authenticated;
grant select on public.settings  to anon, authenticated;

commit;
