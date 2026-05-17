create table if not exists public.exam_sets (
  id text primary key,
  title text not null,
  description text,
  duration_minutes integer not null default 60,
  total_score numeric not null default 100,
  questions jsonb not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.exam_sets enable row level security;

drop policy if exists "Anyone can read active exam sets" on public.exam_sets;
create policy "Anyone can read active exam sets"
on public.exam_sets
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Admins can create exam sets" on public.exam_sets;
create policy "Admins can create exam sets"
on public.exam_sets
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update exam sets" on public.exam_sets;
create policy "Admins can update exam sets"
on public.exam_sets
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete exam sets" on public.exam_sets;
create policy "Admins can delete exam sets"
on public.exam_sets
for delete
to authenticated
using (public.is_admin());
