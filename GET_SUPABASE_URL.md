# How to Get Your Correct Supabase URL

Follow these steps to get the correct Supabase URL for your "Cedar City Roofers" project:

## Step 1: Open Your Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign in to your account
3. Find and click on your project: **"Cedar City Roofers"**

## Step 2: Get Your Project URL

1. In your project dashboard, click **Settings** (gear icon in the left sidebar)
2. Click **API** in the settings menu
3. Look for **"Project URL"** or **"URL"**
4. It should look like: `https://xxxxxxxxxxxxx.supabase.co`
5. **Copy this entire URL** (including `https://` and `.supabase.co`)

## Step 3: Get Your Anon Key

1. Still in **Settings → API**
2. Look for **"anon public"** or **"anon"** key
3. It's a long string starting with `eyJ...`
4. **Copy this entire key**

## Step 4: Update Your .env File

1. Open your `.env` file in the project root
2. Update it with your actual values:

```env
VITE_SUPABASE_URL=https://your-actual-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-anon-key-here
```

**Important:**
- Replace `your-actual-project-id` with the actual project ID from Step 2
- Replace `your-actual-anon-key-here` with the actual key from Step 3
- No spaces around the `=` sign
- No quotes around the values
- URL must start with `https://`
- URL must end with `.supabase.co` (no trailing slash)

## Step 5: Verify the URL Works

1. Open your browser
2. Paste your Supabase URL (e.g., `https://xxxxxxxxxxxxx.supabase.co`)
3. You should see a Supabase page (not an error)
4. If you see an error, the URL might be wrong or the project is paused

## Step 6: Restart Your Dev Server

**Critical**: Environment variables only load when the server starts!

1. Stop your dev server (press `Ctrl+C` in the terminal)
2. Start it again:
   ```bash
   npm run dev
   ```

## Step 7: Test Registration

1. Go to `http://localhost:8080/register`
2. Fill in the form
3. Select "Roofer / Partner" as account type
4. Click "Create Account"
5. It should work now!

## Troubleshooting

### Can't find the URL in Settings?

- Make sure you're in the correct project ("Cedar City Roofers")
- The URL is in **Settings → API → Project URL**
- It's usually at the top of the API settings page

### URL doesn't work in browser?

- Check if the project is paused (restore it if needed)
- Verify you copied the entire URL correctly
- Make sure it includes `https://` at the beginning

### Still getting errors?

1. Double-check your `.env` file:
   - File is named exactly `.env` (not `.env.txt`)
   - File is in the project root (same folder as `package.json`)
   - No typos in variable names
   - Values match exactly what's in Supabase dashboard

2. Verify in browser console:
   - Open DevTools (F12)
   - Check Console tab
   - Look for: `✅ Supabase configured`

3. Test the connection:
   - Try accessing your Supabase URL directly in browser
   - Should show a Supabase page, not an error

## Example .env File

Here's what a correct `.env` file looks like:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzODk2NzI5MCwiZXhwIjoxOTU0NTQzMjkwfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Note**: Replace with YOUR actual values from Supabase dashboard!

