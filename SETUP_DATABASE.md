# Database Setup for Cedar City Roofers Project

## IMPORTANT: Run This First!

Before users can sign up or log in, you **MUST** set up the database schema in your Supabase project.

## Step 1: Access Your Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Open your **"Cedar City Roofers"** project
3. If you don't have a project, create one named "Cedar City Roofers"

## Step 2: Run the Database Schema

1. In Supabase, go to **SQL Editor**
2. Click **New Query**
3. Open the file `supabase/schema.sql` from this project
4. **Copy the ENTIRE contents** of `schema.sql`
5. **Paste** it into the SQL Editor
6. Click **Run** (or press Ctrl+Enter)
7. Wait for it to complete (should see "Success" message)

This will create:
- ✅ All necessary tables (users, leads, projects, appointments, etc.)
- ✅ Row Level Security (RLS) policies
- ✅ Database triggers
- ✅ User profile creation function

## Step 3: Verify Tables Were Created

1. Go to **Table Editor** in Supabase
2. You should see these tables:
   - `users`
   - `leads`
   - `projects`
   - `appointments`
   - `proposals`
   - `contracts`
   - `messages`
   - And more...

## Step 4: Test the Setup

1. Try signing up with access code `370105`
2. Try logging in
3. Should work now!

## Troubleshooting

### "relation does not exist" error
- The schema wasn't run successfully
- Go back to Step 2 and run `schema.sql` again
- Check for any error messages in SQL Editor

### "permission denied" error
- RLS policies might need adjustment
- Make sure you ran the complete `schema.sql` file
- Check that all policies were created

### Tables not showing up
- Refresh the Table Editor page
- Check SQL Editor for any errors
- Make sure you're in the correct project

---

**⚠️ CRITICAL**: The database schema MUST be set up before the app will work!

