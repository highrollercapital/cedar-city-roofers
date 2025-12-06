# 🚨 START HERE - Database Setup Required!

**Your Supabase project has 0 tables. You MUST set up the database first!**

## ⚡ Quick Setup (5 Minutes)

### Step 1: Run Database Schema (DO THIS FIRST!)

1. Go to [supabase.com](https://supabase.com) → **"Cedar City Roofers"** project
2. Click **SQL Editor** → **New Query**
3. Open `supabase/schema.sql` from this project
4. **Copy the ENTIRE file** (all 400+ lines)
5. **Paste** into SQL Editor
6. Click **Run**
7. ✅ Wait for "Success" message

### Step 2: Verify Tables Exist

1. Go to **Table Editor** in Supabase
2. You should see: `users`, `leads`, `projects`, `appointments`, etc.
3. ✅ If you see these tables, you're good!

### Step 3: Get Supabase Credentials

1. Go to **Settings** → **API**
2. Copy:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJ...`

### Step 4: Create .env File

In project root, create `.env`:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 5: Restart Server

```bash
npm run dev
```

## ✅ Test It

1. Go to `/register`
2. Enter access code: `370105`
3. Create account
4. Should work now!

---

**If you get "connection error"**: The database schema wasn't run. Go back to Step 1!

See `COMPLETE_SETUP_GUIDE.md` for detailed instructions.

