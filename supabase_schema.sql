-- ============================================================
-- MakeEazy FlatOS — Essential Schema (Phase 0-1)
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/osmxgopsxjkoqoqiyaqm/sql/new
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── ENUM TYPES ────────────────────────────────────────
CREATE TYPE flat_status AS ENUM ('occupied','vacant','under_repair','office','blocked','reserved');
CREATE TYPE tenant_status AS ENUM ('active','moved_out','onboarding','notice_period');
CREATE TYPE kyc_status AS ENUM ('complete','pending','incomplete');
CREATE TYPE agreement_status AS ENUM ('draft','sent','signed','registered','expired','terminated','under_process');
CREATE TYPE user_role AS ENUM ('super_admin','owner','admin','accountant','ca_reviewer','viewer');
CREATE TYPE demand_status AS ENUM ('pending','partial','paid','overdue','waived');
CREATE TYPE payment_mode AS ENUM ('upi','neft','imps','cash','cheque','adjustment');
CREATE TYPE deposit_type AS ENUM ('initial','additional','deduction','refund','replacement');
CREATE TYPE complaint_priority AS ENUM ('low','medium','high','urgent');
CREATE TYPE complaint_status AS ENUM ('open','assigned','in_progress','resolved','closed');
CREATE TYPE compliance_status AS ENUM ('not_due','pending','in_progress','complete','overdue');
CREATE TYPE expense_category AS ENUM ('maintenance','repair','cleaning','security','electricity','water','insurance','legal','accounting','other');
CREATE TYPE vendor_category AS ENUM ('plumber','electrician','carpenter','painter','pest_control','cleaning','security','general','other');

-- ─── ORGANIZATIONS ─────────────────────────────────────
CREATE TABLE organizations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    gst_number TEXT,
    cin_number TEXT,
    settings JSONB DEFAULT '{}',
    subscription_tier TEXT DEFAULT 'free',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── USERS ─────────────────────────────────────────────
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id),
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    role user_role DEFAULT 'admin',
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PROPERTIES ────────────────────────────────────────
CREATE TABLE properties (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES organizations(id),
    name TEXT NOT NULL,
    address TEXT,
    city TEXT,
    total_units INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── FLATS ─────────────────────────────────────────────
CREATE TABLE flats (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES organizations(id),
    property_id UUID NOT NULL REFERENCES properties(id),
    flat_number TEXT NOT NULL,
    floor TEXT,
    flat_type TEXT,
    carpet_area_sqft NUMERIC,
    furnishing TEXT DEFAULT 'semi_furnished',
    ac_count INTEGER DEFAULT 0,
    parking TEXT,
    owner_entity TEXT DEFAULT 'PRPL',
    monthly_rent NUMERIC DEFAULT 0,
    monthly_maintenance NUMERIC DEFAULT 0,
    status flat_status DEFAULT 'vacant',
    vacancy_since TIMESTAMPTZ,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, flat_number)
);

-- ─── TENANTS ───────────────────────────────────────────
CREATE TABLE tenants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES organizations(id),
    flat_id UUID REFERENCES flats(id),
    agreement_id UUID,
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    dob DATE,
    aadhar_enc TEXT,
    pan_enc TEXT,
    employer_name TEXT,
    ctc_monthly NUMERIC,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    move_in_date DATE,
    move_out_date DATE,
    is_primary BOOLEAN DEFAULT FALSE,
    kyc_status kyc_status DEFAULT 'pending',
    status tenant_status DEFAULT 'onboarding',
    rent_share NUMERIC DEFAULT 100,
    maint_share NUMERIC DEFAULT 100,
    source TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── AGREEMENTS ────────────────────────────────────────
CREATE TABLE agreements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES organizations(id),
    flat_id UUID NOT NULL REFERENCES flats(id),
    tenant_id UUID REFERENCES tenants(id),
    agreement_type TEXT DEFAULT 'leave_and_license',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    rent_amount NUMERIC DEFAULT 0,
    maintenance_amount NUMERIC DEFAULT 0,
    deposit_amount NUMERIC DEFAULT 0,
    lock_in_months INTEGER DEFAULT 6,
    notice_period_months INTEGER DEFAULT 1,
    escalation_percent NUMERIC DEFAULT 5,
    replacement_charge NUMERIC DEFAULT 0,
    status agreement_status DEFAULT 'draft',
    document_url TEXT,
    signed_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── DEPOSITS ──────────────────────────────────────────
CREATE TABLE deposits (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES organizations(id),
    flat_id UUID NOT NULL REFERENCES flats(id),
    tenant_id UUID REFERENCES tenants(id),
    type deposit_type NOT NULL,
    amount NUMERIC NOT NULL,
    mode payment_mode,
    reference_number TEXT,
    date DATE NOT NULL,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── RENT DEMANDS ──────────────────────────────────────
CREATE TABLE rent_demands (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES organizations(id),
    flat_id UUID NOT NULL REFERENCES flats(id),
    billing_month TEXT NOT NULL,
    rent_amount NUMERIC DEFAULT 0,
    maintenance_amount NUMERIC DEFAULT 0,
    late_fee NUMERIC DEFAULT 0,
    total_demand NUMERIC GENERATED ALWAYS AS (rent_amount + maintenance_amount + late_fee) STORED,
    due_date DATE,
    status demand_status DEFAULT 'pending',
    is_prorata BOOLEAN DEFAULT FALSE,
    occupied_days INTEGER,
    total_days INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PAYMENTS ──────────────────────────────────────────
CREATE TABLE payments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES organizations(id),
    flat_id UUID NOT NULL REFERENCES flats(id),
    tenant_id UUID REFERENCES tenants(id),
    demand_id UUID REFERENCES rent_demands(id),
    receipt_number TEXT,
    amount NUMERIC NOT NULL,
    date DATE NOT NULL,
    mode payment_mode NOT NULL,
    reference_number TEXT,
    rent_component NUMERIC DEFAULT 0,
    maintenance_component NUMERIC DEFAULT 0,
    late_fee_component NUMERIC DEFAULT 0,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── COMPLAINTS ────────────────────────────────────────
CREATE TABLE complaints (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES organizations(id),
    flat_id UUID REFERENCES flats(id),
    complaint_number TEXT,
    date DATE DEFAULT CURRENT_DATE,
    category TEXT,
    description TEXT,
    priority complaint_priority DEFAULT 'medium',
    reported_by TEXT,
    assigned_vendor_id UUID,
    status complaint_status DEFAULT 'open',
    resolved_date DATE,
    cost NUMERIC DEFAULT 0,
    photos TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── VENDORS ───────────────────────────────────────────
CREATE TABLE vendors (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES organizations(id),
    name TEXT NOT NULL,
    category vendor_category DEFAULT 'general',
    phone TEXT,
    email TEXT,
    address TEXT,
    rate_card JSONB DEFAULT '{}',
    rating NUMERIC DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── EXPENSES ──────────────────────────────────────────
CREATE TABLE expenses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES organizations(id),
    flat_id UUID REFERENCES flats(id),
    vendor_id UUID REFERENCES vendors(id),
    category expense_category DEFAULT 'other',
    description TEXT,
    amount NUMERIC NOT NULL,
    date DATE NOT NULL,
    is_recurring BOOLEAN DEFAULT FALSE,
    is_capex BOOLEAN DEFAULT FALSE,
    invoice_url TEXT,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── DOCUMENTS ─────────────────────────────────────────
CREATE TABLE documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES organizations(id),
    flat_id UUID REFERENCES flats(id),
    tenant_id UUID REFERENCES tenants(id),
    agreement_id UUID REFERENCES agreements(id),
    doc_type TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by UUID,
    expiry_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── COMPLIANCE ITEMS ──────────────────────────────────
CREATE TABLE compliance_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES organizations(id),
    name TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    responsible_role user_role DEFAULT 'admin',
    due_date DATE,
    status compliance_status DEFAULT 'not_due',
    completed_date DATE,
    completed_by UUID,
    document_url TEXT,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── NOTIFICATIONS ─────────────────────────────────────
CREATE TABLE notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES organizations(id),
    user_id UUID REFERENCES users(id),
    channel TEXT DEFAULT 'in_app',
    template_key TEXT,
    message TEXT,
    metadata JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── AUDIT LOG ─────────────────────────────────────────
CREATE TABLE audit_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    org_id UUID,
    user_id UUID,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── AUTO-UPDATE TIMESTAMPS ────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_flats_updated_at BEFORE UPDATE ON flats FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_agreements_updated_at BEFORE UPDATE ON agreements FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_complaints_updated_at BEFORE UPDATE ON complaints FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_compliance_updated_at BEFORE UPDATE ON compliance_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── ROW LEVEL SECURITY ────────────────────────────────
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE flats ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE rent_demands ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Simple RLS: Allow authenticated users full access for now
-- Will be tightened to org-based access in Phase 13
CREATE POLICY "Allow all for authenticated" ON organizations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON users FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON properties FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON flats FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON tenants FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON agreements FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON deposits FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON rent_demands FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON complaints FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON vendors FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON documents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON compliance_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON audit_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── DONE ──────────────────────────────────────────────
-- Schema ready! Now create a user via the Auth tab, then run the app.
