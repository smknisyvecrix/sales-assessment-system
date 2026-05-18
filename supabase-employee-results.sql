drop policy if exists "Employees can read matching assessment results" on public.assessment_results;
create policy "Employees can read matching assessment results"
on public.assessment_results
for select
to anon, authenticated
using (true);

drop policy if exists "Employees can read AI analysis" on public.ai_analysis_results;
create policy "Employees can read AI analysis"
on public.ai_analysis_results
for select
to anon, authenticated
using (true);
