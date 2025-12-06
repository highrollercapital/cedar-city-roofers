# Fix Login Issue for hassan@cedarcityroofing.com

If `hassan@cedarcityroofing.com` can't log in, follow these steps:

## Step 1: Verify User Exists in Supabase Auth

1. Go to Supabase Dashboard → **Authentication** → **Users**
2. Find `hassan@cedarcityroofing.com`
3. Verify:
   - ✅ User exists
   - ✅ User is **confirmed** (not pending)
   - ✅ User has a password set

## Step 2: Check User Profile Exists

1. Go to **Table Editor** → `users` table
2. Search for `hassan@cedarcityroofing.com`
3. If the user profile **doesn't exist**, create it (see Step 3)

## Step 3: Create User Profile (if missing)

### Option A: Via SQL Editor (Recommended)

1. Get the user's UUID:
   - Go to **Authentication** → **Users**
   - Click on `hassan@cedarcityroofing.com`
   - Copy the **UUID** (long string like `123e4567-e89b-12d3-a456-426614174000`)

2. Go to **SQL Editor** → **New Query**

3. Run this SQL (replace `USER_UUID_HERE` with the actual UUID):

```sql
INSERT INTO public.users (id, email, full_name, role, company_name)
VALUES (
  'USER_UUID_HERE',  -- Paste the UUID here
  'hassan@cedarcityroofing.com',
  'Hassan',
  'roofer',  -- or 'admin' for admin access
  'Cedar City Roofers'
)
ON CONFLICT (id) DO UPDATE
SET 
  email = EXCLUDED.email,
  role = COALESCE(EXCLUDED.role, users.role),
  updated_at = NOW();
```

4. Click **Run**

### Option B: Via Table Editor

1. Go to **Table Editor** → `users`
2. Click **Insert** → **Insert Row**
3. Fill in:
   - **id**: Copy UUID from Authentication → Users
   - **email**: `hassan@cedarcityroofing.com`
   - **full_name**: `Hassan`
   - **role**: `roofer` (or `admin`)
   - **company_name**: `Cedar City Roofers`
4. Click **Save**

## Step 4: Set User Role

Make sure the user has the correct role:

1. In **Table Editor** → `users`
2. Find the user
3. Check the **role** column:
   - Should be `roofer` or `admin` for back office access
   - If it's `client`, update it to `roofer`

Or run this SQL:

```sql
UPDATE public.users 
SET role = 'roofer'  -- or 'admin'
WHERE email = 'hassan@cedarcityroofing.com';
```

## Step 5: Verify User Metadata (Optional)

1. Go to **Authentication** → **Users**
2. Click on `hassan@cedarcityroofing.com`
3. Scroll to **User Metadata**
4. Add/verify:
   - **full_name**: `Hassan`
   - **role**: `roofer` (or `admin`)

## Step 6: Test Login

1. Go to `/login`
2. Enter:
   - **Email**: `hassan@cedarcityroofing.com`
   - **Password**: (the password set in Supabase)
3. Click **Sign In**

## Common Issues

### "Invalid login credentials"
- Check password is correct in Supabase
- User might need to reset password
- Go to Authentication → Users → Reset Password

### "User profile not found"
- Run Step 3 above to create the profile
- Check that the UUID matches between Auth and users table

### "Access denied" or wrong dashboard
- Check user role in `users` table
- Should be `roofer` or `admin` for back office
- Update role if needed (see Step 4)

### User can't see back office features
- Verify role is `roofer` or `admin` (not `client`)
- Log out and log back in to refresh session

## Quick SQL Check

Run this to see all user info:

```sql
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.role,
  u.created_at,
  au.email_confirmed_at,
  au.last_sign_in_at
FROM public.users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.email = 'hassan@cedarcityroofing.com';
```

This will show if the user exists in both tables and their current status.

