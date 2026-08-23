begin;

-- Moderator must use explicit moderation RPCs; no arbitrary UPDATE of reports.
revoke update on table public.reports from anon;
revoke update on table public.reports from authenticated;
grant update on table public.reports to authenticated;

drop policy if exists "Admins can update all reports" on public.reports;
drop policy if exists "Admins and moderators can update reports" on public.reports;
drop policy if exists "Admins can update reports" on public.reports;
create policy "Admins can update reports"
on public.reports
as permissive
for update
to authenticated
using (public.has_role(auth.uid(), 'admin'::public.app_role))
with check (public.has_role(auth.uid(), 'admin'::public.app_role));

revoke all on function public.find_similar_reports(text,text,text,text) from public;
revoke all on function public.find_similar_reports(text,text,text,text) from anon;
grant execute on function public.find_similar_reports(text,text,text,text) to authenticated;

commit;
