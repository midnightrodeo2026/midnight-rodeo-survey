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
