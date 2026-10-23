-- Step 1 of 2. Safe to run while the current site is live: it only ADDS
-- functions; nothing the site uses today changes. Run it in the Supabase SQL
-- editor before pushing the app code that calls these functions.
--
-- After running it, set the admin password (choose a new one — the old
-- one shipped in the public JS bundle and is in git history):
--
--   insert into private.admin_secret (id, pw_hash)
--   values (1, extensions.crypt('YOUR-NEW-PASSWORD', extensions.gen_salt('bf')))
--   on conflict (id) do update set pw_hash = excluded.pw_hash;

create extension if not exists pgcrypto with schema extensions;

-- `private` is not exposed through the REST API, so nothing in it is
-- reachable with the anon key.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.admin_secret (
  id      int primary key default 1 check (id = 1),
  pw_hash text not null
);

create or replace function private.check_admin(pw text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if pw is null or not exists (
    select 1 from private.admin_secret s
    where s.pw_hash = extensions.crypt(pw, s.pw_hash)
  ) then
    raise exception 'invalid admin password' using errcode = '28P01';
  end if;
end
$$;

-- Public read path for the dashboard: every response, minus contact info.
create or replace function public.survey_responses()
returns table (id text, data jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id::text, r.data - 'q12Email' - 'q12Consent'
  from public.responses r
  order by (r.data->>'ts')::bigint;
$$;

-- Admin paths. Each one checks the password inside the database, so the
-- password never has to live in the client.
create or replace function public.admin_responses(pw text)
returns table (id text, data jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.check_admin(pw);
  return query
    select r.id::text, r.data
    from public.responses r
    order by (r.data->>'ts')::bigint;
end
$$;

create or replace function public.admin_update_response(pw text, response_id text, new_data jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.check_admin(pw);
  update public.responses r set data = new_data where r.id::text = response_id;
end
$$;

create or replace function public.admin_delete_response(pw text, response_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.check_admin(pw);
  delete from public.responses r where r.id::text = response_id;
end
$$;

create or replace function public.admin_save_setting(pw text, setting_key text, setting_value jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.check_admin(pw);
  insert into public.settings (key, value, updated_at)
  values (setting_key, setting_value, now())
  on conflict (key) do update
    set value = excluded.value, updated_at = excluded.updated_at;
end
$$;

revoke all on function private.check_admin(text) from public, anon, authenticated;
revoke all on function public.survey_responses() from public;
revoke all on function public.admin_responses(text) from public;
revoke all on function public.admin_update_response(text, text, jsonb) from public;
revoke all on function public.admin_delete_response(text, text) from public;
revoke all on function public.admin_save_setting(text, text, jsonb) from public;
grant execute on function public.survey_responses() to anon, authenticated;
grant execute on function public.admin_responses(text) to anon, authenticated;
grant execute on function public.admin_update_response(text, text, jsonb) to anon, authenticated;
grant execute on function public.admin_delete_response(text, text) to anon, authenticated;
grant execute on function public.admin_save_setting(text, text, jsonb) to anon, authenticated;
