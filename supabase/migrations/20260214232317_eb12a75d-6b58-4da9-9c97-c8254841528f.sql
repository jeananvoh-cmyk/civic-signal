-- Set server-side file size limit of 5MB on report-photos bucket
UPDATE storage.buckets 
SET file_size_limit = 5242880 
WHERE id = 'report-photos';