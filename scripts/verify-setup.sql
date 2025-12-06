-- Verification Script for Supabase Setup
-- Run this in Supabase SQL Editor to verify everything is set up correctly

-- 1. Check if all tables exist
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'users', 'leads', 'projects', 'appointments', 
    'proposals', 'contracts', 'messages', 'automation_logs',
    'email_templates', 'sms_templates', 'settings', 'team_members'
  )
ORDER BY table_name;

-- 2. Check if RLS is enabled on all tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'users', 'leads', 'projects', 'appointments', 
    'proposals', 'contracts', 'messages'
  )
ORDER BY tablename;

-- 3. Check if policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 4. Check if trigger functions exist
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('handle_new_user', 'update_updated_at_column')
ORDER BY routine_name;

-- 5. Check existing users (if any)
SELECT 
  id,
  email,
  full_name,
  role,
  company_name,
  created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 10;

-- 6. Check if enums are created
SELECT 
  t.typname as enum_name,
  e.enumlabel as enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname IN ('user_role', 'lead_status', 'project_stage', 'proposal_status', 'urgency_level')
ORDER BY t.typname, e.enumsortorder;

-- Expected Results:
-- 1. Should show 12 tables
-- 2. Should show all tables with rowsecurity = true
-- 3. Should show multiple policies for each table
-- 4. Should show 2 trigger functions
-- 5. May be empty if no users created yet
-- 6. Should show 5 enums with their values

