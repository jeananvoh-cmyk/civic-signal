begin;

drop policy if exists "Partners can read validated relevant reports" on public.reports;

create or replace function public.get_partner_reports()
returns table (
  id uuid,
  ticket_code text,
  service_type text,
  report_category text,
  description text,
  location text,
  commune text,
  quartier text,
  pada_formatted_address text,
  status text,
  urgency text,
  validated_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  support_count integer,
  cie_ticket_number text,
  operator_name text,
  operator_reference text,
  estimated_resolution_time text,
  operator_last_note text
)
language sql stable security definer
set search_path = public, pg_temp
as $$
  select r.id,r.ticket_code,r.service_type,r.report_category,r.description,r.location,
         r.commune,r.quartier,r.pada_formatted_address,r.status::text,r.urgency::text,
         r.validated_at,r.created_at,r.updated_at,r.support_count,r.cie_ticket_number,
         r.operator_name,r.operator_reference,r.estimated_resolution_time,r.operator_last_note
  from public.reports r
  join public.partner_profiles pp on pp.user_id = auth.uid()
  where r.validated = true
    and ((pp.partner_type = 'cie' and r.service_type = 'electricity')
      or (pp.partner_type = 'sodeci' and r.service_type = 'water')
      or (pp.partner_type = 'mairie' and r.report_category = 'infrastructure' and pp.commune = r.commune)
      or (pp.partner_type in ('ngo','other')))
  order by r.created_at desc;
$$;

revoke all on function public.get_partner_reports() from public;
grant execute on function public.get_partner_reports() to authenticated;

commit;
