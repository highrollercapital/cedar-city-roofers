-- SQL Script to Create User Profile for hassan@cedarcityroofing.com
-- Run this in Supabase SQL Editor if the user profile doesn't exist

-- Step 1: Get the user's UUID from Authentication
-- Go to: Authentication → Users → Find hassan@cedarcityroofing.com
-- Copy the UUID (it's in the user's row)

-- Step 2: Replace 'USER_UUID_HERE' below with the actual UUID
-- Step 3: Run this script

INSERT INTO public.users (id, email, full_name, role, company_name)
VALUES (
  'USER_UUID_HERE',  -- Replace with actual UUID from Authentication → Users
  'hassan@cedarcityroofing.com',
  'Hassan',  -- Update with actual name
  'roofer',  -- or 'admin' for admin access
  'Cedar City Roofers'
)
ON CONFLICT (id) DO UPDATE
SET 
  email = EXCLUDED.email,
  full_name = COALESCE(EXCLUDED.full_name, users.full_name),
  role = COALESCE(EXCLUDED.role, users.role),
  company_name = COALESCE(EXCLUDED.company_name, users.company_name),
  updated_at = NOW();

-- To check if user profile exists:
-- SELECT id, email, full_name, role, created_at 
-- FROM public.users 
-- WHERE email = 'hassan@cedarcityroofing.com';

-- To update user role:
-- UPDATE public.users 
-- SET role = 'roofer'  -- or 'admin'
-- WHERE email = 'hassan@cedarcityroofing.com';

