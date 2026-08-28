-- Migration de Durcissement Phase 0 & Phase 1 — SIGNA-CI Audit Remediation
-- Contient la sécurisation RLS profiles/reports, l'anonymisation de compte (SEC-1249) et les RPCs atomiques.

-- 1. Sécurisation RLS profiles (SEC-1201) : interdire la modification autonome de user_type, role, partner_type, is_admin
CREATE OR REPLACE FUNCTION public.protect_profile_restricted_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Seul un admin ou le service_role peut modifier les champs d'habilitation
  IF (
    OLD.user_type IS DISTINCT FROM NEW.user_type OR
    OLD.role IS DISTINCT FROM NEW.role OR
    OLD.partner_type IS DISTINCT FROM NEW.partner_type OR
    OLD.is_admin IS DISTINCT FROM NEW.is_admin
  ) THEN
    IF NOT public.has_role(auth.uid(), 'admin') AND current_setting('role', true) != 'service_role' THEN
      NEW.user_type := OLD.user_type;
      NEW.role := OLD.role;
      NEW.partner_type := OLD.partner_type;
      NEW.is_admin := OLD.is_admin;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_protect_profile_restricted_fields ON public.profiles;
CREATE TRIGGER tr_protect_profile_restricted_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_restricted_fields();

-- 2. Sécurisation RLS reports (SEC-1202 à SEC-1207) : interdire aux citoyens la modification des statuts, géolocalisations et compteurs
CREATE OR REPLACE FUNCTION public.protect_report_citizen_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Si la modification est effectuée par l'auteur du signalement (non admin / non opérateur)
  IF (auth.uid() = OLD.user_id) AND NOT public.has_role(auth.uid(), 'admin') AND current_setting('role', true) != 'service_role' THEN
    -- Restreindre la modification aux seuls champs libres (description, photo_urls, quartier_id)
    NEW.status := OLD.status;
    NEW.resolved_at := OLD.resolved_at;
    NEW.verifications := OLD.verifications;
    NEW.reminder_count := OLD.reminder_count;
    NEW.reporter_type := OLD.reporter_type;
    NEW.service_type := OLD.service_type;
    NEW.latitude := OLD.latitude;
    NEW.longitude := OLD.longitude;
    NEW.commune := OLD.commune;
    NEW.report_category := OLD.report_category;
    NEW.urgency := OLD.urgency;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_protect_report_citizen_fields ON public.reports;
CREATE TRIGGER tr_protect_report_citizen_fields
  BEFORE UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_report_citizen_fields();

-- 3. Anonymisation irréversible lors de la suppression de compte (SEC-1249)
CREATE OR REPLACE FUNCTION public.delete_user_account_data(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Vérifier que l'utilisateur supprime son propre compte ou qu'un admin/service_role l'exécute
  IF auth.uid() != p_user_id AND NOT public.has_role(auth.uid(), 'admin') AND current_setting('role', true) != 'service_role' THEN
    RAISE EXCEPTION 'Non autorisé à supprimer ce compte';
  END IF;

  -- 1. Anonymiser les signalements publics : conserver la réalité terrain du quartier tout en rompant le lien de propriété
  UPDATE public.reports
  SET user_id = NULL,
      reporter_phone = NULL,
      meter_number = NULL
  WHERE user_id = p_user_id;

  -- 2. Purger les abonnements push et préférences de notifications
  DELETE FROM public.push_subscriptions WHERE user_id = p_user_id;
  DELETE FROM public.commune_subscriptions WHERE user_id = p_user_id;

  -- 3. Supprimer le profil personnel et les métadonnées identifiantes
  DELETE FROM public.partner_profiles WHERE user_id = p_user_id;
  DELETE FROM public.user_roles WHERE user_id = p_user_id;
  DELETE FROM public.profiles WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.delete_user_account_data(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_account_data(UUID) TO authenticated, service_role;

-- 4. RPC Atomique de confirmation "Toujours en cours" avec cooldown (SEC-1266)
CREATE OR REPLACE FUNCTION public.confirm_report_still_ongoing(p_report_id UUID)
RETURNS VOID AS $$
DECLARE
  v_last_reminder TIMESTAMPTZ;
BEGIN
  SELECT last_reminder_at INTO v_last_reminder
  FROM public.reports
  WHERE id = p_report_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Signalement introuvable';
  END IF;

  -- Cooldown d'une heure minimum entre deux relances
  IF v_last_reminder IS NOT NULL AND (now() - v_last_reminder) < INTERVAL '1 hour' THEN
    RAISE EXCEPTION 'Vous avez déjà relancé ce signalement récemment';
  END IF;

  UPDATE public.reports
  SET reminder_count = COALESCE(reminder_count, 0) + 1,
      last_reminder_at = now()
  WHERE id = p_report_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.confirm_report_still_ongoing(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_report_still_ongoing(UUID) TO authenticated, service_role;

-- 5. RPC Atomiques sécurisées pour les commentaires (SEC-1253)
CREATE OR REPLACE FUNCTION public.add_report_comment(p_report_id UUID, p_content TEXT)
RETURNS UUID AS $$
DECLARE
  v_comment_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non authentifié';
  END IF;

  IF trim(p_content) = '' THEN
    RAISE EXCEPTION 'Le commentaire ne peut pas être vide';
  END IF;

  INSERT INTO public.report_comments (report_id, user_id, content)
  VALUES (p_report_id, auth.uid(), trim(p_content))
  RETURNING id INTO v_comment_id;

  RETURN v_comment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.add_report_comment(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_report_comment(UUID, TEXT) TO authenticated, service_role;
