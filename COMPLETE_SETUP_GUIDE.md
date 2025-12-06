# Complete Setup Guide - Cedar City Roofers

**IMPORTANT**: Follow these steps in order. The database MUST be set up first!

## Step 1: Set Up Database Schema (CRITICAL - DO THIS FIRST!)

Your Supabase project has **0 tables**. You MUST create them before anything will work.

### 1.1: Open Supabase SQL Editor

1. Go to [supabase.com](https://supabase.com)
2. Open your **"Cedar City Roofers"** project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### 1.2: Run the Schema

1. Open the file `supabase/schema.sql` from this project
2. **Copy the ENTIRE file** (all 400+ lines)
3. **Paste** into the SQL Editor
4. Click **Run** (or press Ctrl+Enter)
5. Wait for completion (should see "Success" message)

### 1.3: Verify Tables Were Created

1. Go to **Table Editor** in Supabase
2. You should now see these tables:
   - ✅ `users`
   - ✅ `leads`
   - ✅ `projects`
   - ✅ `appointments`
   - ✅ `proposals`
   - ✅ `contracts`
   - ✅ `messages`
   - And more...

**If you don't see these tables, the schema didn't run successfully. Try again.**

## Step 2: Get Your Supabase Credentials

1. In Supabase, go to **Settings** (⚙️) → **API**
2. Copy:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJ...` (long string)

## Step 3: Create .env File

1. In your project root, create `.env` file
2. Add (replace with YOUR values):

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important:**
- No trailing slash on URL
- No quotes around values
- Use exact values from Supabase

## Step 4: Restart Dev Server

```bash
# Stop server (Ctrl+C)
npm run dev
```

## Step 5: Test Registration

1. Go to `http://localhost:8080/register`
2. Fill in:
   - Full Name
   - Email
   - **Access Code**: `370105`
   - Password (min 6 characters)
   - Confirm Password
3. Click "Create Partner Account"
4. You should be redirected to dashboard

## Step 6: Test Login

1. Go to `http://localhost:8080/login`
2. Enter email and password
3. Should redirect to `/dashboard` (back office)

## Troubleshooting

### "Connection error" or "Failed to fetch"

**Most likely cause**: Database tables don't exist!

1. ✅ Go to Supabase → Table Editor
2. ✅ Check if `users` table exists
3. ✅ If NO tables exist, run Step 1 again (run `schema.sql`)
4. ✅ Make sure you copied the ENTIRE schema file
5. ✅ Check for errors in SQL Editor

### "relation does not exist"

- Database schema wasn't run
- Go back to Step 1 and run `supabase/schema.sql`

### "Invalid login credentials"

- Check password is correct
- User might need to be created in Supabase first
- Or use registration with access code `370105`

### Still getting connection errors?

1. **Verify Supabase URL works**: Paste your URL in browser, should show Supabase page
2. **Check project is active**: Not paused in Supabase dashboard
3. **Verify .env file**: Must be in project root, correct variable names
4. **Restart dev server**: Environment variables only load on startup
5. **Check browser console**: Look for specific error messages

## Access Code

- **Partner Registration**: Access code `370105` required
- Users with this code become `roofer` role
- Can access full back office dashboard

## What Gets Saved

All data is saved to your **"Cedar City Roofers"** Supabase project:
- User accounts
- Leads from website
- Projects
- Appointments
- Proposals & contracts
- Messages
- Everything!

---

**Remember**: Database schema MUST be set up first, or nothing will work!

