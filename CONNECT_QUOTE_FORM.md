# ✅ Quote Form Connected to Roofers Back Office

The quote form on the main page is now fully connected to the roofers' back office dashboard.

## What Was Done

### 1. ✅ Added RLS Policy for Public Form Submissions
- **File**: `supabase/schema.sql` (updated)
- **Migration**: `supabase/migrations/add_public_leads_insert_policy.sql`
- **Purpose**: Allows anonymous users (website visitors) to submit leads through the quote form
- **Policy**: `"Public can insert leads from website"` - allows anyone to INSERT into the `leads` table

### 2. ✅ Added Real-Time Updates to Leads Dashboard
- **File**: `src/pages/dashboard/Leads.tsx` (updated)
- **Feature**: Real-time subscription to `leads` table changes
- **Benefits**:
  - New leads appear instantly in the dashboard when submitted
  - Toast notification shows when a new lead arrives
  - No need to refresh the page

### 3. ✅ Form Already Connected
- **File**: `src/components/LeadCaptureForm.tsx`
- **Status**: Already saving leads to Supabase `leads` table
- **Data Saved**:
  - Name, email, phone
  - Roofing need (roof_type)
  - Message (notes)
  - Status: 'new'
  - Source: 'website'
  - Urgency: 'medium'

## Setup Instructions

### Step 1: Apply the Database Migration

You need to apply the new RLS policy to allow public form submissions:

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run the migration file:
   ```sql
   -- Copy and paste the contents of:
   -- supabase/migrations/add_public_leads_insert_policy.sql
   ```
   
   Or run this SQL directly:
   ```sql
   CREATE POLICY "Public can insert leads from website"
     ON public.leads FOR INSERT
     WITH CHECK (true);
   ```

### Step 2: Enable Real-Time (if not already enabled)

1. Go to Supabase Dashboard → **Database** → **Replication**
2. Find the `leads` table
3. Enable replication for the `leads` table
4. This allows real-time subscriptions to work

### Step 3: Test the Connection

1. **Test Form Submission**:
   - Go to the main page (`/`)
   - Scroll to the "Get Your Free Roofing Quote" section
   - Fill out and submit the form
   - Check browser console for "Lead saved to Supabase" message

2. **Test Back Office**:
   - Log in as a roofer/admin at `/login`
   - Navigate to **Dashboard** → **Leads**
   - You should see the newly submitted lead
   - If real-time is enabled, the lead should appear instantly with a toast notification

## How It Works

### Form Submission Flow:
1. User fills out quote form on main page
2. Form submits to Supabase `leads` table (anonymous insert)
3. Lead is saved with status='new', source='website'
4. Real-time subscription detects the new lead
5. Leads dashboard automatically refreshes
6. Toast notification appears: "New Lead Received!"

### Data Flow:
```
Main Page Quote Form
    ↓
LeadCaptureForm.tsx
    ↓
Supabase leads table (INSERT)
    ↓
Real-time subscription (Leads.tsx)
    ↓
Leads Dashboard (auto-refresh)
    ↓
Roofer sees new lead instantly
```

## Security Notes

- ✅ **Viewing leads**: Still restricted to authenticated roofers/admins only
- ✅ **Updating leads**: Still restricted to authenticated roofers/admins only
- ✅ **Inserting leads**: Now allows anonymous users (for public form)
- ✅ **Data validation**: Form fields are validated before submission

## Troubleshooting

### Leads not appearing in dashboard:
1. Check that the migration was applied (see Step 1)
2. Verify Supabase environment variables are set in `.env`
3. Check browser console for errors
4. Verify you're logged in as a roofer/admin

### Real-time not working:
1. Check that Replication is enabled for `leads` table in Supabase
2. Check browser console for subscription errors
3. Real-time requires WebSocket support (works in modern browsers)

### Form submission errors:
1. Check browser console for specific error messages
2. Verify database tables exist (run `supabase/schema.sql` if needed)
3. Check Supabase project is active and accessible

## Next Steps

The quote form is now fully connected! When users submit the form:
- ✅ Lead is saved to database
- ✅ Lead appears in back office dashboard
- ✅ Real-time updates notify roofers instantly
- ✅ Roofers can manage leads from the dashboard

