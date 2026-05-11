-- Politique DELETE : un utilisateur peut retirer sa propre confirmation de réparation
CREATE POLICY "Users can delete own repair confirmations"
ON public.repair_confirmations FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- RPC pour annuler sa confirmation de réparation
CREATE OR REPLACE FUNCTION public.cancel_repair(p_report_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié.';
  END IF;

  -- Vérifie que la confirmation existe bien
  IF NOT EXISTS (
    SELECT 1 FROM public.repair_confirmations
    WHERE report_id = p_report_id AND user_id = v_caller_id
  ) THEN
    RAISE EXCEPTION 'Aucune confirmation à annuler.';
  END IF;

  DELETE FROM public.repair_confirmations
  WHERE report_id = p_report_id AND user_id = v_caller_id;

  -- Décrémente le compteur (min 0)
  UPDATE public.reports
  SET repair_verifications = GREATEST(0, repair_verifications - 1)
  WHERE id = p_report_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_repair TO authenticated;
