# Supabase Connection Guide - Cedar City Roofers Project

This guide verifies that all site functions are connected to your "Cedar City Roofers" Supabase project.

## ✅ What's Already Connected

All features are configured to use your Supabase project:

### 1. Authentication ✅
- **Location**: `src/contexts/AuthContext.tsx`
- **Connected to**: Supabase Auth
- **Saves to**: `auth.users` table (managed by Supabase)
- **User profiles**: `public.users` table

### 2. Lead Capture Form ✅
- **Location**: `src/components/LeadCaptureForm.tsx`
- **Connected to**: `public.leads` table
- **Saves**: Name, email, phone, roof type, notes
- **Status**: Automatically set to 'new'

### 3. Dashboard Features ✅

#### Leads Management
- **Location**: `src/pages/dashboard/Leads.tsx`
- **Connected to**: `public.leads` table
- **Operations**: Create, Read, Update, Filter, Search, Export

#### Appointments
- **Location**: `src/pages/dashboard/Appointments.tsx`
- **Connected to**: `public.appointments` table
- **Operations**: Create, Read, Update, Calendar view

#### Projects
- **Location**: `src/pages/dashboard/Projects.tsx`
- **Connected to**: `public.projects` table
- **Operations**: Create, Read, Update, Track stages

#### Proposals
- **Location**: `src/pages/dashboard/Proposals.tsx`
- **Connected to**: `public.proposals` table
- **Operations**: Create, Read, Update, Track status

#### Revenue Dashboard
- **Location**: `src/pages/dashboard/Revenue.tsx`
- **Connected to**: `public.projects` table
- **Operations**: Read revenue data, Generate charts

#### Messages
- **Location**: `src/pages/dashboard/Messages.tsx`
- **Connected to**: `public.messages` table
- **Operations**: Send, Read messages

## 🔧 Setup Checklist

### Step 1: Database Schema (CRITICAL)

**Must be done first!**

1. Go to Supabase → **"Cedar City Roofers"** project
2. **SQL Editor** → **New Query**
3. Copy entire `supabase/schema.sql` file
4. Paste and **Run**
5. Verify tables exist in **Table Editor**

**Without this, nothing will work!**

### Step 2: Environment Variables

Create `.env` file in project root:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Get these from: Supabase → Settings → API

### Step 3: Restart Dev Server

```bash
npm run dev
```

## 🧪 Verification Tests

### Test 1: Lead Capture
1. Go to homepage (`/`)
2. Fill out lead capture form
3. Submit
4. Check Supabase → Table Editor → `leads` table
5. ✅ Should see new lead entry

### Test 2: User Registration
1. Go to `/register`
2. Enter access code: `370105`
3. Create account
4. Check Supabase → Authentication → Users
5. Check Supabase → Table Editor → `users` table
6. ✅ Should see user in both places

### Test 3: Login
1. Go to `/login`
2. Sign in with credentials
3. Should redirect to `/dashboard`
4. ✅ Should see back office dashboard

### Test 4: Create Lead in Dashboard
1. Log in as partner
2. Go to `/dashboard/leads`
3. Click "Create Lead"
4. Fill form and submit
5. Check Supabase → `leads` table
6. ✅ Should see new lead

### Test 5: Create Appointment
1. Go to `/dashboard/appointments`
2. Click "Schedule Appointment"
3. Fill form and submit
4. Check Supabase → `appointments` table
5. ✅ Should see new appointment

## 📊 Data Flow

### Lead Capture Flow
```
Website Form → LeadCaptureForm.tsx → supabase.from('leads').insert() → Supabase Database
```

### User Registration Flow
```
Register Page → AuthContext.signUp() → supabase.auth.signUp() → auth.users
                                                                    ↓
                                                          handle_new_user trigger
                                                                    ↓
                                                          public.users table
```

### Dashboard Data Flow
```
Dashboard Pages → useQuery/useMutation → supabase.from('table').select/insert/update → Supabase Database
```

## 🔍 Troubleshooting

### "relation does not exist"
- **Cause**: Database schema not run
- **Fix**: Run `supabase/schema.sql` in SQL Editor

### "permission denied" or RLS error
- **Cause**: Row Level Security policies not set up
- **Fix**: Make sure you ran the complete `schema.sql` file (includes RLS policies)

### Data not saving
- **Check**: Browser console for errors
- **Check**: Supabase → Logs → API Logs for errors
- **Check**: Table Editor to see if data exists
- **Check**: RLS policies allow your user to insert

### Connection errors
- **Check**: `.env` file exists and has correct values
- **Check**: Dev server was restarted after adding `.env`
- **Check**: Supabase project is active (not paused)
- **Check**: URL format is correct (no trailing slash)

## 📋 All Tables Used

These tables are used by the application:

1. **users** - User profiles and roles
2. **leads** - Captured leads from website
3. **projects** - Roofing projects
4. **appointments** - Scheduled appointments
5. **proposals** - Project proposals
6. **contracts** - Signed contracts
7. **messages** - Client-roofer communication
8. **project_media** - Photos/videos for projects
9. **project_notes** - Notes on projects
10. **automation_logs** - Track automated actions
11. **email_templates** - Email templates
12. **sms_templates** - SMS templates
13. **settings** - App settings
14. **team_members** - Team management

## ✅ Connection Status

All features are connected to Supabase. To verify:

1. ✅ Run database schema (if not done)
2. ✅ Set up `.env` file
3. ✅ Restart dev server
4. ✅ Test each feature
5. ✅ Check Supabase tables for data

## 🎯 Next Steps

1. **Run the database schema** (see `START_HERE.md`)
2. **Configure `.env`** with your Supabase credentials
3. **Test registration** with access code `370105`
4. **Test login** and verify dashboard access
5. **Test lead capture** from homepage
6. **Verify data** appears in Supabase tables

---

**All data is saved to your "Cedar City Roofers" Supabase project!**

