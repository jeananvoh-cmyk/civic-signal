-- Ajoute le rôle "partner" à l'enum app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'partner';

-- Table des profils partenaires
-- Stocke les métadonnées permettant de filtrer ce que chaque partenaire peut voir
CREATE TABLE public.partner_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_name TEXT NOT NULL,
  partner_type TEXT NOT NULL CHECK (partner_type IN ('cie', 'sodeci', 'mairie', 'ngo', 'other')),
  commune TEXT, -- NULL pour les opérateurs nationaux (CIE, SODECI), obligatoire pour les mairies
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT mairie_requires_commune CHECK (
    partner_type != 'mairie' OR (commune IS NOT NULL AND commune != '')
  )
);

ALTER TABLE public.partner_profiles ENABLE ROW LEVEL SECURITY;

-- Le partenaire peut lire son propre profil ; les admins voient tout
CREATE POLICY "Partners and admins can read partner profiles"
  ON public.partner_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Seuls les admins peuvent créer / modifier / supprimer des profils partenaires
CREATE POLICY "Admins manage partner profiles"
  ON public.partner_profiles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS sur reports : un partenaire ne voit que ce qui le concerne
CREATE POLICY "Partners can read relevant reports"
  ON public.reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.partner_profiles pp
      WHERE pp.user_id = auth.uid()
        AND (
          (pp.partner_type = 'cie'    AND service_type = 'electricity')
          OR (pp.partner_type = 'sodeci' AND service_type = 'water')
          OR (pp.partner_type = 'mairie' AND report_category = 'infrastructure' AND pp.commune = reports.commune)
          OR pp.partner_type IN ('ngo', 'other')
        )
    )
  );
