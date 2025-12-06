# OpenAI DALL-E Image Generation Setup Guide

This guide will help you set up OpenAI DALL-E to generate AI images for roof types in proposal views.

## Step 1: Get OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to **API Keys** section
4. Click **"Create new secret key"**
5. Copy your API key (you'll only see it once!)

## Step 2: Set Up Backend API Endpoint

You need to create a backend endpoint that will securely call OpenAI DALL-E. Choose one of these options:

### Option A: Supabase Edge Function (Recommended)

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Create a new Edge Function:
   ```bash
   supabase functions new generate-roof-image
   ```

3. Create the function file at `supabase/functions/generate-roof-image/index.ts`:
   ```typescript
   import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
   import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

   const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

   serve(async (req) => {
     try {
       const { prompt, roofType, size = '1024x1024' } = await req.json()

       if (!prompt) {
         return new Response(
           JSON.stringify({ success: false, error: 'Prompt is required' }),
           { status: 400, headers: { 'Content-Type': 'application/json' } }
         )
       }

       // Call OpenAI DALL-E API
       const response = await fetch('https://api.openai.com/v1/images/generations', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${OPENAI_API_KEY}`
         },
         body: JSON.stringify({
           model: 'dall-e-3',
           prompt: prompt,
           size: size,
           quality: 'standard',
           n: 1
         })
       })

       if (!response.ok) {
         const error = await response.json()
         throw new Error(error.error?.message || 'Failed to generate image')
       }

       const data = await response.json()
       const imageUrl = data.data[0].url

       return new Response(
         JSON.stringify({ 
           success: true, 
           imageUrl: imageUrl,
           revisedPrompt: data.data[0].revised_prompt 
         }),
         { headers: { 'Content-Type': 'application/json' } }
       )
     } catch (error) {
       return new Response(
         JSON.stringify({ success: false, error: error.message }),
         { status: 500, headers: { 'Content-Type': 'application/json' } }
       )
     }
   })
   ```

4. Deploy the function:
   ```bash
   supabase functions deploy generate-roof-image
   ```

5. Set the OpenAI API key as a secret:
   ```bash
   supabase secrets set OPENAI_API_KEY=your_openai_api_key_here
   ```

6. Update the frontend to use Supabase Edge Function:
   In `src/lib/api-integrations.ts`, update the `generateRoofImage` function:
   ```typescript
   export const generateRoofImage = async (
     config: GenerateImageConfig
   ): Promise<{ success: boolean; imageUrl?: string; error?: string }> => {
     try {
       const { data: { session } } = await supabase.auth.getSession();
       
       const response = await fetch(
         `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-roof-image`,
         {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
             'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`
           },
           body: JSON.stringify(config),
         }
       );

       if (!response.ok) {
         const errorData = await response.json().catch(() => ({ error: 'Failed to generate image' }));
         throw new Error(errorData.error || 'Failed to generate image');
       }

       const data = await response.json();
       return { success: true, imageUrl: data.imageUrl };
     } catch (error: any) {
       return { success: false, error: error.message };
     }
   };
   ```

### Option B: Vercel Serverless Function

1. Create `api/images/generate.ts` in your project:
   ```typescript
   import { VercelRequest, VercelResponse } from '@vercel/node';

   export default async function handler(req: VercelRequest, res: VercelResponse) {
     if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
     }

     const { prompt, roofType, size = '1024x1024' } = req.body;

     if (!prompt) {
       return res.status(400).json({ success: false, error: 'Prompt is required' });
     }

     try {
       const response = await fetch('https://api.openai.com/v1/images/generations', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
         },
         body: JSON.stringify({
           model: 'dall-e-3',
           prompt: prompt,
           size: size,
           quality: 'standard',
           n: 1
         })
       });

       if (!response.ok) {
         const error = await response.json();
         throw new Error(error.error?.message || 'Failed to generate image');
       }

       const data = await response.json();
       const imageUrl = data.data[0].url;

       res.json({ 
         success: true, 
         imageUrl: imageUrl,
         revisedPrompt: data.data[0].revised_prompt 
       });
     } catch (error: any) {
       res.status(500).json({ 
         success: false, 
         error: error.message || 'Failed to generate image' 
       });
     }
   }
   ```

2. Add environment variable in Vercel dashboard:
   - Go to your project settings
   - Add `OPENAI_API_KEY` with your OpenAI API key

3. Update frontend API call in `src/lib/api-integrations.ts`:
   ```typescript
   const response = await fetch('/api/images/generate', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify(config),
   });
   ```

### Option C: Express.js Backend Server

See `backend-api-examples.js` for a complete Express.js example. The endpoint is already included in that file.

1. Install dependencies:
   ```bash
   npm install openai express cors
   ```

2. Set environment variable:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   ```

3. The endpoint is already defined in `backend-api-examples.js` at `/api/images/generate`

## Step 3: Update Frontend Environment Variables

If using a custom backend URL, add to `.env`:
```env
VITE_API_BASE_URL=https://your-backend-url.com
```

## Step 4: Test the Integration

1. Create a proposal with a roof type selected
2. Open the proposal preview
3. The image should be generated using DALL-E
4. Check browser console for any errors

## Cost Considerations

- DALL-E 3 pricing: ~$0.04 per image (1024x1024, standard quality)
- Images are generated on-demand when viewing proposals
- Consider caching generated images to reduce API calls
- Each roof type will generate a unique image

## Troubleshooting

### "Failed to generate image"
- Check that your OpenAI API key is correct
- Verify the backend endpoint is accessible
- Check backend logs for errors
- Ensure you have credits in your OpenAI account

### Images not showing
- Check browser console for errors
- Verify the API endpoint URL is correct
- Check CORS settings if using a separate backend
- Ensure the image URL is accessible

### Rate limiting
- OpenAI has rate limits based on your plan
- Consider implementing image caching
- Add retry logic with exponential backoff

## Next Steps

- Implement image caching to reduce API calls
- Store generated images in Supabase Storage
- Add loading states and error handling
- Consider using DALL-E 2 for faster/cheaper generation if quality allows

