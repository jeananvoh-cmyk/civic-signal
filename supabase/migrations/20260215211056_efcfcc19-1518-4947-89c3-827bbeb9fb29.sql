
-- Site settings table for admin-controlled feature flags
CREATE TABLE public.site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT 'true'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings (needed to check donation page visibility)
CREATE POLICY "Anyone can read site_settings"
ON public.site_settings FOR SELECT
USING (true);

-- Only admins can update
CREATE POLICY "Admins can update site_settings"
ON public.site_settings FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Only admins can insert
CREATE POLICY "Admins can insert site_settings"
ON public.site_settings FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Only admins can delete
CREATE POLICY "Admins can delete site_settings"
ON public.site_settings FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Insert default setting for donations page
INSERT INTO public.site_settings (key, value) VALUES ('donations_enabled', 'true'::jsonb);
