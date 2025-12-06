-- SQL Script to Create Partner/Roofer Account
-- Run this in Supabase SQL Editor after creating an auth user

-- Step 1: Create the auth user first via Supabase Dashboard:
-- Go to Authentication → Users → Add User → Create New User
-- Note the user ID that gets created

-- Step 2: Update this script with the actual auth user ID and run it:

-- Example: Create a roofer account
-- Replace 'auth-user-id-here' with the actual UUID from auth.users table
INSERT INTO public.users (id, email, full_name, role, company_name)
VALUES (
  'auth-user-id-here',  -- Replace with actual auth user ID
  'partner@cedarcityroofers.com',
  'Partner Name',
  'roofer',
  'Cedar City Roofers'
)
ON CONFLICT (id) DO UPDATE
SET 
  role = 'roofer',
  company_name = 'Cedar City Roofers';

-- To create an admin account instead:
-- UPDATE public.users 
-- SET role = 'admin' 
-- WHERE email = 'admin@cedarcityroofers.com';

-- To check existing users:
-- SELECT id, email, full_name, role, created_at 
-- FROM public.users 
-- ORDER BY created_at DESC;

-- To update a user's role:
-- UPDATE public.users 
-- SET role = 'roofer' 
-- WHERE email = 'user@example.com';

