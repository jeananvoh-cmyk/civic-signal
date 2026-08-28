-- ==============================================================================
-- CIVICDATA CI - SCHEMA SUPABASE SQL COMPLET AVEC ROW LEVEL SECURITY (RLS)
-- Plateforme Civic Tech de Suivi Citoyen du Budget & des Infrastructures en Côte d'Ivoire
-- ==============================================================================

-- 1. EXTENSIONS & CONFIGURATION
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TYPES ENUMÉRÉS
CREATE TYPE user_role AS ENUM ('ADMIN', 'MODERATOR', 'DATA_MANAGER', 'CITIZEN');
CREATE TYPE institution_type AS ENUM ('MAIRIE', 'REGION', 'DISTRICT', 'MINISTERE');
CREATE TYPE project_status AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');
CREATE TYPE verification_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE expense_nature AS ENUM ('Investissements', 'Transferts', 'Personnel');

-- 3. TABLE DES PROFILS UTILISATEURS (RBAC)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    role user_role DEFAULT 'CITIZEN',
    commune_interest TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. TABLE DES INSTITUTIONS PUBLIQUES
CREATE TABLE IF NOT EXISTS institutions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type institution_type NOT NULL,
    region TEXT NOT NULL,
    district TEXT,
    departement TEXT,
    address TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    website TEXT,
    -- Responsable de l'Information (RI) - Loi d'accès à l'information publique
    info_officer_name TEXT,
    info_officer_email TEXT,
    info_officer_phone TEXT,
    info_officer_title TEXT DEFAULT 'Responsable de l''Information et des Relations Publiques',
    green_line_number TEXT,
    -- Répartition budgétaire annuelle 2026
    budget_functioning_fcfa NUMERIC(15, 2) DEFAULT 0,
    budget_investment_fcfa NUMERIC(15, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. TABLE DES PROJETS BUDGÉTAIRES (Dotations Communes, Régions, Loi de Finances)
CREATE TABLE IF NOT EXISTS budget_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES institutions(id) ON DELETE SET NULL,
    commune_name TEXT NOT NULL,
    region_name TEXT NOT NULL,
    district_name TEXT,
    departement_name TEXT,
    category TEXT NOT NULL, -- Santé, Éducation, Eau, Voirie, Logement, Électrification, etc.
    nature_expense expense_nature NOT NULL DEFAULT 'Investissements',
    sub_nature_expense TEXT,
    title TEXT NOT NULL,
    details TEXT,
    budget_amount_fcfa NUMERIC(15, 2) NOT NULL,
    fiscal_year INTEGER NOT NULL DEFAULT 2026,
    current_status project_status DEFAULT 'IN_PROGRESS',
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    contractor_name TEXT,
    target_delivery_date DATE,
    locality_village_neighborhood TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. TABLE DES PREUVES & SIGNALEMENTS CITOYENS (Module 3 - Observatoire Terrain)
CREATE TABLE IF NOT EXISTS citizen_proofs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES budget_projects(id) ON DELETE CASCADE,
    citizen_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    image_url TEXT NOT NULL,
    citizen_status_claim project_status NOT NULL,
    comment TEXT NOT NULL,
    locality_details TEXT,
    geo_latitude NUMERIC(10, 7),
    geo_longitude NUMERIC(10, 7),
    verification_status verification_status DEFAULT 'PENDING',
    moderator_notes TEXT,
    moderated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    moderated_at TIMESTAMP WITH TIME ZONE,
    confirmations_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. TABLE DES CONFIRMATIONS / UPVOTES CITOYENS
CREATE TABLE IF NOT EXISTS proof_confirmations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proof_id UUID NOT NULL REFERENCES citizen_proofs(id) ON DELETE CASCADE,
    user_identifier TEXT NOT NULL, -- User UUID or IP hash
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(proof_id, user_identifier)
);

-- 8. INDEX POUR PERFORMANCES OPTIMALES
CREATE INDEX IF NOT EXISTS idx_budget_projects_commune ON budget_projects(commune_name);
CREATE INDEX IF NOT EXISTS idx_budget_projects_region ON budget_projects(region_name);
CREATE INDEX IF NOT EXISTS idx_budget_projects_category ON budget_projects(category);
CREATE INDEX IF NOT EXISTS idx_budget_projects_status ON budget_projects(current_status);
CREATE INDEX IF NOT EXISTS idx_citizen_proofs_project ON citizen_proofs(project_id);
CREATE INDEX IF NOT EXISTS idx_citizen_proofs_verification ON citizen_proofs(verification_status);
CREATE INDEX IF NOT EXISTS idx_institutions_type ON institutions(type);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Activation du RLS sur toutes les tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE citizen_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE proof_confirmations ENABLE ROW LEVEL SECURITY;

-- Helper function to check admin/moderator role
CREATE OR REPLACE FUNCTION public.is_admin_or_moderator()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role IN ('ADMIN', 'MODERATOR', 'DATA_MANAGER')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. POLICIES POUR PROFILES
CREATE POLICY "Public profiles are viewable by everyone."
    ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile."
    ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile."
    ON profiles FOR UPDATE USING (auth.uid() = id);

-- 2. POLICIES POUR INSTITUTIONS
CREATE POLICY "Institutions are viewable by everyone."
    ON institutions FOR SELECT USING (true);

CREATE POLICY "Admins and Data Managers can insert institutions."
    ON institutions FOR INSERT WITH CHECK (is_admin_or_moderator());

CREATE POLICY "Admins and Data Managers can update institutions."
    ON institutions FOR UPDATE USING (is_admin_or_moderator());

CREATE POLICY "Admins and Data Managers can delete institutions."
    ON institutions FOR DELETE USING (is_admin_or_moderator());

-- 3. POLICIES POUR BUDGET_PROJECTS
CREATE POLICY "Budget projects are viewable by everyone."
    ON budget_projects FOR SELECT USING (true);

CREATE POLICY "Admins and Data Managers can insert budget projects."
    ON budget_projects FOR INSERT WITH CHECK (is_admin_or_moderator());

CREATE POLICY "Admins and Data Managers can update budget projects."
    ON budget_projects FOR UPDATE USING (is_admin_or_moderator());

CREATE POLICY "Admins and Data Managers can delete budget projects."
    ON budget_projects FOR DELETE USING (is_admin_or_moderator());

-- 4. POLICIES POUR CITIZEN_PROOFS
-- Public can view APPROVED proofs, Admins/Moderators can view ALL proofs (including PENDING & REJECTED)
CREATE POLICY "Approved citizen proofs are viewable by everyone."
    ON citizen_proofs FOR SELECT
    USING (verification_status = 'APPROVED' OR is_admin_or_moderator() OR (auth.uid() IS NOT NULL AND citizen_user_id = auth.uid()));

-- Anyone (authenticated or public) can submit a proof (it starts as PENDING)
CREATE POLICY "Anyone can submit a citizen proof."
    ON citizen_proofs FOR INSERT
    WITH CHECK (verification_status = 'PENDING');

-- Admins and Moderators can update proofs (Approve / Reject / Add moderator notes)
CREATE POLICY "Admins and Moderators can update proofs."
    ON citizen_proofs FOR UPDATE
    USING (is_admin_or_moderator());

-- Admins can delete proofs
CREATE POLICY "Admins can delete citizen proofs."
    ON citizen_proofs FOR DELETE
    USING (is_admin_or_moderator());

-- 5. POLICIES POUR PROOF_CONFIRMATIONS
CREATE POLICY "Confirmations are viewable by everyone."
    ON proof_confirmations FOR SELECT USING (true);

CREATE POLICY "Anyone can insert a confirmation."
    ON proof_confirmations FOR INSERT WITH CHECK (true);

-- ==============================================================================
-- STORAGE BUCKET CONFIGURATION (Pour les photos citoyennes)
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('citizen_photos', 'citizen_photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Citizen photos are publicly accessible"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'citizen_photos');

CREATE POLICY "Anyone can upload citizen photos"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'citizen_photos');
