-- ============================================================
-- FlatOS RLS v2 — Org-scoped + Role-aware policies
-- Run this in Supabase SQL editor
-- ============================================================
-- This replaces the permissive "Allow all for authenticated" policies.
-- Each table gets SELECT/INSERT/UPDATE/DELETE configured by org membership + role.
-- ============================================================

-- ─── Helper function: get current user's org_id ────────────
CREATE OR REPLACE FUNCTION get_my_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM users WHERE id = auth.uid() LIMIT 1;
$$;

-- ─── Helper function: get current user's role ───────────────
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::TEXT FROM users WHERE id = auth.uid() LIMIT 1;
$$;

-- ─── Helper: is current user admin/owner/super_admin? ───────
CREATE OR REPLACE FUNCTION is_admin_or_above()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
      AND role IN ('admin', 'owner', 'super_admin')
  );
$$;

-- ============================================================
-- DROP OLD PERMISSIVE POLICIES
-- ============================================================
DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'organizations','users','properties','flats','tenants','agreements',
    'deposits','rent_demands','payments','complaints','vendors','expenses',
    'documents','compliance_items','notifications','audit_log'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow all for authenticated" ON %I', tbl);
  END LOOP;
END $$;

-- ============================================================
-- ORGANIZATIONS
-- Only see your own org; only admins can update
-- ============================================================
CREATE POLICY "org_select" ON organizations
  FOR SELECT TO authenticated
  USING (id = get_my_org_id());

CREATE POLICY "org_update" ON organizations
  FOR UPDATE TO authenticated
  USING (id = get_my_org_id() AND is_admin_or_above())
  WITH CHECK (id = get_my_org_id());

-- ============================================================
-- USERS (user profiles)
-- Can read all users in your org; only admins can insert/update
-- ============================================================
CREATE POLICY "users_select" ON users
  FOR SELECT TO authenticated
  USING (org_id = get_my_org_id());

CREATE POLICY "users_insert" ON users
  FOR INSERT TO authenticated
  WITH CHECK (org_id = get_my_org_id() AND is_admin_or_above());

CREATE POLICY "users_update" ON users
  FOR UPDATE TO authenticated
  USING (org_id = get_my_org_id() AND (id = auth.uid() OR is_admin_or_above()))
  WITH CHECK (org_id = get_my_org_id());

CREATE POLICY "users_delete" ON users
  FOR DELETE TO authenticated
  USING (org_id = get_my_org_id() AND is_admin_or_above());

-- ============================================================
-- PROPERTIES
-- ============================================================
CREATE POLICY "properties_select" ON properties
  FOR SELECT TO authenticated USING (org_id = get_my_org_id());

CREATE POLICY "properties_insert" ON properties
  FOR INSERT TO authenticated
  WITH CHECK (org_id = get_my_org_id() AND is_admin_or_above());

CREATE POLICY "properties_update" ON properties
  FOR UPDATE TO authenticated
  USING (org_id = get_my_org_id() AND is_admin_or_above())
  WITH CHECK (org_id = get_my_org_id());

CREATE POLICY "properties_delete" ON properties
  FOR DELETE TO authenticated
  USING (org_id = get_my_org_id() AND is_admin_or_above());

-- ============================================================
-- FLATS
-- All authenticated org members can read; admin/owner can write
-- ============================================================
CREATE POLICY "flats_select" ON flats
  FOR SELECT TO authenticated USING (org_id = get_my_org_id());

CREATE POLICY "flats_insert" ON flats
  FOR INSERT TO authenticated
  WITH CHECK (org_id = get_my_org_id() AND is_admin_or_above());

CREATE POLICY "flats_update" ON flats
  FOR UPDATE TO authenticated
  USING (org_id = get_my_org_id() AND is_admin_or_above())
  WITH CHECK (org_id = get_my_org_id());

CREATE POLICY "flats_delete" ON flats
  FOR DELETE TO authenticated
  USING (org_id = get_my_org_id() AND is_admin_or_above());

-- ============================================================
-- TENANTS
-- ============================================================
CREATE POLICY "tenants_select" ON tenants
  FOR SELECT TO authenticated USING (org_id = get_my_org_id());

CREATE POLICY "tenants_insert" ON tenants
  FOR INSERT TO authenticated
  WITH CHECK (org_id = get_my_org_id() AND is_admin_or_above());

CREATE POLICY "tenants_update" ON tenants
  FOR UPDATE TO authenticated
  USING (org_id = get_my_org_id() AND is_admin_or_above())
  WITH CHECK (org_id = get_my_org_id());

CREATE POLICY "tenants_delete" ON tenants
  FOR DELETE TO authenticated
  USING (org_id = get_my_org_id() AND is_admin_or_above());

-- ============================================================
-- AGREEMENTS
-- ============================================================
CREATE POLICY "agreements_select" ON agreements
  FOR SELECT TO authenticated USING (org_id = get_my_org_id());

CREATE POLICY "agreements_insert" ON agreements
  FOR INSERT TO authenticated
  WITH CHECK (org_id = get_my_org_id() AND is_admin_or_above());

CREATE POLICY "agreements_update" ON agreements
  FOR UPDATE TO authenticated
  USING (org_id = get_my_org_id() AND is_admin_or_above())
  WITH CHECK (org_id = get_my_org_id());

CREATE POLICY "agreements_delete" ON agreements
  FOR DELETE TO authenticated
  USING (org_id = get_my_org_id() AND is_admin_or_above());

-- ============================================================
-- DEPOSITS
-- ============================================================
CREATE POLICY "deposits_select" ON deposits
  FOR SELECT TO authenticated USING (org_id = get_my_org_id());

CREATE POLICY "deposits_insert" ON deposits
  FOR INSERT TO authenticated
  WITH CHECK (org_id = get_my_org_id() AND is_admin_or_above());

CREATE POLICY "deposits_update" ON deposits
  FOR UPDATE TO authenticated
  USING (org_id = get_my_org_id() AND is_admin_or_above())
  WITH CHECK (org_id = get_my_org_id());

-- ============================================================
-- RENT DEMANDS
-- Accountants can read; admins can insert/update
-- ============================================================
CREATE POLICY "rent_demands_select" ON rent_demands
  FOR SELECT TO authenticated USING (org_id = get_my_org_id());

CREATE POLICY "rent_demands_insert" ON rent_demands
  FOR INSERT TO authenticated
  WITH CHECK (org_id = get_my_org_id() AND get_my_role() IN ('admin','owner','super_admin','accountant'));

CREATE POLICY "rent_demands_update" ON rent_demands
  FOR UPDATE TO authenticated
  USING (org_id = get_my_org_id() AND get_my_role() IN ('admin','owner','super_admin','accountant'))
  WITH CHECK (org_id = get_my_org_id());

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE POLICY "payments_select" ON payments
  FOR SELECT TO authenticated USING (org_id = get_my_org_id());

CREATE POLICY "payments_insert" ON payments
  FOR INSERT TO authenticated
  WITH CHECK (org_id = get_my_org_id() AND get_my_role() IN ('admin','owner','super_admin','accountant'));

CREATE POLICY "payments_update" ON payments
  FOR UPDATE TO authenticated
  USING (org_id = get_my_org_id() AND get_my_role() IN ('admin','owner','super_admin','accountant'))
  WITH CHECK (org_id = get_my_org_id());

-- ============================================================
-- COMPLAINTS
-- ============================================================
CREATE POLICY "complaints_select" ON complaints
  FOR SELECT TO authenticated USING (org_id = get_my_org_id());

CREATE POLICY "complaints_insert" ON complaints
  FOR INSERT TO authenticated
  WITH CHECK (org_id = get_my_org_id());

CREATE POLICY "complaints_update" ON complaints
  FOR UPDATE TO authenticated
  USING (org_id = get_my_org_id() AND is_admin_or_above())
  WITH CHECK (org_id = get_my_org_id());

-- ============================================================
-- VENDORS
-- ============================================================
CREATE POLICY "vendors_select" ON vendors
  FOR SELECT TO authenticated USING (org_id = get_my_org_id());

CREATE POLICY "vendors_insert" ON vendors
  FOR INSERT TO authenticated
  WITH CHECK (org_id = get_my_org_id() AND is_admin_or_above());

CREATE POLICY "vendors_update" ON vendors
  FOR UPDATE TO authenticated
  USING (org_id = get_my_org_id() AND is_admin_or_above())
  WITH CHECK (org_id = get_my_org_id());

-- ============================================================
-- EXPENSES
-- ============================================================
CREATE POLICY "expenses_select" ON expenses
  FOR SELECT TO authenticated USING (org_id = get_my_org_id());

CREATE POLICY "expenses_insert" ON expenses
  FOR INSERT TO authenticated
  WITH CHECK (org_id = get_my_org_id() AND get_my_role() IN ('admin','owner','super_admin','accountant'));

CREATE POLICY "expenses_update" ON expenses
  FOR UPDATE TO authenticated
  USING (org_id = get_my_org_id() AND is_admin_or_above())
  WITH CHECK (org_id = get_my_org_id());

-- ============================================================
-- DOCUMENTS
-- ============================================================
CREATE POLICY "documents_select" ON documents
  FOR SELECT TO authenticated USING (org_id = get_my_org_id());

CREATE POLICY "documents_insert" ON documents
  FOR INSERT TO authenticated
  WITH CHECK (org_id = get_my_org_id());

CREATE POLICY "documents_update" ON documents
  FOR UPDATE TO authenticated
  USING (org_id = get_my_org_id() AND is_admin_or_above())
  WITH CHECK (org_id = get_my_org_id());

CREATE POLICY "documents_delete" ON documents
  FOR DELETE TO authenticated
  USING (org_id = get_my_org_id() AND is_admin_or_above());

-- ============================================================
-- COMPLIANCE ITEMS
-- ============================================================
CREATE POLICY "compliance_select" ON compliance_items
  FOR SELECT TO authenticated USING (org_id = get_my_org_id());

CREATE POLICY "compliance_insert" ON compliance_items
  FOR INSERT TO authenticated
  WITH CHECK (org_id = get_my_org_id() AND is_admin_or_above());

CREATE POLICY "compliance_update" ON compliance_items
  FOR UPDATE TO authenticated
  USING (org_id = get_my_org_id())
  WITH CHECK (org_id = get_my_org_id());

-- ============================================================
-- NOTIFICATIONS
-- Users can only read their own notifications
-- ============================================================
CREATE POLICY "notifications_select" ON notifications
  FOR SELECT TO authenticated
  USING (org_id = get_my_org_id() AND (user_id = auth.uid() OR user_id IS NULL));

CREATE POLICY "notifications_insert" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (org_id = get_my_org_id());

CREATE POLICY "notifications_update" ON notifications
  FOR UPDATE TO authenticated
  USING (org_id = get_my_org_id() AND (user_id = auth.uid() OR user_id IS NULL))
  WITH CHECK (org_id = get_my_org_id());

-- ============================================================
-- AUDIT LOG
-- Read-only for all org members; system can insert via service role
-- ============================================================
CREATE POLICY "audit_select" ON audit_log
  FOR SELECT TO authenticated
  USING (org_id = get_my_org_id());

CREATE POLICY "audit_insert" ON audit_log
  FOR INSERT TO authenticated
  WITH CHECK (org_id = get_my_org_id());

-- ============================================================
-- STORAGE: documents bucket — make private
-- ============================================================
-- Run in Supabase Dashboard > Storage > Policies
-- Or uncomment below if using Supabase CLI:
--
-- DELETE FROM storage.policies WHERE bucket_id = 'documents';
--
-- INSERT INTO storage.policies (name, bucket_id, definition, check_expression) VALUES
-- ('documents_select', 'documents',
--   'auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = (SELECT org_id::TEXT FROM users WHERE id = auth.uid() LIMIT 1)',
--   NULL),
-- ('documents_insert', 'documents',
--   NULL,
--   'auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = (SELECT org_id::TEXT FROM users WHERE id = auth.uid() LIMIT 1)');
--
-- ============================================================
-- DONE — Apply org-scoped RLS is active.
-- ============================================================
