# Partner/Roofer Login Guide

This guide explains how partners and roofers can access the back office dashboard.

## Quick Access

Partners can access the login page in two ways:

1. **From the Landing Page Footer**
   - Scroll to the bottom of the homepage
   - Click **"Partner / Roofer Login"** link in the footer
   - This takes you directly to `/login`

2. **Direct URL**
   - Navigate to: `http://localhost:8080/login` (development)
   - Or: `https://yourdomain.com/login` (production)

## Login Process

1. **Enter Credentials**
   - Email: Your registered email address
   - Password: Your account password

2. **Click "Sign In"**
   - You'll be authenticated via Supabase
   - Redirected to `/dashboard` automatically

3. **Access Back Office**
   - Once logged in, you'll see the full dashboard
   - All back office features are available

## What Partners Can Access

When logged in as a **Roofer** or **Admin**, you have access to:

### ✅ Full Back Office Features

- **Dashboard**: Overview with stats, revenue, and upcoming appointments
- **Leads Management**: View, filter, search, and manage all leads
- **Appointments**: Schedule and manage appointments with calendar view
- **Projects**: Track all projects through their lifecycle
- **Proposals**: Create and manage proposals for clients
- **Revenue Analytics**: View revenue charts and performance metrics
- **Messages**: Communicate with clients
- **Settings**: Manage your profile and preferences

### 🔒 Role-Based Access

- **Roofer Role**: Full access to all back office features
- **Admin Role**: Everything roofer has, plus team management
- **Client Role**: Limited to their own projects and appointments

## Creating Partner Accounts

### Method 1: Self-Registration (Recommended)

1. Go to `/register`
2. Fill in:
   - Full Name
   - Email
   - **Account Type**: Select **"Roofer / Partner"**
   - Password
3. Click "Create Account"
4. Verify email (if email confirmation is enabled)
5. Log in at `/login`

### Method 2: Admin Creates Account

An admin can create partner accounts via:
- Supabase Dashboard → Authentication → Users
- Or SQL script (see `scripts/create-partner-account.sql`)

## Troubleshooting Login Issues

### "Invalid login credentials"
- Verify your email and password are correct
- Check if your account exists in Supabase
- Ensure your user profile exists in the `users` table

### "Supabase not configured"
- Make sure `.env` file has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Restart the dev server after adding environment variables

### "Access denied" or redirected to dashboard
- Check your user role in Supabase `users` table
- Should be `'roofer'` or `'admin'` (not `'client'`)
- Log out and log back in to refresh session

### Can't see back office features
- Verify your role is `'roofer'` or `'admin'`
- Check Supabase: Table Editor → `users` → your email → `role` column
- Update role if needed:
  ```sql
  UPDATE public.users 
  SET role = 'roofer' 
  WHERE email = 'your-email@example.com';
  ```

## First-Time Setup

If this is your first time setting up:

1. **Follow `SUPABASE_SETUP.md`** for complete setup instructions
2. **Run the database schema** (`supabase/schema.sql`) in Supabase SQL Editor
3. **Create your first partner account** using one of the methods above
4. **Test login** to verify everything works

## Security Notes

- All authentication is handled by Supabase Auth
- Passwords are securely hashed (never stored in plain text)
- Row Level Security (RLS) policies protect your data
- Each user can only access data they're authorized to see

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify Supabase project is active
3. Check that database schema was run
4. Verify your user role in the `users` table
5. See `SUPABASE_SETUP.md` for detailed troubleshooting

---

**Back Office URL**: `/dashboard`  
**Login URL**: `/login`  
**Registration URL**: `/register`

