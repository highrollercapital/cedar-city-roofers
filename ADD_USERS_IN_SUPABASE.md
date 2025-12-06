# How to Add Users in Supabase

Since registration is disabled, all users must be added directly in the Supabase dashboard.

## Adding a Partner/Roofer User

### Step 1: Create Auth User

1. Go to [supabase.com](https://supabase.com) and open your **"Cedar City Roofers"** project
2. Click **Authentication** in the left sidebar
3. Click **Users** tab
4. Click **Add User** → **Create New User**
5. Fill in:
   - **Email**: User's email address
   - **Password**: Create a secure password (user can change later)
   - **Auto Confirm User**: ✅ Check this box (so they can log in immediately)
6. Click **Create User**

### Step 2: Set User Metadata (Role)

1. After creating the user, click on the user's email to edit
2. Scroll down to **User Metadata**
3. Click **Add Row**
4. Add these metadata fields:

   **Key**: `full_name`  
   **Value**: `John Doe` (user's full name)

   **Key**: `role`  
   **Value**: `roofer` (or `admin` for admin users)

5. Click **Save**

### Step 3: Create User Profile (Automatic)

The `handle_new_user` trigger function should automatically create a profile in the `users` table. If it doesn't:

1. Go to **Table Editor** → `users`
2. Click **Insert** → **Insert Row**
3. Fill in:
   - **id**: Copy the user's UUID from Authentication → Users
   - **email**: User's email
   - **full_name**: User's full name
   - **role**: `roofer` or `admin`
   - **company_name**: (optional) Company name
4. Click **Save**

### Step 4: User Can Now Login

The user can now:
1. Go to `/login` (or click "Partner / Roofer Login" in footer)
2. Enter their email and password
3. Access the back office dashboard

## Adding an Admin User

Follow the same steps as above, but set:
- **role** metadata: `admin`
- **role** in users table: `admin`

Admin users have full access to all features.

## Adding a Client User

For client/homeowner accounts:
1. Follow Step 1 above to create auth user
2. Set **role** metadata: `client`
3. Set **role** in users table: `client`

Client users can only see their own projects and appointments.

## Bulk User Import (SQL)

You can also add users via SQL in the SQL Editor:

```sql
-- First create the auth user via Supabase Dashboard
-- Then insert into users table:

INSERT INTO public.users (id, email, full_name, role, company_name)
VALUES (
  'user-uuid-from-auth',  -- Get from Authentication → Users
  'user@example.com',
  'User Name',
  'roofer',  -- or 'admin' or 'client'
  'Cedar City Roofers'
);
```

## Sending Login Credentials

After creating a user:
1. Send them their email and temporary password
2. They should change their password on first login (if password reset is enabled)
3. Or they can use "Forgot Password" to set their own password

## Troubleshooting

### User can't log in
- Check user exists in Authentication → Users
- Verify user profile exists in Table Editor → `users`
- Check user role is set correctly (`roofer`, `admin`, or `client`)
- Verify "Auto Confirm User" was checked when creating

### User profile not created automatically
- Check if `handle_new_user` trigger function exists (run `supabase/schema.sql`)
- Manually create profile in `users` table (see Step 3 above)

### User sees wrong dashboard
- Check user's role in `users` table
- Should be `roofer` or `admin` for back office access
- `client` role only sees client portal

---

**Note**: All user management is now done in Supabase dashboard. Users cannot self-register.

