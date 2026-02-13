
-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 4. RLS: admins can see all roles, users see own
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. Add validation fields to reports
ALTER TABLE public.reports ADD COLUMN validated boolean NOT NULL DEFAULT false;
ALTER TABLE public.reports ADD COLUMN validated_by uuid REFERENCES auth.users(id);
ALTER TABLE public.reports ADD COLUMN validated_at timestamptz;

-- 6. Update get_public_reports to only return validated reports
CREATE OR REPLACE FUNCTION public.get_public_reports()
RETURNS TABLE(
  id uuid, service_type text, description text, location text,
  latitude double precision, longitude double precision, urgency text,
  status text, reporter_type text, start_time timestamptz,
  verifications integer, created_at timestamptz, resolved_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT
    r.id, r.service_type,
    LEFT(r.description, 120) AS description,
    r.location,
    ROUND(r.latitude::numeric, 1)::double precision AS latitude,
    ROUND(r.longitude::numeric, 1)::double precision AS longitude,
    r.urgency, r.status, r.reporter_type, r.start_time,
    r.verifications, r.created_at, r.resolved_at
  FROM public.reports r
  WHERE auth.uid() IS NOT NULL AND r.validated = true
  ORDER BY r.created_at DESC
  LIMIT 100;
$$;

-- 7. Allow admins/moderators to read all reports for validation
CREATE POLICY "Admins can view all reports"
  ON public.reports FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins can update all reports"
  ON public.reports FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- 8. Allow admins to read all profiles
CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
