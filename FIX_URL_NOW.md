# 🚨 QUICK FIX: Supabase URL Error

## The Problem
Your Supabase project URL in the `.env` file is incorrect or missing.

## The Solution (3 Steps)

### Step 1: Get Your Correct URL

1. **Go to**: [supabase.com](https://supabase.com) and sign in
2. **Click**: Your **"Cedar City Roofers"** project
3. **Click**: **Settings** (⚙️ gear icon) → **API**
4. **Copy**: The **"Project URL"** - it looks like:
   ```
   https://xxxxxxxxxxxxx.supabase.co
   ```
5. **Copy**: The **"anon public"** key - it's a long string starting with `eyJ...`

### Step 2: Update .env File

1. Open your `.env` file in the project root (same folder as `package.json`)
2. Make sure it has these EXACT lines (replace with YOUR values):

```env
VITE_SUPABASE_URL=https://your-actual-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-anon-key-here
```

**⚠️ IMPORTANT:**
- ✅ URL must start with `https://`
- ✅ URL must end with `.supabase.co` (NO trailing slash `/`)
- ✅ No spaces around the `=` sign
- ✅ No quotes around the values
- ✅ Use the EXACT values from Supabase dashboard

### Step 3: Restart Dev Server

**CRITICAL**: Environment variables only load when server starts!

1. **Stop** your dev server: Press `Ctrl+C` in terminal
2. **Start** it again:
   ```bash
   npm run dev
   ```

## Verify It Works

1. Open browser console (F12)
2. Look for: `✅ Supabase configured`
3. Go to: `http://localhost:8080/register`
4. Try registering - it should work now!

## Still Not Working?

### Check These:

1. **File location**: `.env` must be in project root (same folder as `package.json`)
2. **File name**: Must be exactly `.env` (not `.env.txt` or `.env.local`)
3. **Variable names**: Must be exactly `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
4. **URL format**: Test it in browser - paste your URL, should show Supabase page
5. **Project status**: Make sure project is not paused in Supabase dashboard

### Test Your URL

Open this in your browser (replace with your actual URL):
```
https://your-project-id.supabase.co
```

If it shows an error, the URL is wrong or project is paused.

## Example .env File

Here's what a correct `.env` file looks like:

```env
VITE_SUPABASE_URL=https://nnvllbxleujvqoyfqgqe.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5udmxsYnhsZXVqdnFveWZxZ3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MTQ2OTIsImV4cCI6MjA4MDI5MDY5Mn0.7cRRzQhwS6pTbV7GMhQ2u1XNyT8Xf9K1Y-zrTsu8cd4
```

**Note**: Replace with YOUR actual values from Supabase!

## Need More Help?

- See `GET_SUPABASE_URL.md` for detailed step-by-step guide
- Check browser console for specific error messages
- Verify your Supabase project is active (not paused)

---

**Once fixed, partners can:**
- ✅ Sign up at `/register` (select "Roofer / Partner")
- ✅ Log in at `/login`
- ✅ Access full back office at `/dashboard`
- ✅ All data saved to "Cedar City Roofers" Supabase project

