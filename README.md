# Cedar City Roofing SaaS Application

A comprehensive full-stack SaaS application for roofing businesses to manage leads, projects, appointments, proposals, and client relationships.

## 🚀 Features

### Core Functionality

- **Multi-Role Authentication**: Admin/Roofer (full access) and Client/Homeowner (portal access)
- **Lead Management**: Capture, track, filter, and manage leads with status tracking
- **Appointment Scheduling**: Interactive calendar with appointment management
- **Project Management**: Track projects through all stages (Inspection → Quote → Approved → In Progress → Completed)
- **Proposals & Contracts**: Generate proposals and collect e-signatures
- **Revenue Dashboard**: Track revenue, conversion metrics, and performance analytics
- **Client Portal**: Customers can view projects, approve proposals, and message roofers
- **Partner Login**: Quick access from landing page footer for roofers

### Advanced Features

- **AI-Powered Lead Follow-ups**: Automated email/SMS sequences (requires backend setup)
- **Calendar Sync**: Google Calendar and iCal integration (requires setup)
- **Data Export**: Export leads, projects, and reports to CSV/PDF
- **Automated Workflows**: Status updates and notifications
- **Team Management**: Admin can manage team members and permissions

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier works)
- (Optional) Twilio account for SMS/AI calls
- (Optional) Email service (Gmail, SendGrid, etc.)

## 🛠️ Quick Start

### ⚠️ IMPORTANT: Database Setup Required First!

**Your Supabase project has 0 tables. You MUST run the database schema first!**

See **`START_HERE.md`** for the quick setup guide, or **`COMPLETE_SETUP_GUIDE.md`** for detailed instructions.

### 1. Clone and Install

```bash
npm install
```

### 2. Set Up Database Schema (CRITICAL - DO THIS FIRST!)

1. Go to Supabase → **"Cedar City Roofers"** project
2. Click **SQL Editor** → **New Query**
3. Open `supabase/schema.sql` from this project
4. **Copy the ENTIRE file** and paste into SQL Editor
5. Click **Run**
6. Verify tables exist in **Table Editor**

**⚠️ Without this step, nothing will work!**

### 3. Connect to Your Supabase Project

**Important**: This app uses your existing Supabase project **"Cedar City Roofers"**

1. Go to your Supabase project: [supabase.com](https://supabase.com)
2. Open the **"Cedar City Roofers"** project
3. Get your credentials from **Settings > API**:
   - Project URL
   - anon/public key

### 3. Set Up Database Schema

1. In Supabase, go to **SQL Editor**
2. Open `supabase/schema.sql` from this project
3. Copy and paste the entire SQL into the editor
4. Click **Run** to create all tables and policies

### 4. Configure Environment

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-cedar-city-roofers-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Replace with your actual Supabase project credentials**

### 5. Run the Application

```bash
npm run dev
```

Visit `http://localhost:8080`

### 6. Create Partner/Roofer Account

**Option A: Via Registration (Recommended)**
1. Go to `/register`
2. Select **"Roofer / Partner"** as account type
3. Complete registration
4. Log in at `/login`

**Option B: Via Supabase Dashboard**
1. In Supabase: **Authentication > Users > Add User**
2. Set user metadata: `{"role": "roofer", "full_name": "Your Name"}`
3. Log in with those credentials

**📖 See `SUPABASE_SETUP.md` for detailed step-by-step instructions**

## 📁 Project Structure

```
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── layout/         # Layout components (Header, Footer, DashboardLayout)
│   │   └── ui/             # shadcn/ui components
│   ├── contexts/           # React contexts (AuthContext)
│   ├── lib/                # Utilities and helpers
│   │   ├── supabase.ts    # Supabase client and types
│   │   ├── api-integrations.ts  # API integration helpers
│   │   └── export-utils.ts      # CSV/PDF export functions
│   ├── pages/              # Page components
│   │   ├── auth/           # Login/Register pages
│   │   ├── dashboard/     # Dashboard pages
│   │   └── ...            # Public pages (Index, Blog, etc.)
│   └── App.tsx             # Main app component with routes
├── supabase/
│   └── schema.sql          # Database schema
└── SETUP.md                # Detailed setup instructions
```

## 🔐 User Roles

### Admin / Roofer
- Full access to all dashboards
- Lead management and tracking
- Project management
- Appointment scheduling
- Proposal and contract generation
- Revenue analytics
- Team management (Admin only)

### Client / Homeowner
- View their projects and status
- See scheduled appointments
- Approve proposals and sign contracts
- Message roofers
- Track project progress

## 🔌 API Integrations

### Twilio (SMS & AI Calls)

To enable SMS and AI call features:

1. Sign up at [twilio.com](https://www.twilio.com)
2. Get Account SID, Auth Token, and Phone Number
3. Add to `.env`:
   ```env
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_PHONE_NUMBER=+1234567890
   ```
4. Create backend API endpoints (see `src/lib/api-integrations.ts` for examples)

### Email (SMTP)

For email notifications:

1. Configure SMTP settings in `.env`:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASSWORD=your_app_password
   SMTP_FROM=noreply@cedarcityroofers.com
   ```
2. Create backend API endpoint for sending emails

### Google Calendar

For calendar sync:

1. Set up Google Cloud project
2. Enable Calendar API
3. Create OAuth 2.0 credentials
4. Add to `.env`:
   ```env
   GOOGLE_CALENDAR_CLIENT_ID=your_client_id
   GOOGLE_CALENDAR_CLIENT_SECRET=your_client_secret
   ```

## 📊 Database Schema

The application uses PostgreSQL via Supabase with the following main tables:

- `users` - User profiles with roles
- `leads` - Captured leads from website
- `projects` - Roofing projects
- `appointments` - Scheduled appointments
- `proposals` - Project proposals
- `contracts` - Signed contracts
- `messages` - Client-roofer communication
- `automation_logs` - Track automated actions

See `supabase/schema.sql` for the complete schema.

## 🎨 Customization

### Styling

The app uses Tailwind CSS with shadcn/ui components. Customize colors in:
- `tailwind.config.ts` - Theme colors
- `src/index.css` - Global styles

### Email Templates

Customize email templates by inserting records into the `email_templates` table in Supabase.

### SMS Templates

Customize SMS templates by inserting records into the `sms_templates` table in Supabase.

## 🚢 Deployment

### Frontend (Vercel/Netlify)

1. Build the app:
   ```bash
   npm run build
   ```

2. Deploy the `dist` folder

3. Add environment variables in your hosting provider's dashboard

### Backend API

For Twilio, email, and calendar integrations, you'll need a backend server. Options:

- **Supabase Edge Functions** (recommended)
- **Vercel Serverless Functions**
- **Netlify Functions**
- **Railway/Render**

See `src/lib/api-integrations.ts` for endpoint examples.

## 📝 Usage Guide

### For Roofers/Admins

1. **Login**: Click "Partner / Roofer Login" in footer or go to `/login`
2. **View Leads**: Navigate to Leads dashboard to see all captured leads
3. **Create Project**: Convert a lead to a project
4. **Schedule Appointment**: Book appointments from leads or projects
5. **Generate Proposal**: Create proposals for projects
6. **Track Revenue**: View revenue dashboard for analytics

### For Clients

1. **Register**: Go to `/register` and select "Client / Homeowner"
2. **View Projects**: See all your projects in the dashboard
3. **Approve Proposals**: Review and approve proposals
4. **Sign Contracts**: Sign contracts digitally
5. **Message Roofer**: Communicate via the messages section

## 🐛 Troubleshooting

### "Supabase URL and Anon Key must be set"
- Ensure `.env` file exists with correct values
- Restart dev server after adding environment variables

### Row Level Security errors
- Verify `schema.sql` has been run in Supabase
- Check RLS policies in Supabase dashboard

### Authentication issues
- Verify Supabase project is active
- Check email confirmation settings in Supabase Auth
- Ensure `handle_new_user` trigger function exists

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Twilio Documentation](https://www.twilio.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com)

## 📄 License

Proprietary software for Cedar City Roofing.

## 🤝 Support

For setup help, see `SETUP.md` for detailed instructions.

---

**Built with**: React, TypeScript, Vite, Supabase, Tailwind CSS, shadcn/ui
