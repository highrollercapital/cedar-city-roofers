# Roofing SaaS Application - Setup Guide

This is a comprehensive full-stack SaaS application for roofing businesses. It includes lead management, project tracking, appointment scheduling, proposal generation, and client portals.

## Features

- **User Roles**: Admin/Roofer (full access) and Client/Homeowner (portal access)
- **Lead Management**: Capture, track, and manage leads with AI-powered follow-ups
- **Appointment & Calendar**: Schedule and manage appointments with calendar sync
- **Project Management**: Track projects through all stages with media uploads
- **Proposals & Contracts**: Generate proposals and collect e-signatures
- **Revenue Dashboard**: Track revenue, conversion metrics, and performance
- **Client Portal**: Customers can view projects, approve proposals, and message roofers
- **Automations**: AI email/SMS sequences and automated status updates

## Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier works)
- (Optional) Twilio account for SMS/AI calls
- (Optional) Email service (Gmail, SendGrid, etc.)

## Step 1: Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once your project is created, go to **Settings > API**
3. Copy your **Project URL** and **anon/public key**
4. In your project, go to **SQL Editor** and run the schema file:
   - Copy the contents of `supabase/schema.sql`
   - Paste into the SQL Editor
   - Click "Run" to execute

## Step 2: Configure Environment Variables

1. Copy `.env.example` to `.env` in the root directory:
   ```bash
   cp .env.example .env
   ```

2. Fill in your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

## Step 3: Install Dependencies

```bash
npm install
```

## Step 4: Run the Application

```bash
npm run dev
```

The application will be available at `http://localhost:8080`

## Step 5: Create Your First Admin User

1. Navigate to `/register`
2. Fill in the registration form
3. Select "Admin" as the account type
4. Complete registration
5. Check your email for verification (if email verification is enabled in Supabase)

## Step 6: (Optional) Set Up Twilio for SMS/AI Calls

1. Sign up for a [Twilio account](https://www.twilio.com)
2. Get your Account SID and Auth Token from the Twilio Console
3. Purchase a phone number
4. Add to your `.env`:
   ```
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_PHONE_NUMBER=+1234567890
   ```

## Step 7: (Optional) Set Up Email Notifications

### Using Gmail:

1. Enable 2-factor authentication on your Gmail account
2. Generate an [App Password](https://myaccount.google.com/apppasswords)
3. Add to your `.env`:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASSWORD=your_app_password
   SMTP_FROM=noreply@cedarcityroofers.com
   ```

### Using SendGrid or Other Services:

Update the SMTP settings in `.env` according to your provider's documentation.

## Step 8: (Optional) Set Up Google Calendar Sync

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google Calendar API
4. Create OAuth 2.0 credentials
5. Add to your `.env`:
   ```
   GOOGLE_CALENDAR_CLIENT_ID=your_client_id
   GOOGLE_CALENDAR_CLIENT_SECRET=your_client_secret
   ```

## Database Schema Overview

The application uses the following main tables:

- **users**: User profiles with roles (admin, roofer, client)
- **leads**: Captured leads from website forms
- **projects**: Roofing projects linked to leads/clients
- **appointments**: Scheduled appointments
- **proposals**: Project proposals
- **contracts**: Signed contracts
- **messages**: Client-roofer communication
- **automation_logs**: Track automated actions

## API Integration Setup

### Lead Capture from Landing Page

The lead capture form on the landing page automatically saves leads to the database. Leads are created with:
- Status: "new"
- Source: "website"
- Urgency: "medium"

### AI Follow-up System

To enable AI-powered follow-ups:

1. Set up Twilio (see Step 6)
2. Create backend API endpoints for:
   - Sending SMS via Twilio
   - Making AI calls via Twilio Voice API
   - Sending emails via SMTP

Example backend structure (Node.js/Express):
```javascript
// Backend API endpoint example
app.post('/api/leads/:id/followup', async (req, res) => {
  // 1. Attempt AI call via Twilio
  // 2. If call fails, send SMS with booking link
  // 3. Log automation in automation_logs table
});
```

### Automated Status Updates

Set up database triggers or scheduled jobs to:
- Update lead status when appointments are booked
- Create projects when leads are converted
- Send notifications when status changes occur

## Deployment

### Deploy Frontend (Vercel/Netlify)

1. Build the application:
   ```bash
   npm run build
   ```

2. Deploy the `dist` folder to your hosting provider

3. Add environment variables in your hosting provider's dashboard

### Deploy Backend (if using separate API)

For Twilio, email, and other integrations, you'll need a backend server. Options:
- **Vercel Serverless Functions**
- **Netlify Functions**
- **Supabase Edge Functions**
- **Railway/Render**

## Partner/Roofer Login

The Partner/Roofer login link is available in the footer of the main landing page. Users can:
- Click "Partner / Roofer Login" in the footer
- Sign in with their credentials
- Access the full back office dashboard

## Client Portal

Clients can:
1. Register at `/register` (select "Client / Homeowner")
2. View their projects at `/dashboard`
3. See appointments and messages
4. Approve proposals and sign contracts

## Troubleshooting

### "Supabase URL and Anon Key must be set"

- Make sure your `.env` file exists and contains the correct values
- Restart your dev server after adding environment variables

### "Row Level Security" errors

- Make sure you've run the `schema.sql` file in Supabase
- Check that RLS policies are enabled in Supabase dashboard

### Authentication not working

- Verify Supabase project is active
- Check that email confirmation is set up correctly in Supabase Auth settings
- Ensure the `handle_new_user` trigger function is created

## Next Steps

1. Customize email templates in the `email_templates` table
2. Set up automation workflows for lead follow-ups
3. Configure appointment reminders
4. Add your company branding and colors
5. Set up data export functionality (CSV/PDF)

## Support

For issues or questions:
1. Check the Supabase documentation
2. Review the code comments in each component
3. Check the browser console for errors

## License

This project is proprietary software for Cedar City Roofing.

