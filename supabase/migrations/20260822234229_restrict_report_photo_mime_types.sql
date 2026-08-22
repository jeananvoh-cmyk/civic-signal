BEGIN;
UPDATE storage.buckets SET allowed_mime_types=ARRAY['image/jpeg','image/png','image/gif','image/webp','image/heic'] WHERE id='report-photos';
COMMIT;
