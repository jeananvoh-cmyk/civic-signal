
-- Add commune and quartier columns to reports
ALTER TABLE public.reports ADD COLUMN commune text NOT NULL DEFAULT '';
ALTER TABLE public.reports ADD COLUMN quartier text NOT NULL DEFAULT '';

-- Add length constraints
ALTER TABLE public.reports ADD CONSTRAINT commune_length CHECK (length(commune) <= 100);
ALTER TABLE public.reports ADD CONSTRAINT quartier_length CHECK (length(quartier) <= 100);
