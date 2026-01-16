# How to Start Backend and Frontend Servers

## Project Structure

You have two apps in this codebase:
1. **Original App** - Located in `src/` folder (root level)
2. **App 2.0** - Located in `aldi-meal-planner-2.0/` folder (newer version)

## Starting the Servers

### Option 1: Using Two Terminal Windows (Recommended)

**Terminal 1 - Backend Server:**
```bash
cd /Users/bethcartrette/REPOS/aldi_meal_planning
npm run dev:server
```
- Runs on: `http://localhost:3000`
- Handles API routes: `/api/v1/plan`, `/api/v1/recipes`, `/api/v1/images`
- Health check: `http://localhost:3000/api/health`

**Terminal 2 - Frontend (App 2.0):**
```bash
cd /Users/bethcartrette/REPOS/aldi_meal_planning/aldi-meal-planner-2.0
npm run dev
```
- Runs on: `http://localhost:5173`
- Proxies API calls to backend on port 3000
- This is the version with budget constraints feature

### Option 2: Using Background Processes

**Start Backend in Background:**
```bash
cd /Users/bethcartrette/REPOS/aldi_meal_planning
npm run dev:server &
```

**Start Frontend:**
```bash
cd /Users/bethcartrette/REPOS/aldi_meal_planning/aldi-meal-planner-2.0
npm run dev
```

## Quick Start Script

You can also create a simple script to start both:

```bash
# In root directory
npm run dev:server & cd aldi-meal-planner-2.0 && npm run dev
```

## Environment Variables

Make sure you have a `.env` file in the root directory with:
```env
GEMINI_API_KEY=your_api_key_here
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
PORT=3000
```

And in `aldi-meal-planner-2.0/.env`:
```env
GEMINI_API_KEY=your_api_key_here
```

## Verify Everything is Running

1. **Backend Health Check:**
   ```bash
   curl http://localhost:3000/api/health
   ```
   Should return: `{"status":"ok","timestamp":"..."}`

2. **Frontend:**
   Open browser to: `http://localhost:5173`

## Troubleshooting

- **Port 3000 already in use?** 
  - Kill the process: `lsof -ti:3000 | xargs kill`
  - Or change PORT in `.env`

- **Port 5173 already in use?**
  - Vite will automatically use the next available port
  - Or kill: `lsof -ti:5173 | xargs kill`

- **API connection errors?**
  - Make sure backend is running first
  - Check that proxy is configured in `aldi-meal-planner-2.0/vite.config.ts`

## Summary

| Server | Command | Directory | Port |
|--------|---------|-----------|------|
| Backend | `npm run dev:server` | Root (`/`) | 3000 |
| Frontend 2.0 | `npm run dev` | `aldi-meal-planner-2.0/` | 5173 |
