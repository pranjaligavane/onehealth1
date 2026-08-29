-- =============================================================================
-- ONEHEALTH AI - SUPABASE POSTGRESQL DATABASE SCHEMA & MIGRATION SCRIPT
-- Run this script in your Supabase Project -> SQL Editor to initialize all tables,
-- Row Level Security (RLS) policies, indexes, and realtime subscriptions.
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS & HEALTHCARE WORKERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(30) DEFAULT 'health_worker', -- health_worker, doctor, vet, citizen, admin
    village VARCHAR(100) DEFAULT 'Kopargaon',
    phone VARCHAR(20),
    specialization VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CLINICAL & VETERINARY SCREENING CASES
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
    assigned_doctor_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    client_created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    server_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_synced BOOLEAN DEFAULT TRUE
);

-- Indexes for lightning fast lookups
CREATE INDEX IF NOT EXISTS idx_cases_type ON public.cases(case_type);
CREATE INDEX IF NOT EXISTS idx_cases_risk ON public.cases(risk_level);
CREATE INDEX IF NOT EXISTS idx_cases_village ON public.cases(village);
CREATE INDEX IF NOT EXISTS idx_cases_created ON public.cases(client_created_at DESC);

-- 3. DOCTOR & VET CLINICAL REVIEWS / TELE-PRESCRIPTIONS
CREATE TABLE IF NOT EXISTS public.clinical_reviews (
    id SERIAL PRIMARY KEY,
    case_id VARCHAR(64) NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
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

-- 4. EPIDEMIC & OUTBREAK SURVEILLANCE ALERTS
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

-- 5. VERIFIED DOCTOR & VETERINARY PROFILES DIRECTORY
CREATE TABLE IF NOT EXISTS public.doctor_profiles (
    id VARCHAR(50) PRIMARY KEY, -- e.g. DOC-001, VET-001
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
    verified BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_doc_role_village ON public.doctor_profiles(role, village);

-- 6. EKACARE BODHI-S CLINICAL KNOWLEDGE GRAPH
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

-- 7. SYNC AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.sync_logs (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(100),
    cases_synced_count INTEGER DEFAULT 0,
    client_timestamp TIMESTAMP WITH TIME ZONE,
    server_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(30) DEFAULT 'SUCCESS'
);

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

-- Allow public read access to doctors, knowledge base, and outbreak alerts
CREATE POLICY "Allow public read on doctor profiles" ON public.doctor_profiles FOR SELECT USING (true);
CREATE POLICY "Allow public read on clinical knowledge" ON public.clinical_knowledge FOR SELECT USING (true);
CREATE POLICY "Allow public read on outbreak alerts" ON public.outbreak_alerts FOR SELECT USING (true);

-- Allow authenticated and anon users to insert/select cases and sync logs
CREATE POLICY "Allow anon insert cases" ON public.cases FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon select cases" ON public.cases FOR SELECT USING (true);
CREATE POLICY "Allow anon update cases" ON public.cases FOR UPDATE USING (true);

CREATE POLICY "Allow anon insert reviews" ON public.clinical_reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon select reviews" ON public.clinical_reviews FOR SELECT USING (true);

CREATE POLICY "Allow anon insert sync logs" ON public.sync_logs FOR INSERT WITH CHECK (true);

-- =============================================================================
-- SUPABASE REALTIME SUBSCRIPTIONS
-- Enable realtime push events for new cases and active outbreak alerts
-- =============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.cases;
ALTER PUBLICATION supabase_realtime ADD TABLE public.outbreak_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.doctor_profiles;
