# AI Image Generation Setup Guide

The proposal preview now includes AI-generated roof images based on the selected roof type. The system is designed to work with multiple image generation services.

## Current Implementation

The `RoofImageGenerator` component currently uses:
1. **Unsplash API** (if `VITE_UNSPLASH_ACCESS_KEY` is set)
2. **Pexels API** (if `VITE_PEXELS_API_KEY` is set)
3. **Fallback** to a curated image if APIs are not available

## Setting Up Image APIs

### Option 1: Unsplash API (Recommended for Free Tier)

1. Sign up at [Unsplash Developers](https://unsplash.com/developers)
2. Create a new application
3. Get your Access Key
4. Add to `.env`:
   ```env
   VITE_UNSPLASH_ACCESS_KEY=your_unsplash_access_key_here
   ```

### Option 2: Pexels API (Free Tier Available)

1. Sign up at [Pexels API](https://www.pexels.com/api/)
2. Get your API key
3. Add to `.env`:
   ```env
   VITE_PEXELS_API_KEY=your_pexels_api_key_here
   ```

## Integrating True AI Image Generation

For actual AI-generated images (DALL-E, Stable Diffusion, etc.), you'll need to:

### Option 1: OpenAI DALL-E (Requires Backend)

1. Create a backend endpoint (e.g., `/api/generate-image`)
2. Use OpenAI DALL-E API:
   ```javascript
   // Backend endpoint example
   const response = await openai.images.generate({
     model: "dall-e-3",
     prompt: prompt,
     size: "1024x1024",
     quality: "standard",
     n: 1,
   });
   ```
3. Update `RoofImageGenerator` to call your backend:
   ```typescript
   const response = await fetch('/api/generate-image', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ prompt, roofType })
   });
   const data = await response.json();
   setImageUrl(data.imageUrl);
   ```

### Option 2: Replicate Stable Diffusion (Requires Backend)

1. Sign up at [Replicate](https://replicate.com)
2. Create a backend endpoint
3. Use Replicate API:
   ```javascript
   const output = await replicate.run(
     "stability-ai/stable-diffusion:...",
     { input: { prompt } }
   );
   ```

### Option 3: Cloudinary AI Image Generation

1. Sign up at [Cloudinary](https://cloudinary.com)
2. Use Cloudinary's AI image generation:
   ```javascript
   const url = cloudinary.url('sample', {
     transformation: [
       { effect: 'gen_ai:generate', prompt: prompt }
     ]
   });
   ```

## Image Prompts

The system uses optimized prompts for each roof type:
- **Asphalt Shingle**: "professional asphalt shingle roof installation, modern residential home..."
- **Metal Roofing**: "professional metal roofing installation, sleek modern residential home..."
- **Tile Roofing**: "professional tile roof installation, elegant residential home..."
- And more...

These prompts are designed to generate high-quality, professional roof images that match the selected roof type.

## Notes

- The current implementation uses stock photo APIs as a placeholder
- For production, integrate with a true AI image generation service
- All API keys should be stored securely and never exposed in client-side code
- Consider caching generated images to reduce API calls and costs

