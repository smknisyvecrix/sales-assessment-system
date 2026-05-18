create table if not exists public.ai_analysis_results (
  result_id text primary key,
  participant_name text not null,
  department text not null,
  exam_id text not null,
  exam_title text not null,
  analysis jsonb not null,
  targeted_exam jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ai_analysis_results enable row level security;

drop policy if exists "Admins can read AI analysis" on public.ai_analysis_results;
create policy "Admins can read AI analysis"
on public.ai_analysis_results
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can create AI analysis" on public.ai_analysis_results;
create policy "Admins can create AI analysis"
on public.ai_analysis_results
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update AI analysis" on public.ai_analysis_results;
create policy "Admins can update AI analysis"
on public.ai_analysis_results
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete AI analysis" on public.ai_analysis_results;
create policy "Admins can delete AI analysis"
on public.ai_analysis_results
for delete
to authenticated
using (public.is_admin());
