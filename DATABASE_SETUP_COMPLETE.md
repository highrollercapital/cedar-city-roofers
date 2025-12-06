# ✅ Database Setup - Complete Instructions

## 🎯 Your Connection Info

**Direct PostgreSQL Connection:**
```
postgresql://postgres:cedarcityroofing@db.nnvllbxleujvqoyfqgqe.supabase.co:5432/postgres
```

**Supabase Project URL:**
```
https://nnvllbxleujvqoyfqgqe.supabase.co
```

**Project ID:** `nnvllbxleujvqoyfqgqe`

---

## 📋 Step-by-Step Setup

### Step 1: Run Database Schema (REQUIRED)

**Option A: Supabase SQL Editor (Easiest - Recommended)**

1. Go to: https://supabase.com/dashboard
2. Select: **"Cedar City Roofers"** project
3. Click: **"SQL Editor"** → **"New query"**
4. Open: `supabase/schema.sql` from this project
5. Copy **ALL** contents (Ctrl+A, Ctrl+C)
6. Paste into SQL Editor
7. Click **"Run"** button
8. Wait for "Success" ✅

**Option B: Direct PostgreSQL (If you have psql)**

```bash
# Windows PowerShell
$env:PGPASSWORD="cedarcityroofing"
psql -h db.nnvllbxleujvqoyfqgqe.supabase.co -U postgres -d postgres -p 5432 -f supabase/schema.sql
```

### Step 2: Get Supabase Anon Key

1. Supabase Dashboard → **Settings** → **API**
2. Copy the **"anon"** or **"public"** key
3. It starts with `eyJ...`

### Step 3: Update .env File

The `.env` file has been created with your project URL. Just add your anon key:

```env
VITE_SUPABASE_URL=https://nnvllbxleujvqoyfqgqe.supabase.co
VITE_SUPABASE_ANON_KEY=paste-your-anon-key-here
```

### Step 4: Verify Tables

In Supabase Dashboard:
1. Click **"Table Editor"**
2. You should see: `users`, `leads`, `projects`, `appointments`, `proposals`, `contracts`, `messages`, etc.

### Step 5: Restart Dev Server

```bash
# Stop current server (Ctrl+C)
npm run dev
```

---

## ✅ What Gets Created

### Tables (13):
- `users` - User profiles
- `leads` - Lead management
- `projects` - Project tracking
- `appointments` - Calendar/appointments
- `proposals` - Proposals/quotes
- `contracts` - Contracts
- `messages` - Client communication
- `project_media` - Photos/videos
- `project_notes` - Project notes
- `automation_logs` - Automation tracking
- `email_templates` - Email templates
- `sms_templates` - SMS templates
- `settings` - App settings
- `team_members` - Team management

### Enums (5):
- `user_role` - admin, roofer, client
- `lead_status` - new, contacted, booked, etc.
- `project_stage` - inspection, quote_sent, etc.
- `proposal_status` - draft, sent, signed, etc.
- `urgency_level` - low, medium, high, urgent

### Security:
- Row Level Security (RLS) enabled on all tables
- Policies for role-based access
- Triggers for automatic profile creation

---

## 🧪 Test After Setup

1. **Test Registration**
   - Go to `/register`
   - Select "Roofer / Partner"
   - Enter access code: `370105`
   - Create account

2. **Test Login**
   - Go to `/login`
   - Sign in with your credentials
   - Should redirect to dashboard

3. **Test Lead Capture**
   - Go to homepage
   - Fill out lead form
   - Submit
   - Check Supabase → Table Editor → `leads` table

4. **Test Dashboard**
   - View leads, appointments, projects
   - All should load from Supabase

---

## 🆘 Troubleshooting

**"Connection error" or "Failed to fetch"**
- ✅ Database schema is run? (Step 1)
- ✅ .env file has correct URL and anon key?
- ✅ Dev server restarted after .env changes?
- ✅ Supabase project is active (not paused)?

**"Sign in failed"**
- ✅ User exists in Supabase Auth?
- ✅ Database schema is run? (creates `users` table)
- ✅ Check Supabase → Authentication → Users

**"No tables found"**
- ✅ Run database schema (Step 1)
- ✅ Check Supabase → Table Editor

---

## 📚 Additional Resources

- `QUICK_DATABASE_SETUP.md` - 2-minute quick guide
- `SETUP_DATABASE_NOW.md` - Detailed setup methods
- `GET_ANON_KEY.md` - How to get your anon key
- `COMPLETE_SETUP_GUIDE.md` - Full setup guide

---

**Need help?** All database functions are connected to your Supabase project. Just run the schema and you're good to go! 🚀

