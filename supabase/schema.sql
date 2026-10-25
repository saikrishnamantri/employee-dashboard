-- Best Employee scoreboard: database tables and access rules.
-- Run this once in Supabase: SQL Editor → New query → paste → Run.

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null default 'Crew',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.periods (
  id uuid primary key default gen_random_uuid(),
  start_date date not null unique,
  end_date date not null,
  status text not null default 'in_progress' check (status in ('in_progress', 'final')),
  created_at timestamptz not null default now(),
  check (end_date > start_date)
);

-- Raw inputs per employee per period. Points are worked out by the website
-- (js/scoring.js) so the rules can change without touching the database.
create table if not exists public.scores (
  period_id uuid not null references public.periods(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  customer_service numeric check (customer_service between 0 and 20),
  cleaning numeric check (cleaning between 0 and 15),
  google_reviews integer check (google_reviews >= 0),
  teamwork_votes integer check (teamwork_votes >= 0),
  uniform numeric check (uniform between 0 and 15),
  upselling numeric check (upselling between 0 and 15),
  quiz_rank integer check (quiz_rank >= 1),
  notes text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  primary key (period_id, employee_id)
);

-- People allowed to enter scores. Add a row here for each manager.
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

alter table public.employees enable row level security;
alter table public.periods enable row level security;
alter table public.scores enable row level security;
alter table public.admins enable row level security;

-- Anyone with the link can view the scoreboard.
-- To make it admins-only, change "to anon, authenticated using (true)"
-- to "to authenticated using (public.is_admin())" in these three policies.
drop policy if exists "read employees" on public.employees;
create policy "read employees" on public.employees for select to anon, authenticated using (true);
drop policy if exists "read periods" on public.periods;
create policy "read periods" on public.periods for select to anon, authenticated using (true);
drop policy if exists "read scores" on public.scores;
create policy "read scores" on public.scores for select to anon, authenticated using (true);

-- Only admins can add, change or remove anything.
drop policy if exists "admins write employees" on public.employees;
create policy "admins write employees" on public.employees for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins write periods" on public.periods;
create policy "admins write periods" on public.periods for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins write scores" on public.scores;
create policy "admins write scores" on public.scores for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- A signed-in user can see whether they are an admin. Admins are added in SQL only.
drop policy if exists "see own admin row" on public.admins;
create policy "see own admin row" on public.admins for select to authenticated
  using (user_id = auth.uid());
