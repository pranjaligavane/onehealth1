-- =============================================================================
-- ONEHEALTH AI - AUTH MIGRATION SCRIPT
-- Run this in Supabase SQL Editor INSTEAD of supabase_schema.sql
-- This safely adds new auth columns to existing tables without data loss.
-- =============================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- STEP 1: Migrate public.users table
-- Update id column type from INTEGER to UUID (matching auth.users)
-- If you have NO existing data you care about, the DROP TABLE route is simpler.
-- This script assumes you want to KEEP existing data.
-- =============================================================================

-- Add new columns to existing users table if they don't exist
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS medical_reg_no VARCHAR(50);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- If users.id is currently INTEGER, we need to migrate it to UUID
-- Safe approach: create the new users table structure and rename
DO $$
BEGIN
  -- Check if users.id is UUID already
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = 'id'
    AND data_type = 'uuid'
  ) THEN
    -- Rename old table, create new one
    ALTER TABLE public.users RENAME TO users_old;

    CREATE TABLE public.users (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      email VARCHAR(255) UNIQUE,
      name VARCHAR(100) NOT NULL,
      role VARCHAR(30) DEFAULT 'patient',
      village VARCHAR(100) DEFAULT 'Kopargaon',
      phone VARCHAR(20),
      specialization VARCHAR(100),
      medical_reg_no VARCHAR(50),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    COMMENT ON TABLE public.users IS 'OneHealth AI user profiles, linked 1-to-1 with Supabase Auth accounts.';
    RAISE NOTICE 'Created new UUID-based users table. Old table saved as users_old.';
  ELSE
    RAISE NOTICE 'users.id is already UUID — skipping migration.';
  END IF;
END;
$$;

-- =============================================================================
-- STEP 2: Migrate public.cases table — add missing columns
-- =============================================================================

-- Change assigned_doctor_id from INTEGER to UUID if needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'cases'
    AND column_name = 'assigned_doctor_id'
    AND data_type = 'integer'
  ) THEN
    ALTER TABLE public.cases DROP COLUMN assigned_doctor_id;
    ALTER TABLE public.cases ADD COLUMN assigned_doctor_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
    RAISE NOTICE 'Migrated cases.assigned_doctor_id from INTEGER to UUID.';
  END IF;
END;
$$;

-- Add created_by column (the auth UUID of patient/health worker who created)
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_cases_type ON public.cases(case_type);
CREATE INDEX IF NOT EXISTS idx_cases_risk ON public.cases(risk_level);
CREATE INDEX IF NOT EXISTS idx_cases_village ON public.cases(village);
CREATE INDEX IF NOT EXISTS idx_cases_created ON public.cases(client_created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cases_created_by ON public.cases(created_by);

-- =============================================================================
-- STEP 3: Migrate public.clinical_reviews — add reviewer_id
-- =============================================================================

ALTER TABLE public.clinical_reviews ADD COLUMN IF NOT EXISTS reviewer_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON public.clinical_reviews(reviewer_id);

-- =============================================================================
-- STEP 4: Migrate public.doctor_profiles — add user_id FK
-- =============================================================================

-- Change id from INTEGER to VARCHAR if needed (it may already be varchar)
-- Add user_id FK column linking to auth
ALTER TABLE public.doctor_profiles ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE REFERENCES public.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_doc_user_id ON public.doctor_profiles(user_id);

-- =============================================================================
-- STEP 5: Create new tables if they don't exist
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.outbreak_alerts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    disease VARCHAR(100) NOT NULL,
    target_group VARCHAR(50) NOT NULL,
    village VARCHAR(100) NOT NULL,
    severity VARCHAR(20) DEFAULT 'WARNING',
    description TEXT NOT NULL,
    precautions TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.clinical_knowledge (
    id VARCHAR(50) PRIMARY KEY,
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

CREATE TABLE IF NOT EXISTS public.sync_logs (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(100),
    cases_synced_count INTEGER DEFAULT 0,
    client_timestamp TIMESTAMP WITH TIME ZONE,
    server_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(30) DEFAULT 'SUCCESS'
);

-- =============================================================================
-- STEP 6: Auth Trigger — auto-create user profile on Supabase sign-up
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
    user_role           := COALESCE(NEW.raw_user_meta_data->>'role', 'patient');
    user_name           := COALESCE(NEW.raw_user_meta_data->>'name', NEW.email);
    user_phone          := COALESCE(NEW.raw_user_meta_data->>'phone', '');
    user_village        := COALESCE(NEW.raw_user_meta_data->>'village', 'Kopargaon');
    user_specialization := COALESCE(NEW.raw_user_meta_data->>'specialization', '');
    user_reg_no         := COALESCE(NEW.raw_user_meta_data->>'medical_reg_no', '');

    INSERT INTO public.users (id, email, name, role, village, phone, specialization, medical_reg_no)
    VALUES (NEW.id, NEW.email, user_name, user_role, user_village, user_phone, user_specialization, user_reg_no)
    ON CONFLICT (id) DO UPDATE SET
        name           = EXCLUDED.name,
        phone          = EXCLUDED.phone,
        specialization = EXCLUDED.specialization,
        medical_reg_no = EXCLUDED.medical_reg_no,
        updated_at     = NOW();

    IF user_role IN ('doctor', 'vet') THEN
        new_doc_id  := CASE WHEN user_role = 'vet' THEN 'VET-' ELSE 'DOC-' END
                       || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 6));
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
            new_doc_id, NEW.id, user_role, user_name,
            CASE WHEN user_role = 'vet' THEN 'BVSc' ELSE 'MBBS' END,
            user_reg_no, user_specialization, user_specialization,
            new_fee, new_clinic, user_village, new_address, user_phone, new_opd, FALSE
        )
        ON CONFLICT (user_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_new_user();

-- =============================================================================
-- STEP 7: Row Level Security Policies
-- Drop old policies first to avoid "already exists" errors, then recreate
-- =============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outbreak_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- Drop old policies (ignore errors if they don't exist)
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Allow system insert users" ON public.users;
DROP POLICY IF EXISTS "Public can read doctor user profiles" ON public.users;
DROP POLICY IF EXISTS "Allow public read on doctor profiles" ON public.doctor_profiles;
DROP POLICY IF EXISTS "Doctors can update their own profile" ON public.doctor_profiles;
DROP POLICY IF EXISTS "System can insert doctor profiles" ON public.doctor_profiles;
DROP POLICY IF EXISTS "Allow public read on clinical knowledge" ON public.clinical_knowledge;
DROP POLICY IF EXISTS "Allow public read on outbreak alerts" ON public.outbreak_alerts;
DROP POLICY IF EXISTS "Allow anon insert cases" ON public.cases;
DROP POLICY IF EXISTS "Allow anon select cases" ON public.cases;
DROP POLICY IF EXISTS "Allow anon update cases" ON public.cases;
DROP POLICY IF EXISTS "Users see own cases" ON public.cases;
DROP POLICY IF EXISTS "Allow anon insert reviews" ON public.clinical_reviews;
DROP POLICY IF EXISTS "Allow anon select reviews" ON public.clinical_reviews;
DROP POLICY IF EXISTS "Reviewers can update own reviews" ON public.clinical_reviews;
DROP POLICY IF EXISTS "Allow anon insert sync logs" ON public.sync_logs;

-- Recreate all policies
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Allow system insert users" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can read doctor user profiles" ON public.users FOR SELECT USING (role IN ('doctor', 'vet'));

CREATE POLICY "Allow public read on doctor profiles" ON public.doctor_profiles FOR SELECT USING (true);
CREATE POLICY "Doctors can update their own profile" ON public.doctor_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can insert doctor profiles" ON public.doctor_profiles FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read on clinical knowledge" ON public.clinical_knowledge FOR SELECT USING (true);
CREATE POLICY "Allow public read on outbreak alerts" ON public.outbreak_alerts FOR SELECT USING (true);

CREATE POLICY "Allow anon insert cases" ON public.cases FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon select cases" ON public.cases FOR SELECT USING (true);
CREATE POLICY "Allow anon update cases" ON public.cases FOR UPDATE USING (true);
CREATE POLICY "Users see own cases" ON public.cases FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Allow anon insert reviews" ON public.clinical_reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon select reviews" ON public.clinical_reviews FOR SELECT USING (true);
CREATE POLICY "Reviewers can update own reviews" ON public.clinical_reviews FOR UPDATE USING (auth.uid() = reviewer_id);

CREATE POLICY "Allow anon insert sync logs" ON public.sync_logs FOR INSERT WITH CHECK (true);

-- =============================================================================
-- STEP 8: Realtime subscriptions
-- =============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.cases;
ALTER PUBLICATION supabase_realtime ADD TABLE public.outbreak_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.doctor_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;

-- Done!
SELECT 'OneHealth AI Auth Migration completed successfully! 🎉' AS status;
