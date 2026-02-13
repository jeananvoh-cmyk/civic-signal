
-- Reports: text length constraints
ALTER TABLE public.reports ADD CONSTRAINT description_length CHECK (length(description) <= 2000);
ALTER TABLE public.reports ADD CONSTRAINT location_length CHECK (length(location) <= 500);

-- Reports: coordinate range validation
ALTER TABLE public.reports ADD CONSTRAINT valid_latitude CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));
ALTER TABLE public.reports ADD CONSTRAINT valid_longitude CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));

-- Profiles: text length constraints
ALTER TABLE public.profiles ADD CONSTRAINT bio_length CHECK (length(bio) <= 500);
ALTER TABLE public.profiles ADD CONSTRAINT first_name_length CHECK (length(first_name) <= 100);
ALTER TABLE public.profiles ADD CONSTRAINT last_name_length CHECK (length(last_name) <= 100);
ALTER TABLE public.profiles ADD CONSTRAINT commune_length CHECK (length(commune) <= 100);
ALTER TABLE public.profiles ADD CONSTRAINT quartier_length CHECK (length(quartier) <= 100);
ALTER TABLE public.profiles ADD CONSTRAINT display_name_length CHECK (length(display_name) <= 150);

-- Storage: restrict uploads to images only
CREATE POLICY "Only image uploads allowed"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'report-photos'
    AND (storage.extension(name) IN ('jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'))
  );
