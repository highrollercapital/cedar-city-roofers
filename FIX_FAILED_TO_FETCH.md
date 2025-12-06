# Fix "Failed to Fetch" Error

If you're getting a **"Failed to fetch"** error during registration, follow these steps:

## Quick Fix

Based on your anon key, your Supabase project ID is: **nnvllbxleujvqoyfqgqe**

Your `.env` file should contain:

```env
VITE_SUPABASE_URL=https://nnvllbxleujvqoyfqgqe.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5udmxsYnhsZXVqdnFveWZxZ3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MTQ2OTIsImV4cCI6MjA4MDI5MDY5Mn0.7cRRzQhwS6pTbV7GMhQ2u1XNyT8Xf9K1Y-zrTsu8cd4
```

## Step-by-Step Fix

### 1. Check Your .env File

1. Open your `.env` file in the project root
2. Make sure it contains exactly:
   ```env
   VITE_SUPABASE_URL=https://nnvllbxleujvqoyfqgqe.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5udmxsYnhsZXVqdnFveWZxZ3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MTQ2OTIsImV4cCI6MjA4MDI5MDY5Mn0.7cRRzQhwS6pTbV7GMhQ2u1XNyT8Xf9K1Y-zrTsu8cd4
   ```

3. **Important**: 
   - No spaces around the `=` sign
   - No quotes around the values
   - URL must start with `https://`
   - URL must end with `.supabase.co`

### 2. Verify Your Supabase Project is Active

1. Go to [supabase.com](https://supabase.com)
2. Check if your project **"Cedar City Roofers"** is active (not paused)
3. If paused, click "Restore" to activate it

### 3. Test the URL

1. Open your browser
2. Try accessing: `https://nnvllbxleujvqoyfqgqe.supabase.co`
3. You should see a Supabase page (not an error)

### 4. Restart Your Dev Server

**Critical**: Environment variables only load when the server starts!

1. Stop your dev server (press `Ctrl+C`)
2. Start it again:
   ```bash
   npm run dev
   ```

### 5. Check Browser Console

1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for any errors
4. You should see: `✅ Supabase configured`

## Common Issues

### Issue: Wrong URL Format

**Wrong:**
```env
VITE_SUPABASE_URL=https://nnvllbxleujvqoyfqgqe.supabase.co/
VITE_SUPABASE_URL=nnvllbxleujvqoyfqgqe.supabase.co
VITE_SUPABASE_URL=http://nnvllbxleujvqoyfqgqe.supabase.co
```

**Correct:**
```env
VITE_SUPABASE_URL=https://nnvllbxleujvqoyfqgqe.supabase.co
```

### Issue: Project is Paused

- Go to Supabase dashboard
- Check project status
- If paused, restore it

### Issue: CORS Error

- Make sure you're using the correct URL
- Check Supabase project settings → API → CORS
- For localhost, add: `http://localhost:8080`

### Issue: Network/Firewall

- Check your internet connection
- Try accessing the Supabase URL directly in browser
- Check if firewall is blocking the connection

## Verify Configuration

After fixing, check the browser console. You should see:

```
✅ Supabase configured
URL: https://nnvllbxleujvqoyfqgqe.supabase.co/***
```

If you see errors, check:
1. `.env` file location (must be in project root)
2. File name (must be exactly `.env`)
3. Variable names (must be `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`)
4. No typos in the values

## Still Not Working?

1. **Clear browser cache** and try again
2. **Check Supabase project** is not paused
3. **Verify credentials** in Supabase Dashboard → Settings → API
4. **Try incognito mode** to rule out browser extensions
5. **Check network tab** in DevTools for the actual error

## Need Help?

If it's still not working:
1. Check browser console for specific error messages
2. Verify your Supabase project is active
3. Make sure you restarted the dev server after updating `.env`
4. Try the URL directly in your browser to confirm it's accessible

