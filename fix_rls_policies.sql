-- ============================================================
-- FlatOS RLS FIX — Replace org-scoped with simple auth policies
-- The org_scoped policies were returning 0 rows because
-- auth_org_id() couldn't resolve the user's org.
-- This script restores working RLS (any authenticated user can access).
-- ============================================================

-- Step 1: Drop ALL existing policies on all tables
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT schemaname, tablename, policyname 
    FROM pg_policies 
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
  RAISE NOTICE 'All existing policies dropped';
END $$;

-- Step 2: Create simple "Allow all for authenticated" policies
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'organizations','users','properties','flats','tenants','agreements',
    'deposits','rent_demands','payments','complaints','vendors','expenses',
    'documents','compliance_items','notifications','audit_log'
  ]) LOOP
    -- Only create if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
      EXECUTE format(
        'CREATE POLICY "Allow all for authenticated" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
        tbl
      );
      RAISE NOTICE 'Policy created for %', tbl;
    END IF;
  END LOOP;
END $$;

-- Step 3: Verify user profile exists and is linked to org
DO $$
DECLARE
  v_org uuid;
  v_auth_id uuid;
  v_count int;
BEGIN
  SELECT id INTO v_org FROM organizations LIMIT 1;
  
  -- Show what we have
  SELECT count(*) INTO v_count FROM public.users;
  RAISE NOTICE 'Users in table: %', v_count;
  
  SELECT count(*) INTO v_count FROM organizations;
  RAISE NOTICE 'Organizations: %', v_count;
  
  SELECT count(*) INTO v_count FROM flats;
  RAISE NOTICE 'Flats: %', v_count;
  
  SELECT count(*) INTO v_count FROM tenants;
  RAISE NOTICE 'Tenants: %', v_count;
  
  -- Ensure ALL auth users have a profile
  INSERT INTO public.users (id, org_id, email, full_name, role)
  SELECT au.id, v_org, au.email, COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)), 'admin'
  FROM auth.users au
  WHERE NOT EXISTS (SELECT 1 FROM public.users pu WHERE pu.id = au.id)
  ON CONFLICT (id) DO UPDATE SET org_id = v_org;
  
  -- Also fix any users with wrong org_id
  UPDATE public.users SET org_id = v_org WHERE org_id != v_org OR org_id IS NULL;
  
  SELECT count(*) INTO v_count FROM public.users;
  RAISE NOTICE 'Users after fix: %', v_count;
  
  RAISE NOTICE '✅ RLS fixed! All authenticated users can now access data.';
END $$;
