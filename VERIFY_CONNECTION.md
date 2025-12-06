# Verify Supabase Connection - Quick Checklist

Use this checklist to verify everything is connected to your "Cedar City Roofers" Supabase project.

## ✅ Pre-Flight Checks

### 1. Database Schema Run?
- [ ] Go to Supabase → Table Editor
- [ ] See these tables: `users`, `leads`, `projects`, `appointments`, `proposals`, `contracts`, `messages`
- [ ] If NO tables → Run `supabase/schema.sql` in SQL Editor

### 2. Environment Variables Set?
- [ ] `.env` file exists in project root
- [ ] Contains `VITE_SUPABASE_URL=https://your-project.supabase.co`
- [ ] Contains `VITE_SUPABASE_ANON_KEY=your-key`
- [ ] No trailing slash on URL
- [ ] No quotes around values

### 3. Dev Server Restarted?
- [ ] Stopped old server (Ctrl+C)
- [ ] Started new server (`npm run dev`)
- [ ] Browser console shows: `✅ Supabase configured`

## 🧪 Connection Tests

### Test 1: Lead Capture ✅
**What it tests**: Website form saves to Supabase

1. Go to homepage: `http://localhost:8080`
2. Scroll to lead capture form
3. Fill out form:
   - Name: Test User
   - Email: test@example.com
   - Phone: (435) 555-1234
   - Roofing Need: Repair
4. Submit form
5. **Verify in Supabase**:
   - Go to Table Editor → `leads`
   - Should see new entry with your test data
   - Status should be 'new'
   - Source should be 'website'

**✅ PASS**: Lead appears in `leads` table  
**❌ FAIL**: Check browser console for errors, verify schema was run

---

### Test 2: User Registration ✅
**What it tests**: Sign up creates user in Supabase

1. Go to: `http://localhost:8080/register`
2. Fill form:
   - Full Name: Test Partner
   - Email: partner@test.com
   - Access Code: `370105`
   - Password: test1234
   - Confirm Password: test1234
3. Submit
4. **Verify in Supabase**:
   - Authentication → Users → Should see new user
   - Table Editor → `users` → Should see profile with role 'roofer'

**✅ PASS**: User in both `auth.users` and `public.users`  
**❌ FAIL**: Check error message, verify schema was run

---

### Test 3: Login ✅
**What it tests**: Authentication works, redirects to dashboard

1. Go to: `http://localhost:8080/login`
2. Enter credentials from Test 2
3. Click Sign In
4. **Should redirect to**: `/dashboard`
5. **Should see**: Back office dashboard with stats

**✅ PASS**: Redirects to dashboard, sees back office  
**❌ FAIL**: Check credentials, verify user profile exists

---

### Test 4: Create Lead in Dashboard ✅
**What it tests**: Dashboard can create data in Supabase

1. Log in as partner
2. Go to: `/dashboard/leads`
3. Click "Create Lead"
4. Fill form and submit
5. **Verify in Supabase**:
   - Table Editor → `leads`
   - Should see new lead
   - Source should be 'manual'

**✅ PASS**: Lead created in database  
**❌ FAIL**: Check RLS policies, verify user has 'roofer' role

---

### Test 5: View Leads ✅
**What it tests**: Dashboard can read data from Supabase

1. In `/dashboard/leads`
2. Should see list of leads
3. **Verify in Supabase**:
   - Table Editor → `leads`
   - Count should match what you see in dashboard

**✅ PASS**: Leads display correctly  
**❌ FAIL**: Check RLS policies, verify query permissions

---

### Test 6: Update Lead Status ✅
**What it tests**: Dashboard can update data in Supabase

1. In `/dashboard/leads`
2. Find a lead
3. Change status dropdown (e.g., New → Contacted)
4. **Verify in Supabase**:
   - Table Editor → `leads`
   - Status should be updated

**✅ PASS**: Status updated in database  
**❌ FAIL**: Check RLS update policies

---

### Test 7: Create Appointment ✅
**What it tests**: Appointments save to Supabase

1. Go to: `/dashboard/appointments`
2. Click "Schedule Appointment"
3. Fill form and submit
4. **Verify in Supabase**:
   - Table Editor → `appointments`
   - Should see new appointment

**✅ PASS**: Appointment created  
**❌ FAIL**: Check table exists, verify RLS policies

---

### Test 8: Revenue Dashboard ✅
**What it tests**: Dashboard reads project data from Supabase

1. Go to: `/dashboard/revenue`
2. Should see revenue stats and charts
3. **Verify in Supabase**:
   - Table Editor → `projects`
   - Data should match what dashboard shows

**✅ PASS**: Revenue data displays  
**❌ FAIL**: Check projects table has data, verify RLS policies

---

## 🔍 Debugging Failed Tests

### If Test 1 Fails (Lead Capture)
- Check: Browser console for errors
- Check: Supabase → Logs → API Logs
- Verify: `leads` table exists
- Verify: RLS policies allow inserts

### If Test 2 Fails (Registration)
- Check: Error message in toast
- Verify: Database schema was run
- Verify: `users` table exists
- Check: `handle_new_user` trigger exists

### If Test 3 Fails (Login)
- Check: User exists in Authentication → Users
- Check: User profile exists in `users` table
- Verify: User role is 'roofer' or 'admin'
- Check: Password is correct

### If Tests 4-8 Fail (Dashboard Operations)
- Verify: User is logged in
- Verify: User role is 'roofer' or 'admin'
- Check: RLS policies are set up correctly
- Check: Tables exist in Supabase
- Check: Browser console for specific errors

## 📊 All Connected Features

✅ **Authentication** - Supabase Auth  
✅ **Lead Capture** - `leads` table  
✅ **User Registration** - `auth.users` + `users` table  
✅ **Dashboard Stats** - `leads`, `projects`, `appointments` tables  
✅ **Lead Management** - Full CRUD on `leads` table  
✅ **Appointments** - Full CRUD on `appointments` table  
✅ **Projects** - Full CRUD on `projects` table  
✅ **Proposals** - Full CRUD on `proposals` table  
✅ **Revenue Dashboard** - Reads from `projects` table  
✅ **Messages** - Full CRUD on `messages` table  
✅ **Settings** - Updates `users` table  

## 🎯 Success Criteria

All tests pass = Everything is connected! ✅

If any test fails:
1. Check the specific error message
2. Verify database schema was run
3. Check RLS policies
4. Verify user role is correct
5. Check browser console for details

---

**All data flows to your "Cedar City Roofers" Supabase project!**

