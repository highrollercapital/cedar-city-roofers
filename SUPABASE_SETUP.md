# Supabase Setup Guide for "Cedar City Roofers" Project

This guide will help you connect this application to your Supabase project "Cedar City Roofers" and set up partner/roofer access.

## Step 1: Access Your Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Find and open your project: **"Cedar City Roofers"**
3. If you don't have a project yet, create one:
   - Click "New Project"
   - Name it "Cedar City Roofers"
   - Choose a database password (save it securely)
   - Select a region closest to you
   - Wait for the project to initialize (2-3 minutes)

## Step 2: Get Your API Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon/public key** (long string starting with `eyJ...`)

## Step 3: Set Up Environment Variables

1. In your project root directory, create a `.env` file (if it doesn't exist)
2. Add your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important**: Replace `your-project-id` and `your-anon-key-here` with your actual values from Step 2.

## Step 4: Run the Database Schema

1. In your Supabase project, go to **SQL Editor**
2. Click **New Query**
3. Open the file `supabase/schema.sql` from this project
4. Copy the entire contents of `schema.sql`
5. Paste it into the SQL Editor
6. Click **Run** (or press Ctrl+Enter)
7. Wait for the query to complete (should see "Success. No rows returned")

This will create:
- All necessary tables (users, leads, projects, appointments, etc.)
- Row Level Security (RLS) policies
- Database triggers
- User profile creation function

## Step 5: Create Your First Partner/Roofer Account

### Option A: Via Registration Page (Recommended)

1. Start your development server: `npm run dev`
2. Navigate to `http://localhost:8080/register`
3. Fill in the registration form:
   - **Full Name**: Your name
   - **Email**: Your email address
   - **Account Type**: Select **"Roofer / Partner"**
   - **Password**: Create a strong password
4. Click "Create Account"
5. Check your email for verification (if email confirmation is enabled)
6. Once verified, you can log in at `/login`

### Option B: Via Supabase Dashboard

1. In Supabase, go to **Authentication** → **Users**
2. Click **Add User** → **Create New User**
3. Enter email and password
4. In the **User Metadata** section, add:
   ```json
   {
     "full_name": "Your Name",
     "role": "roofer"
   }
   ```
5. Click **Create User**
6. The user profile will be automatically created in the `users` table

### Option C: Create Admin Account

To create an admin account (full access), use the Supabase SQL Editor:

```sql
-- First, create the auth user (replace with your email and password)
-- Note: You'll need to use Supabase Auth API or dashboard to create the auth user first
-- Then update the role:

UPDATE public.users 
SET role = 'admin' 
WHERE email = 'your-email@example.com';
```

Or create via SQL (after creating auth user):

```sql
-- Insert admin user profile (replace 'user-id-from-auth' with actual auth user ID)
INSERT INTO public.users (id, email, full_name, role)
VALUES (
  'user-id-from-auth',
  'admin@cedarcityroofers.com',
  'Admin User',
  'admin'
);
```

## Step 6: Configure Authentication Settings

1. In Supabase, go to **Authentication** → **Settings**
2. Review and configure:
   - **Enable Email Confirmations**: Toggle based on your preference
   - **Site URL**: Set to `http://localhost:8080` for development
   - **Redirect URLs**: Add `http://localhost:8080/**` for development
3. For production, add your production URL

## Step 7: Test Partner Login

1. Restart your dev server to load environment variables:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:8080/login`
3. Enter your partner/roofer credentials
4. You should be redirected to `/dashboard`
5. You should see the full back office with:
   - Dashboard overview
   - Leads management
   - Appointments
   - Projects
   - Proposals
   - Revenue analytics
   - Messages
   - Settings

## Step 8: Verify Database Access

1. In Supabase, go to **Table Editor**
2. You should see these tables:
   - `users`
   - `leads`
   - `projects`
   - `appointments`
   - `proposals`
   - `contracts`
   - `messages`
   - And more...

3. Check that your user exists in the `users` table:
   - Go to **Table Editor** → `users`
   - You should see your account with `role = 'roofer'` or `'admin'`

## Troubleshooting

### "Supabase URL and Anon Key must be set"
- Make sure your `.env` file exists in the project root
- Verify the variable names are exactly: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Restart your dev server after creating/updating `.env`

### "Row Level Security policy violation"
- Make sure you ran the `schema.sql` file completely
- Check that RLS policies exist: Go to **Authentication** → **Policies**
- Verify your user has the correct role in the `users` table

### "User profile not found"
- The `handle_new_user` trigger should create profiles automatically
- If not, manually insert into `users` table:
  ```sql
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    'auth-user-id-here',
    'email@example.com',
    'User Name',
    'roofer'
  );
  ```

### Can't see back office features
- Verify your user role is `'roofer'` or `'admin'` (not `'client'`)
- Check the `users` table in Supabase to confirm your role
- Log out and log back in to refresh your session

### Email verification not working
- Check Supabase **Authentication** → **Settings** → **Email Templates**
- Verify SMTP settings if using custom email provider
- For development, you can disable email confirmation in Auth settings

## Next Steps

Once partner login is working:

1. **Create Additional Partner Accounts**: Use the registration page or Supabase dashboard
2. **Test Lead Capture**: Submit the form on the landing page - it should save to `leads` table
3. **Set Up Email/SMS**: Configure Twilio and email services (see `SETUP.md`)
4. **Customize Settings**: Update company name, email templates, etc.

## Production Deployment

When deploying to production:

1. Update `.env` with production Supabase credentials (or use environment variables in your hosting platform)
2. Update Supabase **Authentication** → **Settings**:
   - **Site URL**: Your production domain
   - **Redirect URLs**: Add your production domain
3. Update the footer link if needed (already points to `/login`)

## Support

If you encounter issues:
1. Check the browser console for errors
2. Check Supabase logs: **Logs** → **Postgres Logs** or **API Logs**
3. Verify all environment variables are set correctly
4. Ensure the database schema was run successfully

---

**Your Supabase Project**: Cedar City Roofers  
**Database**: PostgreSQL (managed by Supabase)  
**Authentication**: Supabase Auth  
**Storage**: Supabase Storage (for file uploads)

