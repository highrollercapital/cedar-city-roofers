# 🚀 SETUP DATABASE NOW - Quick Guide

Your Supabase project has **0 tables**. You need to run the database schema to create all tables, enums, and functions.

## ✅ Method 1: Using Supabase SQL Editor (RECOMMENDED - 2 minutes)

1. **Go to your Supabase Dashboard**
   - Open: https://supabase.com/dashboard
   - Select project: **"Cedar City Roofers"** (or project ID: `nnvllbxleujvqoyfqgqe`)

2. **Open SQL Editor**
   - Click **"SQL Editor"** in the left sidebar
   - Click **"New query"**

3. **Copy and Paste Schema**
   - Open `supabase/schema.sql` from this project
   - Copy **ALL** the contents (all 425 lines)
   - Paste into the SQL Editor

4. **Run the Query**
   - Click **"Run"** button (or press Ctrl+Enter)
   - Wait for "Success" message

5. **Verify Tables**
   - Click **"Table Editor"** in the left sidebar
   - You should see these tables:
     - `users`
     - `leads`
     - `projects`
     - `appointments`
     - `proposals`
     - `contracts`
     - `messages`
     - And more...

## ✅ Method 2: Using Direct PostgreSQL Connection

If you have `psql` installed:

```bash
# Windows (PowerShell)
$env:PGPASSWORD="cedarcityroofing"
psql -h db.nnvllbxleujvqoyfqgqe.supabase.co -U postgres -d postgres -p 5432 -f supabase/schema.sql
```

Or using a PostgreSQL client like DBeaver, pgAdmin, or TablePlus:
- Host: `db.nnvllbxleujvqoyfqgqe.supabase.co`
- Port: `5432`
- Database: `postgres`
- Username: `postgres`
- Password: `cedarcityroofing`
- SSL: Required

Then run the contents of `supabase/schema.sql`

## ✅ Method 3: Using Node.js Script (Requires Service Key)

1. **Get Service Role Key**
   - Go to Supabase Dashboard → Settings → API
   - Copy the **"service_role"** key (NOT the anon key)

2. **Set Environment Variable**
   ```bash
   # Windows PowerShell
   $env:SUPABASE_SERVICE_KEY="your-service-role-key-here"
   ```

3. **Run Script**
   ```bash
   npm run setup-db
   ```

## 🔍 Verify Setup

After running the schema, verify in Supabase Dashboard:

1. **Table Editor** → Should show 13+ tables
2. **SQL Editor** → Run this query:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_type = 'BASE TABLE'
   ORDER BY table_name;
   ```
   Should return: `users`, `leads`, `projects`, `appointments`, `proposals`, `contracts`, `messages`, etc.

## ⚠️ Important Notes

- **DO NOT** share your service_role key publicly
- The connection string you provided is for direct PostgreSQL access
- The frontend app uses Supabase REST API (needs URL + anon key in `.env`)
- After setup, restart your dev server

## 🎯 Next Steps After Database Setup

1. ✅ Database schema is run
2. ✅ Set up `.env` file with:
   ```
   VITE_SUPABASE_URL=https://nnvllbxleujvqoyfqgqe.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```
3. ✅ Restart dev server: `npm run dev`
4. ✅ Test registration with access code `370105`
5. ✅ Test login and verify dashboard works

---

**Need help?** Check `COMPLETE_SETUP_GUIDE.md` for detailed instructions.

