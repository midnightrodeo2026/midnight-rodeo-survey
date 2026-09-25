-- Midnight Rodeo roster survey · Supabase schema (self-hosted option)
-- Run in the Supabase SQL editor, then put your project URL + anon key
-- into js/config.js → supabase: { url, anonKey }.

create extension if not exists pgcrypto;

-- Full answers. Anyone can submit; only leaders can read.
create table if not exists public.responses (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  character   text not null check (char_length(character) between 2 and 24),
  main_class  text not null,
  main_spec   text not null,
  role        text not null check (role in ('Tank','Healer','Melee DPS','Ranged DPS')),
  payload     jsonb not null           -- the full survey record (see README)
);

-- Leadership allow-list (emails that may sign in to the Council view).
create table if not exists public.leaders (email text primary key);

-- Live targets edited from the Council view.
create table if not exists public.config (id text primary key, data jsonb not null);

create or replace function public.is_leader() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.leaders where lower(email) = lower(auth.jwt() ->> 'email'));
$$;

alter table public.responses enable row level security;
alter table public.leaders   enable row level security;
alter table public.config    enable row level security;

drop policy if exists "anyone can submit"      on public.responses;
drop policy if exists "leaders read responses" on public.responses;
drop policy if exists "anyone reads responses" on public.responses;
drop policy if exists "leaders delete"         on public.responses;
create policy "anyone can submit"      on public.responses for insert to anon, authenticated with check (true);
-- War Room is public: everyone can read all answers
create policy "anyone reads responses" on public.responses for select to anon, authenticated using (true);
create policy "leaders delete"         on public.responses for delete to authenticated using (public.is_leader());

drop policy if exists "read config"   on public.config;
drop policy if exists "leaders write" on public.config;
create policy "read config"   on public.config for select to anon, authenticated using (true);
create policy "leaders write" on public.config for all to authenticated using (public.is_leader()) with check (public.is_leader());

-- Public board: only name, class, spec, role (no Discord, notes, schedule).
create or replace view public.roster_public as
  select distinct on (lower(character)) id, created_at, character, main_class, main_spec, role
  from public.responses
  order by lower(character), created_at desc;
grant select on public.roster_public to anon, authenticated;

-- Add your leadership emails:
-- insert into public.leaders(email) values ('you@example.com');

-- ------------------------------------------------------------------
-- One answer per character, updatable from the same browser (edit code)
-- ------------------------------------------------------------------
alter table public.responses add column if not exists edit_token text;
alter table public.responses add column if not exists updated_at timestamptz not null default now();

-- Remove old duplicates: keep the newest answer for each character name.
delete from public.responses r
 using public.responses newer
 where lower(r.character) = lower(newer.character)
   and (r.created_at, r.id) < (newer.created_at, newer.id);

create unique index if not exists responses_one_per_character on public.responses (lower(character));

-- Everyone can read answers, but never the edit codes.
revoke select on public.responses from anon, authenticated;
grant select (id, created_at, updated_at, character, main_class, main_spec, role, payload) on public.responses to anon, authenticated;

-- Answers are saved only through this function.
drop policy if exists "anyone can submit" on public.responses;

create or replace function public.save_response(
  p_token text, p_character text, p_main_class text, p_main_spec text, p_role text, p_payload jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_tok text; v_name text := trim(p_character);
begin
  if coalesce(length(p_token), 0) < 16 then raise exception 'Missing edit code'; end if;
  if char_length(v_name) < 2 then raise exception 'Character name is required'; end if;

  select id, edit_token into v_id, v_tok from responses where lower(character) = lower(v_name);

  if v_id is not null and v_tok is not null and v_tok <> p_token then
    raise exception 'ALREADY_ANSWERED';
  end if;

  if v_id is null then
    -- Same browser renamed its character: update that answer instead of adding a second one.
    select id into v_id from responses where edit_token = p_token;
  end if;

  if v_id is null then
    insert into responses (character, main_class, main_spec, role, payload, edit_token)
    values (v_name, p_main_class, p_main_spec, p_role, p_payload, p_token)
    returning id into v_id;
  else
    update responses
       set character = v_name, main_class = p_main_class, main_spec = p_main_spec,
           role = p_role, payload = p_payload, edit_token = coalesce(edit_token, p_token), updated_at = now()
     where id = v_id;
  end if;
  return v_id;
end $$;

grant execute on function public.save_response(text, text, text, text, text, jsonb) to anon, authenticated;

-- ------------------------------------------------------------------
-- Riders can remove only their own answer. Nobody can remove anyone else's.
-- ------------------------------------------------------------------
drop policy if exists "leaders delete" on public.responses;

create or replace function public.delete_my_response(p_token text) returns boolean
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if coalesce(length(p_token), 0) < 16 then return false; end if;
  delete from responses where edit_token = p_token;
  get diagnostics n = row_count;
  return n > 0;
end $$;

grant execute on function public.delete_my_response(text) to anon, authenticated;
