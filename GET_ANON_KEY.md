# 🔑 How to Get Your Supabase Anon Key

## Quick Steps:

1. **Go to Supabase Dashboard**
   - https://supabase.com/dashboard
   - Select project: **"Cedar City Roofers"**

2. **Navigate to Settings**
   - Click **"Settings"** in the left sidebar
   - Click **"API"**

3. **Copy the Anon Key**
   - Find **"Project API keys"** section
   - Copy the **"anon"** or **"public"** key (NOT the service_role key)
   - It should start with `eyJ...`

4. **Update .env File**
   - Open `.env` file in this project
   - Replace `your-anon-key-here` with your actual anon key
   - Save the file

5. **Restart Dev Server**
   ```bash
   # Stop the current server (Ctrl+C)
   # Then restart:
   npm run dev
   ```

## Example .env file:

```env
VITE_SUPABASE_URL=https://nnvllbxleujvqoyfqgqe.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5udnZsbGJ4bGV1anZxb3lmcWdxZSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzE5ODc2NTIzLCJleHAiOjIwMzU0NTI1MjN9.your-actual-key-here
```

## ⚠️ Important:

- **Anon Key** = Safe to use in frontend (public)
- **Service Role Key** = NEVER use in frontend (private, full access)
- The anon key is what your React app needs

