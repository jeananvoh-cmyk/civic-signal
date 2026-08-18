-- ==============================================================================
-- SIGNA-CI : SYSTÈME DE TICKETS ET ADRESSAGE NATIONAL PADA (MCLU)
-- FORMAT TICKET : SIG-[COMMUNE_3L]-[AAAAMMJJ]-[NUMERO_JOUR_4_CHIFFRES]
-- Ex: SIG-COC-20260818-0001
-- ==============================================================================

-- 1. Table des communes et codes PADA officiels (MCLU) & Trigrammes 3 lettres
CREATE TABLE IF NOT EXISTS public.pada_communes (
  id SERIAL PRIMARY KEY,
  code_dept TEXT NOT NULL DEFAULT '002',
  code_sp TEXT NOT NULL,
  code_complet TEXT NOT NULL UNIQUE,
  commune TEXT NOT NULL UNIQUE,
  trigramme VARCHAR(4) NOT NULL UNIQUE
);

-- Communes officielles (sans Brofodoumé)
INSERT INTO public.pada_communes (code_dept, code_sp, code_complet, commune, trigramme) VALUES
('002', '11', '002-11', 'Abobo', 'ABO'),
('002', '12', '002-12', 'Adjamé', 'ADJ'),
('002', '02', '002-02', 'Anyama', 'ANY'),
('002', '13', '002-13', 'Attécoubé', 'ATT'),
('002', '03', '002-03', 'Bingerville', 'BIN'),
('002', '14', '002-14', 'Cocody', 'COC'),
('002', '15', '002-15', 'Koumassi', 'KOU'),
('002', '16', '002-16', 'Marcory', 'MAR'),
('002', '17', '002-17', 'Plateau', 'PLA'),
('002', '18', '002-18', 'Port-Bouët', 'PTB'),
('002', '05', '002-05', 'Songon', 'SON'),
('002', '19', '002-19', 'Treichville', 'TRE'),
('002', '20', '002-20', 'Yopougon', 'YOP'),
('002', '21', '002-21', 'Grand-Bassam', 'BAS')
ON CONFLICT (commune) DO UPDATE SET
  code_complet = EXCLUDED.code_complet,
  trigramme = EXCLUDED.trigramme;

-- 2. Table du répertoire des voies PADA (Direction de l'Adressage MCLU)
CREATE TABLE IF NOT EXISTS public.pada_voies (
  id SERIAL PRIMARY KEY,
  id_voie INTEGER NOT NULL,
  commune TEXT NOT NULL,
  commune_code TEXT NOT NULL,
  quartier TEXT NOT NULL,
  denomination TEXT NOT NULL,
  lineaire_ml INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_pada_voie UNIQUE(commune, id_voie, denomination)
);

CREATE INDEX IF NOT EXISTS idx_pada_voies_commune_quartier ON public.pada_voies(commune, quartier);
CREATE INDEX IF NOT EXISTS idx_pada_voies_denomination ON public.pada_voies(denomination);

-- 3. Ajout des colonnes Tickets & PADA sur la table `reports`
ALTER TABLE public.reports 
  ADD COLUMN IF NOT EXISTS ticket_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS pada_commune_code TEXT,
  ADD COLUMN IF NOT EXISTS pada_id_voie INTEGER,
  ADD COLUMN IF NOT EXISTS pada_street_name TEXT,
  ADD COLUMN IF NOT EXISTS pada_formatted_address TEXT;

CREATE INDEX IF NOT EXISTS idx_reports_ticket_code ON public.reports(ticket_code);

-- 4. Fonction de génération automatique de ticket_code
-- Format : SIG-[TRIGRAMME_3L]-[AAAAMMJJ]-[NUMERO_JOUR_4_CHIFFRES]
CREATE OR REPLACE FUNCTION public.generate_sig_ticket_code(
  p_commune TEXT,
  p_created_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TEXT AS $$
DECLARE
  v_trigramme TEXT;
  v_date_str TEXT;
  v_seq INT;
  v_ticket TEXT;
BEGIN
  -- Trigramme selon la commune
  SELECT trigramme INTO v_trigramme
  FROM public.pada_communes
  WHERE LOWER(TRIM(commune)) = LOWER(TRIM(p_commune))
  LIMIT 1;

  IF v_trigramme IS NULL THEN
    v_trigramme := UPPER(SUBSTRING(REGEXP_REPLACE(p_commune, '[^a-zA-Z]', '', 'g') FROM 1 FOR 3));
    IF LENGTH(v_trigramme) < 3 THEN
      v_trigramme := 'CIV';
    END IF;
  END IF;

  -- Date UTC au format AAAAMMJJ
  v_date_str := to_char(p_created_at AT TIME ZONE 'UTC', 'YYYYMMDD');

  -- Séquence journalière pour cette date
  SELECT COUNT(*) + 1 INTO v_seq
  FROM public.reports
  WHERE to_char(created_at AT TIME ZONE 'UTC', 'YYYYMMDD') = v_date_str;

  v_ticket := 'SIG-' || v_trigramme || '-' || v_date_str || '-' || LPAD(v_seq::TEXT, 4, '0');
  RETURN v_ticket;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger BEFORE INSERT sur `reports` pour assigner automatiquement le ticket et code PADA
CREATE OR REPLACE FUNCTION public.trg_assign_report_ticket_and_pada()
RETURNS TRIGGER AS $$
DECLARE
  v_pada_code TEXT;
BEGIN
  -- 1. Assigner le code PADA commune si non fourni
  IF NEW.pada_commune_code IS NULL AND NEW.commune IS NOT NULL THEN
    SELECT code_complet INTO v_pada_code
    FROM public.pada_communes
    WHERE LOWER(TRIM(commune)) = LOWER(TRIM(NEW.commune))
    LIMIT 1;
    NEW.pada_commune_code := v_pada_code;
  END IF;

  -- 2. Assigner le ticket_code si non fourni
  IF NEW.ticket_code IS NULL AND NEW.commune IS NOT NULL THEN
    NEW.ticket_code := public.generate_sig_ticket_code(NEW.commune, COALESCE(NEW.created_at, NOW()));
  END IF;

  -- 3. Formater l'adresse PADA si voie présente
  IF NEW.pada_street_name IS NOT NULL AND NEW.pada_formatted_address IS NULL THEN
    NEW.pada_formatted_address := NEW.pada_street_name || ' ' || COALESCE(NEW.pada_commune_code, '') || ', Abidjan - ' || NEW.commune || ' (' || COALESCE(NEW.quartier, '') || ')';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_reports_ticket_pada ON public.reports;
CREATE TRIGGER trg_reports_ticket_pada
BEFORE INSERT ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.trg_assign_report_ticket_and_pada();

-- 6. Rétroactivité : Assigner un ticket_code et pada_commune_code à tous les signalements existants
DO $$
DECLARE
  r RECORD;
  v_trigramme TEXT;
  v_date_str TEXT;
  v_seq INT;
  v_ticket TEXT;
  v_pada_code TEXT;
BEGIN
  FOR r IN 
    SELECT id, commune, created_at 
    FROM public.reports 
    ORDER BY created_at ASC 
  LOOP
    SELECT trigramme, code_complet INTO v_trigramme, v_pada_code
    FROM public.pada_communes
    WHERE LOWER(TRIM(commune)) = LOWER(TRIM(r.commune))
    LIMIT 1;

    IF v_trigramme IS NULL THEN
      v_trigramme := UPPER(SUBSTRING(REGEXP_REPLACE(r.commune, '[^a-zA-Z]', '', 'g') FROM 1 FOR 3));
      IF LENGTH(v_trigramme) < 3 THEN v_trigramme := 'CIV'; END IF;
    END IF;

    v_date_str := to_char(r.created_at AT TIME ZONE 'UTC', 'YYYYMMDD');

    SELECT COUNT(*) + 1 INTO v_seq
    FROM public.reports
    WHERE to_char(created_at AT TIME ZONE 'UTC', 'YYYYMMDD') = v_date_str
      AND ticket_code IS NOT NULL;

    v_ticket := 'SIG-' || v_trigramme || '-' || v_date_str || '-' || LPAD(v_seq::TEXT, 4, '0');

    UPDATE public.reports
    SET ticket_code = v_ticket,
        pada_commune_code = COALESCE(pada_commune_code, v_pada_code)
    WHERE id = r.id;
  END LOOP;
END $$;
