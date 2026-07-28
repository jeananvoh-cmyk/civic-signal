-- ============================================================
-- FIX RELAY CONFIG UPSERT RPC & RLS POLICIES
-- Permet la sauvegarde sans erreur de la configuration par l'admin
-- ============================================================

-- 1. Donner des valeurs par défaut au champ label s'il est omis
ALTER TABLE public.relay_config ALTER COLUMN label SET DEFAULT 'Configuration';

-- 2. Ajouter les politiques RLS INSERT/UPDATE/ALL pour relay_config
DROP POLICY IF EXISTS "Public can insert relay_config" ON public.relay_config;
CREATE POLICY "Public can insert relay_config"
  ON public.relay_config FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update relay_config" ON public.relay_config;
CREATE POLICY "Public can update relay_config"
  ON public.relay_config FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 3. Fonction RPC SECURITY DEFINER pour sauvegarder tous les paramètres en un seul appel atomique
CREATE OR REPLACE FUNCTION public.admin_save_relay_config(p_config jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_key text;
  v_val text;
BEGIN
  FOR v_key, v_val IN SELECT * FROM jsonb_each_text(p_config)
  LOOP
    INSERT INTO public.relay_config (key, value, label, updated_at)
    VALUES (v_key, COALESCE(v_val, ''), v_key, NOW())
    ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        updated_at = NOW();
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_save_relay_config(jsonb) TO authenticated, anon;
