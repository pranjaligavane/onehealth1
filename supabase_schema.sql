-- =============================================================================
-- ONEHEALTH AI - SUPABASE POSTGRESQL DATABASE SCHEMA & MIGRATION SCRIPT
-- Run this script in your Supabase Project -> SQL Editor to initialize all tables,
-- Row Level Security (RLS) policies, indexes, and realtime subscriptions.
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. USERS & HEALTHCARE WORKERS TABLE
--    Linked to Supabase Auth (auth.users) via UUID
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(30) DEFAULT 'patient', -- patient, health_worker, doctor, vet, admin
    village VARCHAR(100) DEFAULT 'Kopargaon',
    phone VARCHAR(20),
    specialization VARCHAR(100),    -- e.g. MBBS General Physician, BVSc Veterinary Officer
    medical_reg_no VARCHAR(50),     -- For doctors & vets
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.users IS 'OneHealth AI user profiles, linked 1-to-1 with Supabase Auth accounts.';

-- =============================================================================
-- 2. CLINICAL & VETERINARY SCREENING CASES
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.cases (
    id VARCHAR(64) PRIMARY KEY, -- Client-generated ID e.g. CASE-XXXX
    case_type VARCHAR(30) NOT NULL, -- human_general, child_development, livestock
    subject_name VARCHAR(100) NOT NULL,
    age_or_dob VARCHAR(50),
    gender_or_sex VARCHAR(20),
    species VARCHAR(50) DEFAULT 'Human',
    tag_or_id VARCHAR(50),
    guardian_or_owner VARCHAR(100),
    contact_phone VARCHAR(20),
    village VARCHAR(100) DEFAULT 'Kopargaon',
    location_gps VARCHAR(100),
    risk_level VARCHAR(20) DEFAULT 'GREEN', -- GREEN, YELLOW, ORANGE, RED
    triage_summary TEXT,
    primary_condition VARCHAR(150),
    confidence_score FLOAT DEFAULT 0.85,
    data_payload JSONB,
    images JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(30) DEFAULT 'screened', -- screened, escalated, reviewed, resolved
    assigned_role VARCHAR(30), -- doctor, vet
    assigned_doctor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL, -- patient or health worker who created
    client_created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    server_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_synced BOOLEAN DEFAULT TRUE
);

-- Indexes for lightning fast lookups
CREATE INDEX IF NOT EXISTS idx_cases_type ON public.cases(case_type);
CREATE INDEX IF NOT EXISTS idx_cases_risk ON public.cases(risk_level);
CREATE INDEX IF NOT EXISTS idx_cases_village ON public.cases(village);
CREATE INDEX IF NOT EXISTS idx_cases_created ON public.cases(client_created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cases_created_by ON public.cases(created_by);

-- =============================================================================
-- 3. DOCTOR & VET CLINICAL REVIEWS / TELE-PRESCRIPTIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.clinical_reviews (
    id SERIAL PRIMARY KEY,
    case_id VARCHAR(64) NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Auth-linked reviewer
    reviewer_name VARCHAR(100) NOT NULL,
    reviewer_role VARCHAR(30) NOT NULL, -- doctor, vet
    reviewer_notes TEXT NOT NULL,
    prescribed_treatment TEXT,
    escalation_instructions TEXT,
    verified_risk_level VARCHAR(20),
    is_urgent_referral BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_case_id ON public.clinical_reviews(case_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON public.clinical_reviews(reviewer_id);

-- =============================================================================
-- 4. EPIDEMIC & OUTBREAK SURVEILLANCE ALERTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.outbreak_alerts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    disease VARCHAR(100) NOT NULL,
    target_group VARCHAR(50) NOT NULL,
    village VARCHAR(100) NOT NULL,
    severity VARCHAR(20) DEFAULT 'WARNING', -- WARNING, CRITICAL, RESOLVED
    description TEXT NOT NULL,
    precautions TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- 5. VERIFIED DOCTOR & VETERINARY PROFILES DIRECTORY
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.doctor_profiles (
    id VARCHAR(50) PRIMARY KEY, -- e.g. DOC-001, VET-001
    user_id UUID UNIQUE REFERENCES public.users(id) ON DELETE CASCADE, -- Auth-linked user
    role VARCHAR(20) DEFAULT 'doctor', -- doctor, vet
    name VARCHAR(100) NOT NULL,
    title VARCHAR(100) NOT NULL,
    medical_reg_no VARCHAR(50),
    education VARCHAR(200) NOT NULL,
    experience_years INTEGER DEFAULT 5,
    specialization VARCHAR(150),
    consultation_fee VARCHAR(100) NOT NULL,
    clinic_name VARCHAR(150) NOT NULL,
    village VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) DEFAULT '423601',
    address TEXT NOT NULL,
    phone VARCHAR(30) NOT NULL,
    whatsapp VARCHAR(30),
    opd_timings VARCHAR(150) NOT NULL,
    languages VARCHAR(150) DEFAULT 'Marathi, Hindi, English',
    facilities TEXT,
    lat FLOAT,
    lng FLOAT,
    availability_state VARCHAR(20) DEFAULT 'AVAILABLE', -- AVAILABLE, BUSY, OFFLINE, UNKNOWN
    last_status_time VARCHAR(50),
    verified BOOLEAN DEFAULT FALSE -- requires admin verification for auth-registered doctors
);

CREATE INDEX IF NOT EXISTS idx_doc_role_village ON public.doctor_profiles(role, village);
CREATE INDEX IF NOT EXISTS idx_doc_user_id ON public.doctor_profiles(user_id);

-- =============================================================================
-- 6. EKACARE BODHI-S CLINICAL KNOWLEDGE GRAPH
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.clinical_knowledge (
    id VARCHAR(50) PRIMARY KEY, -- e.g. BODHI-0001
    symptom VARCHAR(200) NOT NULL,
    raw_symptom_text TEXT,
    condition VARCHAR(200) NOT NULL,
    attributes JSONB DEFAULT '{}'::jsonb,
    source VARCHAR(100) DEFAULT 'EkaCare/BODHI-S',
    verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_symptom ON public.clinical_knowledge(symptom);
CREATE INDEX IF NOT EXISTS idx_knowledge_condition ON public.clinical_knowledge(condition);

-- =============================================================================
-- 7. SYNC AUDIT LOGS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.sync_logs (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(100),
    cases_synced_count INTEGER DEFAULT 0,
    client_timestamp TIMESTAMP WITH TIME ZONE,
    server_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(30) DEFAULT 'SUCCESS'
);

-- =============================================================================
-- TRIGGER: Auto-create public.users on Supabase Auth sign-up
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role TEXT;
    user_name TEXT;
    user_phone TEXT;
    user_village TEXT;
    user_specialization TEXT;
    user_reg_no TEXT;
    new_doc_id TEXT;
    new_clinic TEXT;
    new_fee TEXT;
    new_opd TEXT;
    new_address TEXT;
BEGIN
    -- Extract metadata from auth.users
    user_role      := COALESCE(NEW.raw_user_meta_data->>'role', 'patient');
    user_name      := COALESCE(NEW.raw_user_meta_data->>'name', NEW.email);
    user_phone     := COALESCE(NEW.raw_user_meta_data->>'phone', '');
    user_village   := COALESCE(NEW.raw_user_meta_data->>'village', 'Kopargaon');
    user_specialization := COALESCE(NEW.raw_user_meta_data->>'specialization', '');
    user_reg_no    := COALESCE(NEW.raw_user_meta_data->>'medical_reg_no', '');

    -- Insert into public.users
    INSERT INTO public.users (id, email, name, role, village, phone, specialization, medical_reg_no)
    VALUES (
        NEW.id,
        NEW.email,
        user_name,
        user_role,
        user_village,
        user_phone,
        user_specialization,
        user_reg_no
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        phone = EXCLUDED.phone,
        specialization = EXCLUDED.specialization,
        medical_reg_no = EXCLUDED.medical_reg_no,
        updated_at = NOW();

    -- If the new user is a doctor or vet, also create a doctor_profiles record
    IF user_role IN ('doctor', 'vet') THEN
        new_doc_id  := CASE WHEN user_role = 'vet' THEN 'VET-' ELSE 'DOC-' END
                       || SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 6);
        new_clinic  := COALESCE(NEW.raw_user_meta_data->>'clinic_name', user_name || ' Clinic');
        new_fee     := COALESCE(NEW.raw_user_meta_data->>'consultation_fee', '₹100');
        new_opd     := COALESCE(NEW.raw_user_meta_data->>'opd_timings', 'Mon-Sat 9am-5pm');
        new_address := COALESCE(NEW.raw_user_meta_data->>'address', user_village);

        INSERT INTO public.doctor_profiles (
            id, user_id, role, name, title, medical_reg_no, education,
            specialization, consultation_fee, clinic_name, village, address,
            phone, opd_timings, verified
        )
        VALUES (
            new_doc_id,
            NEW.id,
            user_role,
            user_name,
            CASE WHEN user_role = 'vet' THEN 'BVSc' ELSE 'MBBS' END,
            user_reg_no,
            user_specialization,
            user_specialization,
            new_fee,
            new_clinic,
            user_village,
            new_address,
            user_phone,
            new_opd,
            FALSE -- pending admin verification
        )
        ON CONFLICT (user_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

-- Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_new_user();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outbreak_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- --- Users Table ---
-- Users can read and update only their own profile
CREATE POLICY "Users can view own profile"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id);

-- Allow trigger to insert new users
CREATE POLICY "Allow system insert users"
    ON public.users FOR INSERT
    WITH CHECK (true);

-- Allow reading all doctors/vets (for directory)
CREATE POLICY "Public can read doctor user profiles"
    ON public.users FOR SELECT
    USING (role IN ('doctor', 'vet'));

-- --- Doctor Profiles ---
CREATE POLICY "Allow public read on doctor profiles"
    ON public.doctor_profiles FOR SELECT USING (true);

CREATE POLICY "Doctors can update their own profile"
    ON public.doctor_profiles FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "System can insert doctor profiles"
    ON public.doctor_profiles FOR INSERT
    WITH CHECK (true);

-- --- Clinical Knowledge & Alerts (public reads) ---
CREATE POLICY "Allow public read on clinical knowledge"
    ON public.clinical_knowledge FOR SELECT USING (true);

CREATE POLICY "Allow public read on outbreak alerts"
    ON public.outbreak_alerts FOR SELECT USING (true);

-- --- Cases ---
CREATE POLICY "Allow anon insert cases" ON public.cases FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon select cases" ON public.cases FOR SELECT USING (true);
CREATE POLICY "Allow anon update cases" ON public.cases FOR UPDATE USING (true);

-- Authenticated users can see their own created cases
CREATE POLICY "Users see own cases"
    ON public.cases FOR SELECT
    USING (auth.uid() = created_by);

-- --- Clinical Reviews ---
CREATE POLICY "Allow anon insert reviews" ON public.clinical_reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon select reviews" ON public.clinical_reviews FOR SELECT USING (true);

-- Authenticated reviewers can update their own reviews
CREATE POLICY "Reviewers can update own reviews"
    ON public.clinical_reviews FOR UPDATE
    USING (auth.uid() = reviewer_id);

-- --- Sync Logs ---
CREATE POLICY "Allow anon insert sync logs" ON public.sync_logs FOR INSERT WITH CHECK (true);

-- =============================================================================
-- SUPABASE REALTIME SUBSCRIPTIONS
-- Enable realtime push events for new cases and active outbreak alerts
-- =============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.cases;
ALTER PUBLICATION supabase_realtime ADD TABLE public.outbreak_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.doctor_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
