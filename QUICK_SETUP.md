# Quick Setup Guide - Fix "Supabase not configured" Error

If you're seeing the error **"Supabase not configured, please configure supabase to enable registration"**, follow these steps:

## Step 1: Get Your Supabase Credentials

1. Go to [supabase.com](https://supabase.com) and sign in
2. Open your **"Cedar City Roofers"** project
3. Click **Settings** (gear icon) → **API**
4. Copy these two values:
   - **Project URL** (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

## Step 2: Create .env File

1. In your project root directory (same folder as `package.json`), create a file named `.env`
2. **Important**: The file must be named exactly `.env` (not `.env.txt` or anything else)

3. Add these two lines (replace with your actual values):

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Example:**
```env
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzODk2NzI5MCwiZXhwIjoxOTU0NTQzMjkwfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Step 3: Restart Your Dev Server

**Important**: You must restart the dev server for environment variables to load!

1. Stop the current server (press `Ctrl+C` in the terminal)
2. Start it again:
   ```bash
   npm run dev
   ```

## Step 4: Verify It Works

1. Go to `http://localhost:8080/register`
2. The error message should be gone
3. You should be able to create an account

## Troubleshooting

### Still seeing the error after restart?

1. **Check file location**: The `.env` file must be in the project root (same folder as `package.json`)
2. **Check file name**: Must be exactly `.env` (not `.env.local` or `.env.development`)
3. **Check variable names**: Must be exactly `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
4. **No spaces**: Don't add spaces around the `=` sign
5. **No quotes needed**: Don't wrap values in quotes unless they contain spaces

### File not found?

If you're on Windows and can't create a `.env` file:
1. Open Notepad
2. Save the file
3. In the "Save as type" dropdown, select **"All Files"**
4. Name it exactly `.env` (with the dot at the beginning)
5. Save it in the project root directory

### Still not working?

1. Check the browser console for errors
2. Verify your Supabase project is active (not paused)
3. Make sure you copied the full anon key (it's very long)
4. Try restarting your computer (sometimes helps with env variable caching)

## Next Steps

Once registration works:

1. **Set up the database**: Run `supabase/schema.sql` in Supabase SQL Editor
2. **Create your first account**: Register as "Roofer / Partner"
3. **Test login**: Log in at `/login`

See `SUPABASE_SETUP.md` for complete setup instructions.

