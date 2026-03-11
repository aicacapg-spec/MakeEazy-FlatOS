-- ============================================================
-- FlatOS RLS Migration — Organization-Scoped Policies
-- Run this in Supabase SQL Editor AFTER the initial schema
-- ============================================================

-- Helper function: get current user's org_id
CREATE OR REPLACE FUNCTION auth_org_id() RETURNS UUID AS $$
  SELECT org_id FROM public.users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: get current user's role
CREATE OR REPLACE FUNCTION auth_role() RETURNS user_role AS $$
  SELECT role FROM public.users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─── DROP OLD PERMISSIVE POLICIES ─────────────────────────
DO $$ 
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'organizations','users','properties','flats','tenants','agreements',
    'deposits','rent_demands','payments','complaints','vendors','expenses',
    'documents','compliance_items','notifications','audit_log'
  ]) LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow all for authenticated" ON %I', tbl);
  END LOOP;
END $$;

-- ─── ORGANIZATIONS ────────────────────────────────────────
CREATE POLICY "org_own" ON organizations FOR SELECT TO authenticated
  USING (id = auth_org_id());
CREATE POLICY "org_update" ON organizations FOR UPDATE TO authenticated
  USING (id = auth_org_id() AND auth_role() IN ('owner','admin','super_admin'))
  WITH CHECK (id = auth_org_id());

-- ─── USERS ────────────────────────────────────────────────
CREATE POLICY "users_read_org" ON users FOR SELECT TO authenticated
  USING (org_id = auth_org_id());
CREATE POLICY "users_manage" ON users FOR ALL TO authenticated
  USING (org_id = auth_org_id() AND auth_role() IN ('owner','admin','super_admin'))
  WITH CHECK (org_id = auth_org_id());
-- Allow user to read own profile regardless
CREATE POLICY "users_read_self" ON users FOR SELECT TO authenticated
  USING (id = auth.uid());

-- ─── PROPERTIES ───────────────────────────────────────────
CREATE POLICY "props_org" ON properties FOR ALL TO authenticated
  USING (org_id = auth_org_id()) WITH CHECK (org_id = auth_org_id());

-- ─── DATA TABLES (org-scoped read/write) ──────────────────
-- Apply same pattern to all data tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'flats','tenants','agreements','deposits','rent_demands','payments',
    'complaints','vendors','expenses','documents','compliance_items'
  ]) LOOP
    EXECUTE format(
      'CREATE POLICY "org_read_%1$s" ON %1$I FOR SELECT TO authenticated USING (org_id = auth_org_id())',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "org_write_%1$s" ON %1$I FOR INSERT TO authenticated WITH CHECK (org_id = auth_org_id())',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "org_update_%1$s" ON %1$I FOR UPDATE TO authenticated USING (org_id = auth_org_id()) WITH CHECK (org_id = auth_org_id())',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "org_delete_%1$s" ON %1$I FOR DELETE TO authenticated USING (org_id = auth_org_id())',
      tbl
    );
  END LOOP;
END $$;

-- ─── NOTIFICATIONS ────────────────────────────────────────
CREATE POLICY "notif_org" ON notifications FOR ALL TO authenticated
  USING (org_id = auth_org_id()) WITH CHECK (org_id = auth_org_id());

-- ─── AUDIT LOG (read-only for admins) ─────────────────────
CREATE POLICY "audit_read" ON audit_log FOR SELECT TO authenticated
  USING (org_id = auth_org_id() AND auth_role() IN ('owner','admin','super_admin'));
CREATE POLICY "audit_insert" ON audit_log FOR INSERT TO authenticated
  WITH CHECK (org_id = auth_org_id());

-- ─── DONE ─────────────────────────────────────────────────
-- All tables now enforce org-level data isolation
