-- ==============================================================================
-- SIGNA-CI : BOUCLE DE RETOUR OPÉRATEURS & HISTORIQUE DES CHANGEMENTS DE STATUT
-- Supporte : CIE, SODECI, MAIRIES (14 communes), ONEP, ANARE-CI
-- ==============================================================================

-- 1. Table d'historique chronologique des statuts et interventions opérateurs
CREATE TABLE IF NOT EXISTS public.report_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  ticket_code TEXT,
  old_status TEXT,
  new_status TEXT NOT NULL,
  operator_name TEXT, -- ex: 'CIE', 'SODECI', 'MAIRIE_COCODY', 'ANARE-CI', 'ONEP'
  operator_reference TEXT, -- ex: 'CIE-OT-2026-9842'
  public_note TEXT, -- Message public explicatif pour les usagers
  internal_note TEXT, -- Note interne pour les équipes
  estimated_resolution_time TIMESTAMPTZ, -- Date/heure prévisionnelle de résolution
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_status_history_report_id ON public.report_status_history(report_id);
CREATE INDEX IF NOT EXISTS idx_status_history_ticket_code ON public.report_status_history(ticket_code);
CREATE INDEX IF NOT EXISTS idx_status_history_created_at ON public.report_status_history(created_at DESC);

ALTER TABLE public.report_status_history ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut voir l'historique public des statuts d'un signalement
DROP POLICY IF EXISTS "Public status history is viewable by everyone" ON public.report_status_history;
CREATE POLICY "Public status history is viewable by everyone"
  ON public.report_status_history FOR SELECT
  USING (true);

-- Insertion autorisée pour les partenaires et administrateurs
DROP POLICY IF EXISTS "Partners and admins can insert status history" ON public.report_status_history;
CREATE POLICY "Partners and admins can insert status history"
  ON public.report_status_history FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'partner') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'moderator')
  );

-- 2. Enrichissement de la table `reports` avec les métadonnées opérateur
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS operator_name TEXT,
  ADD COLUMN IF NOT EXISTS operator_reference TEXT,
  ADD COLUMN IF NOT EXISTS estimated_resolution_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS operator_last_note TEXT;

-- 3. Fonction de notification des parties prenantes (Fan-out Citoyens)
-- Notifie l'auteur, tous les corroborateurs, et tous les citoyens ayant voté en soutien
CREATE OR REPLACE FUNCTION public.notify_report_stakeholders(
  p_report_id UUID,
  p_title TEXT,
  p_message TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report public.reports%ROWTYPE;
  v_stakeholder_ids UUID[];
  v_uid UUID;
  v_count INTEGER := 0;
BEGIN
  -- Récupérer le signalement
  SELECT * INTO v_report FROM public.reports WHERE id = p_report_id;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Rassembler tous les IDs d'utilisateurs concernés :
  -- 1. Auteur initial
  -- 2. Citoyens ayant corroboré (coupures)
  -- 3. Citoyens ayant voté en soutien (infrastructures)
  SELECT ARRAY(
    SELECT DISTINCT user_id FROM (
      SELECT user_id FROM public.reports WHERE id = p_report_id AND user_id IS NOT NULL
      UNION
      SELECT user_id FROM public.corroborations WHERE report_id = p_report_id AND user_id IS NOT NULL
      UNION
      SELECT user_id FROM public.report_support_votes WHERE report_id = p_report_id AND user_id IS NOT NULL
    ) sub
  ) INTO v_stakeholder_ids;

  -- Insérer une notification in-app pour chaque utilisateur
  IF v_stakeholder_ids IS NOT NULL AND array_length(v_stakeholder_ids, 1) > 0 THEN
    FOREACH v_uid IN ARRAY v_stakeholder_ids LOOP
      INSERT INTO public.notifications (user_id, report_id, title, message)
      VALUES (v_uid, p_report_id, p_title, p_message);
      v_count := v_count + 1;
    END LOOP;
  END IF;

  RETURN v_count;
END;
$$;

-- 4. RPC globale de mise à jour de statut par opérateur ou partenaire
-- Accessible soit par ticket_code ('SIG-COC-20260818-0001'), soit par report_id
CREATE OR REPLACE FUNCTION public.operator_update_ticket(
  p_ticket_code TEXT DEFAULT NULL,
  p_report_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT 'processing',
  p_operator_name TEXT DEFAULT NULL,
  p_operator_reference TEXT DEFAULT NULL,
  p_public_note TEXT DEFAULT NULL,
  p_estimated_resolution TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report public.reports%ROWTYPE;
  v_old_status TEXT;
  v_status_title TEXT;
  v_status_msg TEXT;
  v_caller_id UUID := auth.uid();
  v_notif_count INTEGER := 0;
  v_op_name TEXT;
BEGIN
  -- 1. Valider le statut
  IF p_status NOT IN ('active', 'processing', 'resolved', 'rejected', 'cancelled') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Statut invalide. Valeurs acceptées: active, processing, resolved, rejected, cancelled');
  END IF;

  -- 2. Trouver le signalement
  IF p_ticket_code IS NOT NULL AND TRIM(p_ticket_code) <> '' THEN
    SELECT * INTO v_report FROM public.reports WHERE ticket_code = UPPER(TRIM(p_ticket_code));
  ELSIF p_report_id IS NOT NULL THEN
    SELECT * INTO v_report FROM public.reports WHERE id = p_report_id;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Veuillez fournir ticket_code ou report_id');
  END IF;

  IF v_report.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Signalement introuvable');
  END IF;

  v_old_status := v_report.status;
  v_op_name := COALESCE(p_operator_name, v_report.operator_name, 'Opérateur Technique');

  -- 3. Mettre à jour la table reports
  UPDATE public.reports
  SET
    status = p_status,
    operator_name = COALESCE(p_operator_name, operator_name),
    operator_reference = COALESCE(p_operator_reference, operator_reference),
    estimated_resolution_time = COALESCE(p_estimated_resolution, estimated_resolution_time),
    operator_last_note = COALESCE(p_public_note, operator_last_note),
    resolved_at = CASE WHEN p_status = 'resolved' THEN NOW() ELSE resolved_at END,
    updated_at = NOW()
  WHERE id = v_report.id;

  -- 4. Enregistrer dans l'historique
  INSERT INTO public.report_status_history (
    report_id,
    ticket_code,
    old_status,
    new_status,
    operator_name,
    operator_reference,
    public_note,
    estimated_resolution_time,
    created_by
  ) VALUES (
    v_report.id,
    v_report.ticket_code,
    v_old_status,
    p_status,
    v_op_name,
    p_operator_reference,
    p_public_note,
    p_estimated_resolution,
    v_caller_id
  );

  -- 5. Préparer les messages de notification
  IF p_status = 'processing' THEN
    v_status_title := '🛠️ Ticket ' || COALESCE(v_report.ticket_code, '') || ' : Pris en charge';
    v_status_msg := v_op_name || ' a pris en charge le signalement à ' || v_report.commune || ' (' || v_report.quartier || ').';
    IF p_operator_reference IS NOT NULL THEN
      v_status_msg := v_status_msg || ' Réf. intervention : ' || p_operator_reference || '.';
    END IF;
    IF p_public_note IS NOT NULL THEN
      v_status_msg := v_status_msg || ' Note : "' || p_public_note || '"';
    END IF;
  ELSIF p_status = 'resolved' THEN
    v_status_title := '✅ Ticket ' || COALESCE(v_report.ticket_code, '') || ' : Résolu';
    v_status_msg := 'L''incident à ' || v_report.commune || ' (' || v_report.quartier || ') a été marqué comme résolu par ' || v_op_name || '.';
    IF p_public_note IS NOT NULL THEN
      v_status_msg := v_status_msg || ' Note : "' || p_public_note || '"';
    END IF;
  ELSIF p_status = 'rejected' THEN
    v_status_title := 'ℹ️ Ticket ' || COALESCE(v_report.ticket_code, '') || ' : Non retenu';
    v_status_msg := 'Le signalement à ' || v_report.commune || ' n''a pas pu être validé par ' || v_op_name || '.';
    IF p_public_note IS NOT NULL THEN
      v_status_msg := v_status_msg || ' Motif : "' || p_public_note || '"';
    END IF;
  ELSE
    v_status_title := '🔄 Ticket ' || COALESCE(v_report.ticket_code, '') || ' : Statut mis à jour';
    v_status_msg := 'Le statut a été modifié vers : ' || p_status || '.';
  END IF;

  -- 6. Diffuser les notifications aux citoyens concernés
  v_notif_count := public.notify_report_stakeholders(v_report.id, v_status_title, v_status_msg);

  RETURN jsonb_build_object(
    'success', true,
    'report_id', v_report.id,
    'ticket_code', v_report.ticket_code,
    'old_status', v_old_status,
    'new_status', p_status,
    'operator_name', v_op_name,
    'operator_reference', p_operator_reference,
    'stakeholders_notified', v_notif_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.operator_update_ticket TO authenticated, service_role;
