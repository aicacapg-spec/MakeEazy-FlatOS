-- ============================================================
-- FlatOS RE-SEED — Fixes RLS by ensuring user→org linkage
-- Run in Supabase SQL Editor AFTER the RLS migration
-- ============================================================

-- STEP 0: Ensure the logged-in auth user has a profile in `users`
-- This is THE critical step that makes RLS work!
DO $$
DECLARE
  v_org uuid;
  v_auth_user uuid;
  v_email text;
BEGIN
  -- Get the first org
  SELECT id INTO v_org FROM organizations LIMIT 1;
  
  -- If no org exists, create one
  IF v_org IS NULL THEN
    INSERT INTO organizations (name, email, phone, city)
    VALUES ('Priya Residences Private Limited', 'admin@priyaresidences.com', '+91-40-2345-6789', 'Hyderabad')
    RETURNING id INTO v_org;
  END IF;

  -- Link ALL existing auth users to this org
  FOR v_auth_user, v_email IN 
    SELECT au.id, au.email FROM auth.users au
    LEFT JOIN public.users pu ON pu.id = au.id
    WHERE pu.id IS NULL
  LOOP
    INSERT INTO public.users (id, org_id, email, full_name, role)
    VALUES (v_auth_user, v_org, v_email, split_part(v_email, '@', 1), 'admin')
    ON CONFLICT (id) DO UPDATE SET org_id = v_org;
  END LOOP;

  -- Also update any existing users that have NULL org_id
  UPDATE public.users SET org_id = v_org WHERE org_id IS NULL;

  RAISE NOTICE 'User-org linkage fixed. org_id = %', v_org;
END $$;

-- STEP 1: Now run the full seed data
-- (This is the same as seed_data.sql)

DELETE FROM payments;
DELETE FROM rent_demands;
DELETE FROM deposits;
DELETE FROM documents;
DELETE FROM compliance_items;
DELETE FROM complaints;
DELETE FROM expenses;
DELETE FROM vendors;
DELETE FROM notifications;
DELETE FROM agreements;
DELETE FROM tenants;
DELETE FROM flats;
DELETE FROM properties;

UPDATE organizations SET
  name = 'Priya Residences Private Limited',
  email = 'admin@priyaresidences.com',
  phone = '+91-40-2345-6789',
  address = 'Plot 42, Road No. 12, Banjara Hills',
  city = 'Hyderabad',
  gst_number = '36AABCP7654M1Z5',
  cin_number = 'U70102TG2019PTC135678',
  settings = '{"billing_rules":{"rent_due_day":1,"grace_period_days":7,"late_fee_percent":5,"escalation_percent":5,"lock_in_months":6,"notice_period_months":1,"agreement_duration_months":11,"deposit_refund_days":30}}'::jsonb;

DO $$
DECLARE v_org uuid;
BEGIN
  SELECT id INTO v_org FROM organizations LIMIT 1;

  -- PROPERTY
  INSERT INTO properties (id,org_id,name,city,total_units) VALUES
    ('22222222-2222-2222-2222-222222222222',v_org,'Priya Mahalakshmi Towers','Hyderabad',16);

  -- 16 FLATS
  INSERT INTO flats (id,org_id,property_id,flat_number,floor,flat_type,furnishing,ac_count,owner_entity,monthly_rent,monthly_maintenance,status,vacancy_since) VALUES
    ('30000001-0000-0000-0000-000000000000',v_org,'22222222-2222-2222-2222-222222222222','101','1st','2BHK','fully_furnished',2,'Priya Residences Private Limited',45000,3000,'occupied',NULL),
    ('30000002-0000-0000-0000-000000000000',v_org,'22222222-2222-2222-2222-222222222222','102','1st','2BHK','fully_furnished',3,'Priya Residences Private Limited',48000,3000,'occupied',NULL),
    ('30000003-0000-0000-0000-000000000000',v_org,'22222222-2222-2222-2222-222222222222','103','1st','2BHK','semi_furnished',0,'GreenTech Engineering Pvt Ltd',48000,3000,'occupied',NULL),
    ('30000004-0000-0000-0000-000000000000',v_org,'22222222-2222-2222-2222-222222222222','104','1st','3BHK','fully_furnished',2,'Priya Residences Private Limited',52000,3000,'vacant','2025-10-15'),
    ('30000005-0000-0000-0000-000000000000',v_org,'22222222-2222-2222-2222-222222222222','105','1st','2BHK','fully_furnished',2,'Priya Residences Private Limited',53000,3000,'occupied',NULL),
    ('30000006-0000-0000-0000-000000000000',v_org,'22222222-2222-2222-2222-222222222222','106','1st','3BHK','fully_furnished',3,'Priya Residences Private Limited',53000,3000,'occupied',NULL),
    ('30000007-0000-0000-0000-000000000000',v_org,'22222222-2222-2222-2222-222222222222','107','1st','2BHK','fully_furnished',2,'Priya Residences Private Limited',50000,3000,'occupied',NULL),
    ('30000008-0000-0000-0000-000000000000',v_org,'22222222-2222-2222-2222-222222222222','301','3rd','2BHK','fully_furnished',2,'Priya Residences Private Limited',45000,3000,'occupied',NULL),
    ('30000009-0000-0000-0000-000000000000',v_org,'22222222-2222-2222-2222-222222222222','305','3rd','2BHK','fully_furnished',2,'Priya Residences Private Limited',45000,3000,'occupied',NULL),
    ('30000010-0000-0000-0000-000000000000',v_org,'22222222-2222-2222-2222-222222222222','306','3rd','2BHK','fully_furnished',2,'Priya Residences Private Limited',51000,3000,'occupied',NULL),
    ('30000011-0000-0000-0000-000000000000',v_org,'22222222-2222-2222-2222-222222222222','307','3rd','3BHK','fully_furnished',3,'Priya Residences Private Limited',53350,3750,'occupied',NULL),
    ('30000012-0000-0000-0000-000000000000',v_org,'22222222-2222-2222-2222-222222222222','402','4th','2BHK','fully_furnished',2,'Priya Residences Private Limited',47000,3000,'occupied',NULL),
    ('30000013-0000-0000-0000-000000000000',v_org,'22222222-2222-2222-2222-222222222222','404','4th','3BHK','fully_furnished',3,'Priya Residences Private Limited',53350,3000,'occupied',NULL),
    ('30000014-0000-0000-0000-000000000000',v_org,'22222222-2222-2222-2222-222222222222','405','4th','2BHK','semi_furnished',0,'Priya Residences Private Limited',42000,3000,'vacant','2025-07-01'),
    ('30000015-0000-0000-0000-000000000000',v_org,'22222222-2222-2222-2222-222222222222','G1','Ground','1BHK','semi_furnished',1,'Priya Residences Private Limited',40000,2500,'occupied',NULL),
    ('30000016-0000-0000-0000-000000000000',v_org,'22222222-2222-2222-2222-222222222222','G6','Ground','2BHK','fully_furnished',2,'Priya Residences Private Limited',0,0,'office',NULL);

  -- 41 TENANTS
  INSERT INTO tenants (id,org_id,flat_id,full_name,phone,email,employer_name,ctc_monthly,move_in_date,move_out_date,is_primary,status,rent_share,maint_share) VALUES
    ('40000001-0000-0000-0000-000000000000',v_org,'30000001-0000-0000-0000-000000000000','Rajesh Kumar Sharma','9876540001','rajesh.sharma@email.com','TCS',75000,'2025-04-01',NULL,true,'active',18000,1200),
    ('40000002-0000-0000-0000-000000000000',v_org,'30000001-0000-0000-0000-000000000000','Amit Verma','9876540003','amit.verma@email.com','TCS',65000,'2025-04-01',NULL,false,'active',15000,1000),
    ('40000003-0000-0000-0000-000000000000',v_org,'30000001-0000-0000-0000-000000000000','Priya Nair','9876540005','priya.nair@email.com','TCS',55000,'2025-04-01',NULL,false,'active',12000,800),
    ('40000004-0000-0000-0000-000000000000',v_org,'30000002-0000-0000-0000-000000000000','Sneha Patel','9876540007','sneha.patel@email.com','Infosys',85000,'2025-02-10',NULL,true,'active',20000,1200),
    ('40000005-0000-0000-0000-000000000000',v_org,'30000002-0000-0000-0000-000000000000','Kavya Menon','9876540009','kavya.menon@email.com','Infosys',62000,'2025-02-10',NULL,false,'active',16000,1000),
    ('40000006-0000-0000-0000-000000000000',v_org,'30000002-0000-0000-0000-000000000000','Divya Iyer','9876540011','divya.iyer@email.com','Infosys',52000,'2025-02-10',NULL,false,'active',12000,800),
    ('40000007-0000-0000-0000-000000000000',v_org,'30000003-0000-0000-0000-000000000000','Vikram Reddy','9876540013','vikram.reddy@email.com','GreenTech Eng',90000,'2025-04-01',NULL,true,'active',20000,1200),
    ('40000008-0000-0000-0000-000000000000',v_org,'30000003-0000-0000-0000-000000000000','Suresh Babu K','9876540015','suresh.babu@email.com','GreenTech Eng',60000,'2025-04-01',NULL,false,'active',16000,1000),
    ('40000009-0000-0000-0000-000000000000',v_org,'30000003-0000-0000-0000-000000000000','Anil Prasad','9876540017','anil.prasad@email.com','GreenTech Eng',55000,'2025-04-01',NULL,false,'active',12000,800),
    ('40000010-0000-0000-0000-000000000000',v_org,'30000004-0000-0000-0000-000000000000','Lakshmi Narayanan S','9876540019','lakshmi.n@email.com','Wipro',70000,'2024-06-01','2025-10-15',true,'moved_out',22000,1200),
    ('40000011-0000-0000-0000-000000000000',v_org,'30000004-0000-0000-0000-000000000000','Karthik Raman','9876540021','karthik.r@email.com','Wipro',55000,'2024-06-01','2025-10-15',false,'moved_out',17000,1000),
    ('40000012-0000-0000-0000-000000000000',v_org,'30000004-0000-0000-0000-000000000000','Venkat Subramaniam','9876540023','venkat.s@email.com','Wipro',48000,'2024-06-01','2025-10-15',false,'moved_out',13000,800),
    ('40000013-0000-0000-0000-000000000000',v_org,'30000005-0000-0000-0000-000000000000','Ananya Krishnamurthy','9876540025','ananya.k@email.com','Amazon',95000,'2025-05-01',NULL,true,'active',22000,1200),
    ('40000014-0000-0000-0000-000000000000',v_org,'30000005-0000-0000-0000-000000000000','Deepa Sharma','9876540027','deepa.s@email.com','Amazon',70000,'2025-05-01',NULL,false,'active',17000,1000),
    ('40000015-0000-0000-0000-000000000000',v_org,'30000005-0000-0000-0000-000000000000','Swathi Reddy','9876540029','swathi.r@email.com','Amazon',60000,'2025-05-01',NULL,false,'active',14000,800),
    ('40000016-0000-0000-0000-000000000000',v_org,'30000006-0000-0000-0000-000000000000','Rahul Mehta','9876540031','rahul.m@email.com','Deloitte',80000,'2025-03-01',NULL,true,'active',22000,1200),
    ('40000017-0000-0000-0000-000000000000',v_org,'30000006-0000-0000-0000-000000000000','Kiran Das','9876540033','kiran.d@email.com','Deloitte',60000,'2025-03-01','2025-12-31',false,'moved_out',17000,1000),
    ('40000018-0000-0000-0000-000000000000',v_org,'30000006-0000-0000-0000-000000000000','Suman Rao','9876540035','suman.r@email.com','Deloitte',58000,'2025-03-01',NULL,false,'active',14000,800),
    ('40000019-0000-0000-0000-000000000000',v_org,'30000006-0000-0000-0000-000000000000','Nikhil Joshi','9876540037','nikhil.j@email.com','Deloitte',65000,'2026-01-01',NULL,false,'active',17000,1000),
    ('40000020-0000-0000-0000-000000000000',v_org,'30000007-0000-0000-0000-000000000000','Arjun Singh','9876540039','arjun.s@email.com','HCL',80000,'2025-12-15',NULL,true,'active',20000,1200),
    ('40000021-0000-0000-0000-000000000000',v_org,'30000007-0000-0000-0000-000000000000','Manoj Tiwari','9876540041','manoj.t@email.com','HCL',55000,'2025-12-15',NULL,false,'active',17000,1000),
    ('40000022-0000-0000-0000-000000000000',v_org,'30000007-0000-0000-0000-000000000000','Priyam Mandal','9876540043','priyam.m@email.com','HCL',50000,'2025-12-15',NULL,false,'active',13000,800),
    ('40000023-0000-0000-0000-000000000000',v_org,'30000008-0000-0000-0000-000000000000','Kavitha Sundaram','9876540045','kavitha.s@email.com','Wipro',72000,'2025-04-14',NULL,true,'active',18000,1200),
    ('40000024-0000-0000-0000-000000000000',v_org,'30000008-0000-0000-0000-000000000000','Meera Iyer','9876540047','meera.i@email.com','Wipro',55000,'2025-04-14',NULL,false,'active',15000,1000),
    ('40000025-0000-0000-0000-000000000000',v_org,'30000008-0000-0000-0000-000000000000','Lakshmi Priya T','9876540049','lakshmi.p@email.com','Wipro',48000,'2025-04-14',NULL,false,'active',12000,800),
    ('40000026-0000-0000-0000-000000000000',v_org,'30000009-0000-0000-0000-000000000000','Mohammed Irfan','9876540051','irfan.m@email.com','Tech Mahindra',78000,'2025-04-14',NULL,true,'active',18000,1200),
    ('40000027-0000-0000-0000-000000000000',v_org,'30000009-0000-0000-0000-000000000000','Arun Prasad','9876540053','arun.p@email.com','Tech Mahindra',55000,'2025-04-14',NULL,false,'active',15000,1000),
    ('40000028-0000-0000-0000-000000000000',v_org,'30000009-0000-0000-0000-000000000000','Ravi Teja N','9876540055','ravi.t@email.com','Tech Mahindra',50000,'2025-04-14',NULL,false,'active',12000,800),
    ('40000029-0000-0000-0000-000000000000',v_org,'30000010-0000-0000-0000-000000000000','Ravi Shankar Gupta','9876540057','ravi.g@email.com','Cognizant',85000,'2024-07-07',NULL,true,'active',21000,1200),
    ('40000030-0000-0000-0000-000000000000',v_org,'30000010-0000-0000-0000-000000000000','Deepak Mishra','9876540059','deepak.m@email.com','Cognizant',60000,'2024-07-07',NULL,false,'active',17000,1000),
    ('40000031-0000-0000-0000-000000000000',v_org,'30000010-0000-0000-0000-000000000000','Saurabh Pandey','9876540061','saurabh.p@email.com','Cognizant',52000,'2024-07-07',NULL,false,'active',13000,800),
    ('40000032-0000-0000-0000-000000000000',v_org,'30000011-0000-0000-0000-000000000000','Sanjay Kumar Yadav','9876540063','sanjay.y@email.com','Mindtree',70000,'2025-05-01',NULL,true,'active',20000,1500),
    ('40000033-0000-0000-0000-000000000000',v_org,'30000011-0000-0000-0000-000000000000','Rohit Pandey','9876540065','rohit.p@email.com','Mindtree',50000,'2025-05-01',NULL,false,'active',18350,1250),
    ('40000034-0000-0000-0000-000000000000',v_org,'30000011-0000-0000-0000-000000000000','Arun Kumar Jha','9876540067','arun.j@email.com','Mindtree',55000,'2025-05-01',NULL,false,'active',15000,1000),
    ('40000035-0000-0000-0000-000000000000',v_org,'30000012-0000-0000-0000-000000000000','Divya Rangan','9876540069','divya.r@email.com','Deloitte',82000,'2025-05-01',NULL,true,'active',19000,1200),
    ('40000036-0000-0000-0000-000000000000',v_org,'30000012-0000-0000-0000-000000000000','Shruti Kapoor','9876540071','shruti.k@email.com','Deloitte',60000,'2025-05-01',NULL,false,'active',16000,1000),
    ('40000037-0000-0000-0000-000000000000',v_org,'30000012-0000-0000-0000-000000000000','Nisha Agarwal','9876540073','nisha.a@email.com','Deloitte',55000,'2025-05-01',NULL,false,'active',12000,800),
    ('40000038-0000-0000-0000-000000000000',v_org,'30000013-0000-0000-0000-000000000000','Pooja Sharma','9876540075','pooja.s@email.com','Accenture',88000,'2025-05-01',NULL,true,'active',22000,1200),
    ('40000039-0000-0000-0000-000000000000',v_org,'30000013-0000-0000-0000-000000000000','Neha Agarwal','9876540077','neha.a2@email.com','Accenture',65000,'2025-05-01',NULL,false,'active',17350,1000),
    ('40000040-0000-0000-0000-000000000000',v_org,'30000013-0000-0000-0000-000000000000','Ritu Singh','9876540079','ritu.s@email.com','Accenture',52000,'2025-05-01',NULL,false,'active',14000,800),
    ('40000041-0000-0000-0000-000000000000',v_org,'30000015-0000-0000-0000-000000000000','Sunil Mohan','9876540081','sunil.m@email.com','Capgemini',60000,'2026-01-01',NULL,true,'active',40000,2500);

  -- 41 AGREEMENTS
  INSERT INTO agreements (id,org_id,flat_id,tenant_id,agreement_type,start_date,end_date,rent_amount,maintenance_amount,deposit_amount,status) VALUES
    ('50000001-0000-0000-0000-000000000000',v_org,'30000001-0000-0000-0000-000000000000','40000001-0000-0000-0000-000000000000','leave_and_license','2025-04-01','2026-03-02',18000,1200,50000,'signed'),
    ('50000002-0000-0000-0000-000000000000',v_org,'30000001-0000-0000-0000-000000000000','40000002-0000-0000-0000-000000000000','leave_and_license','2025-04-01','2026-03-02',15000,1000,20000,'signed'),
    ('50000003-0000-0000-0000-000000000000',v_org,'30000001-0000-0000-0000-000000000000','40000003-0000-0000-0000-000000000000','leave_and_license','2025-04-01','2026-03-02',12000,800,20000,'signed'),
    ('50000004-0000-0000-0000-000000000000',v_org,'30000002-0000-0000-0000-000000000000','40000004-0000-0000-0000-000000000000','leave_and_license','2025-02-10','2026-01-09',20000,1200,40000,'signed'),
    ('50000005-0000-0000-0000-000000000000',v_org,'30000002-0000-0000-0000-000000000000','40000005-0000-0000-0000-000000000000','leave_and_license','2025-02-10','2026-01-09',16000,1000,35000,'signed'),
    ('50000006-0000-0000-0000-000000000000',v_org,'30000002-0000-0000-0000-000000000000','40000006-0000-0000-0000-000000000000','leave_and_license','2025-02-10','2026-01-09',12000,800,25000,'signed'),
    ('50000007-0000-0000-0000-000000000000',v_org,'30000003-0000-0000-0000-000000000000','40000007-0000-0000-0000-000000000000','leave_and_license','2025-04-01','2026-03-02',20000,1200,40000,'signed'),
    ('50000008-0000-0000-0000-000000000000',v_org,'30000003-0000-0000-0000-000000000000','40000008-0000-0000-0000-000000000000','leave_and_license','2025-04-01','2026-03-02',16000,1000,35000,'signed'),
    ('50000009-0000-0000-0000-000000000000',v_org,'30000003-0000-0000-0000-000000000000','40000009-0000-0000-0000-000000000000','leave_and_license','2025-04-01','2026-03-02',12000,800,25000,'signed'),
    ('50000010-0000-0000-0000-000000000000',v_org,'30000004-0000-0000-0000-000000000000','40000010-0000-0000-0000-000000000000','leave_and_license','2024-06-01','2025-04-30',22000,1200,35000,'terminated'),
    ('50000011-0000-0000-0000-000000000000',v_org,'30000004-0000-0000-0000-000000000000','40000011-0000-0000-0000-000000000000','leave_and_license','2024-06-01','2025-04-30',17000,1000,30000,'terminated'),
    ('50000012-0000-0000-0000-000000000000',v_org,'30000004-0000-0000-0000-000000000000','40000012-0000-0000-0000-000000000000','leave_and_license','2024-06-01','2025-04-30',13000,800,23000,'terminated'),
    ('50000013-0000-0000-0000-000000000000',v_org,'30000005-0000-0000-0000-000000000000','40000013-0000-0000-0000-000000000000','leave_and_license','2025-05-01','2026-04-01',22000,1200,40000,'signed'),
    ('50000014-0000-0000-0000-000000000000',v_org,'30000005-0000-0000-0000-000000000000','40000014-0000-0000-0000-000000000000','leave_and_license','2025-05-01','2026-04-01',17000,1000,36000,'signed'),
    ('50000015-0000-0000-0000-000000000000',v_org,'30000005-0000-0000-0000-000000000000','40000015-0000-0000-0000-000000000000','leave_and_license','2025-05-01','2026-04-01',14000,800,30000,'signed'),
    ('50000016-0000-0000-0000-000000000000',v_org,'30000006-0000-0000-0000-000000000000','40000016-0000-0000-0000-000000000000','leave_and_license','2025-03-01','2026-01-30',22000,1200,35000,'signed'),
    ('50000017-0000-0000-0000-000000000000',v_org,'30000006-0000-0000-0000-000000000000','40000017-0000-0000-0000-000000000000','leave_and_license','2025-03-01','2025-12-31',17000,1000,25000,'terminated'),
    ('50000018-0000-0000-0000-000000000000',v_org,'30000006-0000-0000-0000-000000000000','40000018-0000-0000-0000-000000000000','leave_and_license','2025-03-01','2026-01-30',14000,800,20000,'signed'),
    ('50000019-0000-0000-0000-000000000000',v_org,'30000006-0000-0000-0000-000000000000','40000019-0000-0000-0000-000000000000','leave_and_license','2026-01-01','2026-11-30',17000,1000,25000,'signed'),
    ('50000020-0000-0000-0000-000000000000',v_org,'30000007-0000-0000-0000-000000000000','40000020-0000-0000-0000-000000000000','leave_and_license','2025-12-15','2026-11-14',20000,1200,40000,'signed'),
    ('50000021-0000-0000-0000-000000000000',v_org,'30000007-0000-0000-0000-000000000000','40000021-0000-0000-0000-000000000000','leave_and_license','2025-12-15','2026-11-14',17000,1000,35000,'signed'),
    ('50000022-0000-0000-0000-000000000000',v_org,'30000007-0000-0000-0000-000000000000','40000022-0000-0000-0000-000000000000','leave_and_license','2025-12-15','2026-11-14',13000,800,25000,'signed'),
    ('50000023-0000-0000-0000-000000000000',v_org,'30000008-0000-0000-0000-000000000000','40000023-0000-0000-0000-000000000000','leave_and_license','2025-04-14','2026-03-15',18000,1200,35000,'signed'),
    ('50000024-0000-0000-0000-000000000000',v_org,'30000008-0000-0000-0000-000000000000','40000024-0000-0000-0000-000000000000','leave_and_license','2025-04-14','2026-03-15',15000,1000,30000,'signed'),
    ('50000025-0000-0000-0000-000000000000',v_org,'30000008-0000-0000-0000-000000000000','40000025-0000-0000-0000-000000000000','leave_and_license','2025-04-14','2026-03-15',12000,800,25000,'signed'),
    ('50000026-0000-0000-0000-000000000000',v_org,'30000009-0000-0000-0000-000000000000','40000026-0000-0000-0000-000000000000','leave_and_license','2025-04-14','2026-03-15',18000,1200,35000,'signed'),
    ('50000027-0000-0000-0000-000000000000',v_org,'30000009-0000-0000-0000-000000000000','40000027-0000-0000-0000-000000000000','leave_and_license','2025-04-14','2026-03-15',15000,1000,30000,'signed'),
    ('50000028-0000-0000-0000-000000000000',v_org,'30000009-0000-0000-0000-000000000000','40000028-0000-0000-0000-000000000000','leave_and_license','2025-04-14','2026-03-15',12000,800,25000,'signed'),
    ('50000029-0000-0000-0000-000000000000',v_org,'30000010-0000-0000-0000-000000000000','40000029-0000-0000-0000-000000000000','leave_and_license','2024-07-07','2025-12-06',21000,1200,30000,'expired'),
    ('50000030-0000-0000-0000-000000000000',v_org,'30000010-0000-0000-0000-000000000000','40000030-0000-0000-0000-000000000000','leave_and_license','2024-07-07','2025-12-06',17000,1000,26000,'expired'),
    ('50000031-0000-0000-0000-000000000000',v_org,'30000010-0000-0000-0000-000000000000','40000031-0000-0000-0000-000000000000','leave_and_license','2024-07-07','2025-12-06',13000,800,20000,'expired'),
    ('50000032-0000-0000-0000-000000000000',v_org,'30000011-0000-0000-0000-000000000000','40000032-0000-0000-0000-000000000000','leave_and_license','2025-05-01','2026-04-01',20000,1500,40000,'signed'),
    ('50000033-0000-0000-0000-000000000000',v_org,'30000011-0000-0000-0000-000000000000','40000033-0000-0000-0000-000000000000','leave_and_license','2025-05-01','2026-04-01',18350,1250,35999,'signed'),
    ('50000034-0000-0000-0000-000000000000',v_org,'30000011-0000-0000-0000-000000000000','40000034-0000-0000-0000-000000000000','leave_and_license','2025-05-01','2026-04-01',15000,1000,30000,'signed'),
    ('50000035-0000-0000-0000-000000000000',v_org,'30000012-0000-0000-0000-000000000000','40000035-0000-0000-0000-000000000000','leave_and_license','2025-05-01','2026-04-01',19000,1200,35000,'signed'),
    ('50000036-0000-0000-0000-000000000000',v_org,'30000012-0000-0000-0000-000000000000','40000036-0000-0000-0000-000000000000','leave_and_license','2025-05-01','2026-04-01',16000,1000,32000,'signed'),
    ('50000037-0000-0000-0000-000000000000',v_org,'30000012-0000-0000-0000-000000000000','40000037-0000-0000-0000-000000000000','leave_and_license','2025-05-01','2026-04-01',12000,800,27000,'signed'),
    ('50000038-0000-0000-0000-000000000000',v_org,'30000013-0000-0000-0000-000000000000','40000038-0000-0000-0000-000000000000','leave_and_license','2025-05-01','2026-04-01',22000,1200,40000,'signed'),
    ('50000039-0000-0000-0000-000000000000',v_org,'30000013-0000-0000-0000-000000000000','40000039-0000-0000-0000-000000000000','leave_and_license','2025-05-01','2026-04-01',17350,1000,36700,'signed'),
    ('50000040-0000-0000-0000-000000000000',v_org,'30000013-0000-0000-0000-000000000000','40000040-0000-0000-0000-000000000000','leave_and_license','2025-05-01','2026-04-01',14000,800,30000,'signed'),
    ('50000041-0000-0000-0000-000000000000',v_org,'30000015-0000-0000-0000-000000000000','40000041-0000-0000-0000-000000000000','leave_and_license','2026-01-01','2026-11-30',40000,2500,40000,'signed');

  -- DEPOSITS
  INSERT INTO deposits (org_id,flat_id,tenant_id,type,amount,mode,reference_number,date) VALUES
    (v_org,'30000001-0000-0000-0000-000000000000','40000001-0000-0000-0000-000000000000','initial',50000,'neft','NEFT20250401001','2025-03-28'),
    (v_org,'30000002-0000-0000-0000-000000000000','40000004-0000-0000-0000-000000000000','initial',40000,'neft','NEFT20250210001','2025-02-08'),
    (v_org,'30000003-0000-0000-0000-000000000000','40000007-0000-0000-0000-000000000000','initial',40000,'upi','UPI20250401002','2025-03-28'),
    (v_org,'30000005-0000-0000-0000-000000000000','40000013-0000-0000-0000-000000000000','initial',40000,'neft','NEFT20250501001','2025-04-28'),
    (v_org,'30000006-0000-0000-0000-000000000000','40000016-0000-0000-0000-000000000000','initial',35000,'neft','NEFT20250301001','2025-02-26'),
    (v_org,'30000007-0000-0000-0000-000000000000','40000020-0000-0000-0000-000000000000','initial',40000,'cheque','CHQ-551234','2025-12-12'),
    (v_org,'30000008-0000-0000-0000-000000000000','40000023-0000-0000-0000-000000000000','initial',35000,'neft','NEFT20250414001','2025-04-12'),
    (v_org,'30000009-0000-0000-0000-000000000000','40000026-0000-0000-0000-000000000000','initial',35000,'upi','UPI20250414002','2025-04-12'),
    (v_org,'30000010-0000-0000-0000-000000000000','40000029-0000-0000-0000-000000000000','initial',30000,'neft','NEFT20240707001','2024-07-05'),
    (v_org,'30000011-0000-0000-0000-000000000000','40000032-0000-0000-0000-000000000000','initial',40000,'neft','NEFT20250501002','2025-04-28'),
    (v_org,'30000012-0000-0000-0000-000000000000','40000035-0000-0000-0000-000000000000','initial',35000,'cheque','CHQ-667890','2025-04-28'),
    (v_org,'30000013-0000-0000-0000-000000000000','40000038-0000-0000-0000-000000000000','initial',40000,'neft','NEFT20250501003','2025-04-28'),
    (v_org,'30000015-0000-0000-0000-000000000000','40000041-0000-0000-0000-000000000000','initial',40000,'upi','UPI20260101001','2025-12-28');

  -- RENT DEMANDS (Jan-Mar 2026)
  INSERT INTO rent_demands (org_id,flat_id,billing_month,rent_amount,maintenance_amount,due_date,status) VALUES
    (v_org,'30000001-0000-0000-0000-000000000000','2026-01',45000,3000,'2026-01-01','paid'),
    (v_org,'30000001-0000-0000-0000-000000000000','2026-02',45000,3000,'2026-02-01','paid'),
    (v_org,'30000001-0000-0000-0000-000000000000','2026-03',45000,3000,'2026-03-01','pending'),
    (v_org,'30000002-0000-0000-0000-000000000000','2026-01',48000,3000,'2026-01-01','paid'),
    (v_org,'30000002-0000-0000-0000-000000000000','2026-02',48000,3000,'2026-02-01','paid'),
    (v_org,'30000002-0000-0000-0000-000000000000','2026-03',48000,3000,'2026-03-01','pending'),
    (v_org,'30000003-0000-0000-0000-000000000000','2026-01',48000,3000,'2026-01-01','paid'),
    (v_org,'30000003-0000-0000-0000-000000000000','2026-02',48000,3000,'2026-02-01','paid'),
    (v_org,'30000003-0000-0000-0000-000000000000','2026-03',48000,3000,'2026-03-01','pending'),
    (v_org,'30000005-0000-0000-0000-000000000000','2026-01',53000,3000,'2026-01-01','paid'),
    (v_org,'30000005-0000-0000-0000-000000000000','2026-02',53000,3000,'2026-02-01','paid'),
    (v_org,'30000005-0000-0000-0000-000000000000','2026-03',53000,3000,'2026-03-01','pending'),
    (v_org,'30000006-0000-0000-0000-000000000000','2026-01',53000,3000,'2026-01-01','paid'),
    (v_org,'30000006-0000-0000-0000-000000000000','2026-02',53000,3000,'2026-02-01','overdue'),
    (v_org,'30000007-0000-0000-0000-000000000000','2026-01',50000,3000,'2026-01-01','paid'),
    (v_org,'30000007-0000-0000-0000-000000000000','2026-02',50000,3000,'2026-02-01','paid'),
    (v_org,'30000007-0000-0000-0000-000000000000','2026-03',50000,3000,'2026-03-01','pending'),
    (v_org,'30000015-0000-0000-0000-000000000000','2026-01',40000,2500,'2026-01-01','paid'),
    (v_org,'30000015-0000-0000-0000-000000000000','2026-02',40000,2500,'2026-02-01','paid'),
    (v_org,'30000015-0000-0000-0000-000000000000','2026-03',40000,2500,'2026-03-01','pending');

  -- VENDORS
  INSERT INTO vendors (org_id,name,category,phone,email,address,rating,is_active) VALUES
    (v_org,'Otis Elevator India','general','+91 40 2345 1111','service@otis.co.in','Madhapur, Hyderabad',5,true),
    (v_org,'SecureGuard Services','security','+91 40 2345 2222','ops@secureguard.in','Gachibowli, Hyderabad',4,true),
    (v_org,'CleanPro Facility','cleaning','+91 40 2345 3333','info@cleanpro.in','Kondapur, Hyderabad',4,true),
    (v_org,'Sri Lakshmi Plumbers','plumber','+91 98765 11111',NULL,'Jubilee Hills, Hyderabad',3,true),
    (v_org,'Asian Paints Services','painter','+91 40 2345 4444','service@asianpaints.com','Kukatpally, Hyderabad',5,true),
    (v_org,'Quick Fix Electricals','electrician','+91 98765 22222','quickfix@gmail.com','Miyapur, Hyderabad',4,true);

  -- EXPENSES
  INSERT INTO expenses (org_id,category,description,amount,date,is_recurring) VALUES
    (v_org,'maintenance','Lift AMC',48000,'2026-01-15',true),
    (v_org,'repair','Plumbing repair Flat 101',3500,'2026-01-22',false),
    (v_org,'security','Security wages Jan',35000,'2026-01-31',true),
    (v_org,'security','Security wages Feb',35000,'2026-02-28',true),
    (v_org,'cleaning','Housekeeping Jan',18000,'2026-01-31',true),
    (v_org,'cleaning','Housekeeping Feb',18000,'2026-02-28',true),
    (v_org,'electricity','Common electricity Jan',12500,'2026-02-05',true),
    (v_org,'electricity','Common electricity Feb',11800,'2026-03-05',true),
    (v_org,'insurance','Building insurance Q1',65000,'2026-01-10',false),
    (v_org,'legal','Agreement registration x3',4500,'2026-02-15',false),
    (v_org,'other','Property tax H1',125000,'2026-01-20',false),
    (v_org,'maintenance','Generator diesel Jan',7500,'2026-01-25',true),
    (v_org,'maintenance','Painting common areas',45000,'2026-02-10',false);

  -- COMPLAINTS
  INSERT INTO complaints (org_id,flat_id,complaint_number,date,category,description,priority,reported_by,status) VALUES
    (v_org,'30000001-0000-0000-0000-000000000000','CMP-001','2026-01-10','plumbing','Bathroom ceiling leak','high','Rajesh Kumar Sharma','open'),
    (v_org,'30000003-0000-0000-0000-000000000000','CMP-002','2026-01-18','electrical','AC compressor noise','medium','Vikram Reddy','in_progress'),
    (v_org,'30000005-0000-0000-0000-000000000000','CMP-003','2026-02-05','other','Wall crack in living room','high','Ananya Krishnamurthy','open'),
    (v_org,'30000009-0000-0000-0000-000000000000','CMP-004','2026-01-25','plumbing','Kitchen sink slow drainage','low','Mohammed Irfan','resolved'),
    (v_org,'30000013-0000-0000-0000-000000000000','CMP-005','2026-02-12','electrical','Frequent voltage drops','high','Pooja Sharma','open');

  -- COMPLIANCE
  INSERT INTO compliance_items (org_id,name,category,due_date,status) VALUES
    (v_org,'Fire Safety Certificate','safety','2026-06-30','complete'),
    (v_org,'Property Tax H2','tax','2026-09-30','pending'),
    (v_org,'TDS Return Q4','tax','2026-01-31','complete'),
    (v_org,'Lift Safety Inspection','safety','2026-04-15','pending'),
    (v_org,'Building Insurance Renewal','insurance','2026-12-31','complete'),
    (v_org,'Police Verification','legal','2026-03-31','pending'),
    (v_org,'Water Tank Cleaning Q1','maintenance','2026-03-31','overdue'),
    (v_org,'Society AGM','legal','2026-06-30','not_due');

  -- DOCUMENTS (KYC + Agreements + Building)
  INSERT INTO documents (org_id,flat_id,tenant_id,doc_type,file_name,file_url,expiry_date,is_verified) VALUES
    (v_org,'30000001-0000-0000-0000-000000000000','40000001-0000-0000-0000-000000000000','agreement','agr_101_rajesh.pdf','/docs/agr_101.pdf','2026-03-02',true),
    (v_org,'30000002-0000-0000-0000-000000000000','40000004-0000-0000-0000-000000000000','agreement','agr_102_sneha.pdf','/docs/agr_102.pdf','2026-01-09',true),
    (v_org,'30000005-0000-0000-0000-000000000000','40000013-0000-0000-0000-000000000000','agreement','agr_105_ananya.pdf','/docs/agr_105.pdf','2026-04-01',true),
    (v_org,'30000007-0000-0000-0000-000000000000','40000020-0000-0000-0000-000000000000','agreement','agr_107_arjun.pdf','/docs/agr_107.pdf','2026-11-14',true),
    (v_org,'30000008-0000-0000-0000-000000000000','40000023-0000-0000-0000-000000000000','agreement','agr_301_kavitha.pdf','/docs/agr_301.pdf','2026-03-15',true),
    (v_org,'30000001-0000-0000-0000-000000000000','40000001-0000-0000-0000-000000000000','kyc','aadhaar_rajesh.pdf','/docs/kyc/aadhaar_rajesh.pdf',NULL,true),
    (v_org,'30000002-0000-0000-0000-000000000000','40000004-0000-0000-0000-000000000000','kyc','aadhaar_sneha.pdf','/docs/kyc/aadhaar_sneha.pdf',NULL,true),
    (v_org,'30000003-0000-0000-0000-000000000000','40000007-0000-0000-0000-000000000000','kyc','aadhaar_vikram.pdf','/docs/kyc/aadhaar_vikram.pdf',NULL,true),
    (v_org,'30000005-0000-0000-0000-000000000000','40000013-0000-0000-0000-000000000000','kyc','aadhaar_ananya.pdf','/docs/kyc/aadhaar_ananya.pdf',NULL,true),
    (v_org,'30000006-0000-0000-0000-000000000000','40000016-0000-0000-0000-000000000000','kyc','aadhaar_rahul.pdf','/docs/kyc/aadhaar_rahul.pdf',NULL,true),
    (v_org,'30000007-0000-0000-0000-000000000000','40000020-0000-0000-0000-000000000000','kyc','aadhaar_arjun.pdf','/docs/kyc/aadhaar_arjun.pdf',NULL,false),
    (v_org,'30000008-0000-0000-0000-000000000000','40000023-0000-0000-0000-000000000000','kyc','aadhaar_kavitha.pdf','/docs/kyc/aadhaar_kavitha.pdf',NULL,true),
    (v_org,'30000009-0000-0000-0000-000000000000','40000026-0000-0000-0000-000000000000','kyc','aadhaar_irfan.pdf','/docs/kyc/aadhaar_irfan.pdf',NULL,true),
    (v_org,'30000001-0000-0000-0000-000000000000','40000001-0000-0000-0000-000000000000','kyc','pan_rajesh.pdf','/docs/kyc/pan_rajesh.pdf',NULL,true),
    (v_org,'30000002-0000-0000-0000-000000000000','40000004-0000-0000-0000-000000000000','kyc','pan_sneha.pdf','/docs/kyc/pan_sneha.pdf',NULL,true),
    (v_org,'30000005-0000-0000-0000-000000000000','40000013-0000-0000-0000-000000000000','kyc','pan_ananya.pdf','/docs/kyc/pan_ananya.pdf',NULL,true),
    (v_org,'30000006-0000-0000-0000-000000000000','40000016-0000-0000-0000-000000000000','kyc','pan_rahul.pdf','/docs/kyc/pan_rahul.pdf',NULL,true),
    (v_org,'30000008-0000-0000-0000-000000000000','40000023-0000-0000-0000-000000000000','kyc','pan_kavitha.pdf','/docs/kyc/pan_kavitha.pdf',NULL,true),
    (v_org,NULL,NULL,'insurance','building_insurance_2025.pdf','/docs/insurance.pdf','2026-12-31',true),
    (v_org,NULL,NULL,'tax','ptax_h1_2025.pdf','/docs/ptax_h1.pdf',NULL,true),
    (v_org,NULL,NULL,'compliance','fire_noc_2025.pdf','/docs/fire_noc.pdf','2026-06-30',true),
    (v_org,NULL,NULL,'compliance','lift_safety_cert.pdf','/docs/lift_safety.pdf','2026-04-15',true);

  RAISE NOTICE '✅ SEED COMPLETE! 16 flats, 41 tenants, 41 agreements, 13 deposits, 20 demands, 6 vendors, 13 expenses, 5 complaints, 8 compliance, 22 documents';
END $$;
