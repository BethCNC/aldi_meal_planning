# Gemini Migration Guide

This document outlines the migration from OpenAI to Google Gemini for AI-powered meal planning features.

## Environment Variables

### Required Changes

**Backend (.env):**
- Remove: `OPENAI_API_KEY`
- Add: `GEMINI_API_KEY=your-gemini-api-key-here`

**Frontend (.env or Vite env):**
- Remove: `VITE_OPENAI_API_KEY`
- Add: `VITE_GEMINI_API_KEY=your-gemini-api-key-here` (optional, only if using client-side Gemini)

## Getting a Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key and add it to your `.env` file

## Files Changed

### Backend
- `backend/ai/geminiClient.js` - New Gemini client implementation
- `server/index.js` - Updated to use Gemini instead of OpenAI
- `backend/algorithms/recipeMatching.js` - Updated import path

### Frontend
- `src/api/ai/gemini.js` - New Gemini client (replaces `openai.js`)
- `src/api/ai/recipeDiscovery.js` - Removed OpenAI dependency
- `src/api/ai/openai.js` - **DELETED** (replaced by `gemini.js`)

## API Changes

The Gemini API uses a different interface than OpenAI:

- **OpenAI:** `openai.chat.completions.create()` with messages array
- **Gemini:** `model.generateContent()` with a single prompt string

JSON responses are extracted from Gemini's text output, handling markdown code blocks if present.

## Testing

After updating environment variables:

1. Restart the backend server: `npm run dev:server`
2. Restart the frontend: `npm run dev`
3. Test meal plan generation to verify Gemini is working

## Notes

- Gemini model used: `gemini-1.5-pro`
- The backend API endpoints (`/api/ai/plan` and `/api/ai/discover`) now use Gemini
- Frontend code that calls these endpoints doesn't need changes (they use the same API contract)

