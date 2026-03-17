-- Fonction sécurisée permettant à un partenaire de mettre à jour le statut
-- d'un signalement qui le concerne. Seuls 'processing' et 'resolved' sont autorisés.
CREATE OR REPLACE FUNCTION public.partner_update_report_status(
  p_report_id UUID,
  p_status TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report reports%ROWTYPE;
  v_partner partner_profiles%ROWTYPE;
BEGIN
  -- Vérifier que l'appelant est bien un partenaire
  IF NOT public.has_role(auth.uid(), 'partner') THEN
    RAISE EXCEPTION 'Accès refusé : rôle partenaire requis';
  END IF;

  -- Valider le statut cible
  IF p_status NOT IN ('processing', 'resolved', 'active') THEN
    RAISE EXCEPTION 'Statut invalide. Valeurs autorisées : processing, resolved, active';
  END IF;

  -- Charger le rapport
  SELECT * INTO v_report FROM reports WHERE id = p_report_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Signalement introuvable';
  END IF;

  -- Charger le profil partenaire
  SELECT * INTO v_partner FROM partner_profiles WHERE user_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profil partenaire introuvable';
  END IF;

  -- Vérifier que ce rapport concerne bien ce partenaire
  IF NOT (
    (v_partner.partner_type = 'cie'    AND v_report.service_type = 'electricity') OR
    (v_partner.partner_type = 'sodeci' AND v_report.service_type = 'water') OR
    (v_partner.partner_type = 'mairie' AND v_report.report_category = 'infrastructure' AND v_partner.commune = v_report.commune) OR
    v_partner.partner_type IN ('ngo', 'other')
  ) THEN
    RAISE EXCEPTION 'Ce signalement ne relève pas de votre périmètre';
  END IF;

  -- Mettre à jour le statut
  UPDATE reports
  SET
    status = p_status,
    resolved_at = CASE WHEN p_status = 'resolved' THEN now() ELSE NULL END,
    updated_at = now()
  WHERE id = p_report_id;
END;
$$;
