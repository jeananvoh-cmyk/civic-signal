-- Migration: Autoriser la lecture publique des photos de signalements
-- Date: 2026-09-03
-- Description: Permet à tous les citoyens et agents de visualiser les photos des pannes et dégradations urbaines.

BEGIN;

DROP POLICY IF EXISTS "Public read for report photos" ON storage.objects;

CREATE POLICY "Public read for report photos" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'report-photos');

UPDATE storage.buckets SET public = true WHERE id = 'report-photos';

COMMIT;
