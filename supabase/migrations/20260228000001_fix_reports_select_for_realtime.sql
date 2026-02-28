
-- Problem: the badge on the homepage doesn't update in real-time for:
--   1. Anonymous visitors     → blocked by the RESTRICTIVE DENY policy (anon role)
--   2. Authenticated non-admins → "Users can view own reports" restricts realtime
--      to only their own reports, so postgres_changes events for OTHER users'
--      reports are never delivered.
--
-- Fix: add a permissive SELECT policy so authenticated users can read all
-- outage reports. This unblocks Supabase Realtime for connected users.
-- Anonymous visitors still use the polling fallback via get_active_outage_count().

CREATE POLICY "Authenticated users can read outage reports"
  ON public.reports FOR SELECT
  TO authenticated
  USING (report_category = 'outage');
