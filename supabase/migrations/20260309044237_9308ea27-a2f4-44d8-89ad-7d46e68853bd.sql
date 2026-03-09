-- Notification spéciale admin/modérateur pour chaque nouveau signalement infrastructure
CREATE OR REPLACE FUNCTION public.notify_admins_infrastructure_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Seulement pour les signalements d'infrastructure
  IF NEW.report_category <> 'infrastructure' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, report_id, title, message)
  SELECT
    ur.user_id,
    NEW.id,
    '🛠️ Nouveau signalement infrastructure',
    'Commune: ' || COALESCE(NULLIF(NEW.commune, ''), 'N/A')
    || ' • Quartier: ' || COALESCE(NULLIF(NEW.quartier, ''), 'N/A')
    || ' • Vérifiez rapidement la photo (visibilité/netteté) pour prioriser une action.'
  FROM public.user_roles ur
  WHERE ur.role IN ('admin', 'moderator')
    AND ur.user_id <> NEW.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admins_infrastructure_report ON public.reports;

CREATE TRIGGER trg_notify_admins_infrastructure_report
AFTER INSERT ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.notify_admins_infrastructure_report();