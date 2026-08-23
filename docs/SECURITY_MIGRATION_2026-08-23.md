# Security migration status — 2026-08-23

Production Supabase changes applied:

- Moderator direct `reports` UPDATE removed; only admin retains direct table UPDATE.
- `find_similar_reports(text,text,text,text)` execution removed from `public`/`anon`; authenticated users only.
- Partner direct raw-row SELECT policy on `reports` removed.
- Added `get_partner_reports()` SECURITY DEFINER RPC with fixed `search_path` and an explicit minimal operational projection.

The partner RPC intentionally excludes `user_id`, exact latitude/longitude, vulnerability counts, meter number, raw photo URLs and internal audit/routing fields.
