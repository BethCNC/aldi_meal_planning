# Coolify Deployment Guide - Aldi Meal Planner

This guide walks you through deploying the **aldi-meal-planner** React + Express app to Coolify.

## Prerequisites

- A Coolify instance (self-hosted or cloud)
- A Supabase project with:
  - Database set up (run migration `docs/migrations/001_add_user_isolation.sql`)
  - Email/Password auth enabled
  - API keys ready
- A Google Gemini API key
- Git repository (GitHub, GitLab, etc.) with your code pushed

## Step 1: Run Database Migration (Do This First!)

**Before deploying, you MUST run the migration in Supabase:**

1. Open your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Open `docs/migrations/001_add_user_isolation.sql` in your code editor
6. Copy the entire SQL file contents
7. Paste into Supabase SQL Editor
8. Click **Run** (or press Cmd/Ctrl + Enter)
9. You should see: "Success. No rows returned"
10. Verify in **Table Editor** that `meal_plans`, `user_pantry`, and `grocery_lists` now have `user_id` columns

## Step 2: Enable Authentication Providers

### Enable Email/Password Authentication

1. In Supabase Dashboard, go to **Authentication** → **Providers**
2. Find **Email** provider
3. Toggle it **ON**
4. (Optional) Disable "Confirm email" for faster testing
5. Click **Save**

### Enable Google OAuth (Optional but Recommended)

1. In Supabase Dashboard, go to **Authentication** → **Providers**
2. Find **Google** provider
3. Toggle it **ON**
4. You'll need to configure Google OAuth credentials:
   - **Client ID:** From Google Cloud Console
   - **Client Secret:** From Google Cloud Console
5. **Important:** Add your production URL to Google Cloud Console:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to **APIs & Services** → **Credentials**
   - Edit your OAuth 2.0 Client ID
   - Add to **Authorized redirect URIs:**
     - `https://YOUR-SUPABASE-PROJECT.supabase.co/auth/v1/callback`
     - Replace `YOUR-SUPABASE-PROJECT` with your actual Supabase project ID
6. **CRITICAL:** In Supabase, go to **Authentication** → **URL Configuration**
7. Add your production URL to **Redirect URLs:**
   - `https://your-production-domain.com` (replace with your actual Coolify domain)
   - `https://your-production-domain.com/**`
   - **Example:** If your app is at `https://aldi-meal-planner.yourdomain.com`, add:
     - `https://aldi-meal-planner.yourdomain.com`
     - `https://aldi-meal-planner.yourdomain.com/**`
8. Set **Site URL** to your production URL (same as above)
9. Click **Save**
10. **Note:** The callback URL `https://lekyfdszxebftrnpwwhm.supabase.co/auth/v1/callback` is already configured in Google Cloud Console - you don't need to change that.

## Step 3: Prepare Your Repository

Ensure your code is pushed to Git:

```bash
git add .
git commit -m "Ready for Coolify deployment"
git push origin main
```

Verify these files exist in your repo:
- `Dockerfile` (root directory)
- `server/index.js` (Express server)
- `package.json` (with `express` dependency)
- `docs/migrations/001_add_user_isolation.sql`

## Step 4: Create New Application in Coolify

1. Log into your Coolify dashboard
2. Navigate to **Applications** → **New Application**
3. Choose **Dockerfile** deployment (not Docker Compose)
4. Connect your Git repository
5. Select the branch (usually `main` or `master`)

## Step 5: Configure Environment Variables

In Coolify's **Environment Variables** section, add these **exact** variable names:

```bash
# Supabase Configuration (Frontend - Vite needs VITE_ prefix)
# ⚠️ IMPORTANT: These are embedded at BUILD TIME, not runtime
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here

# Supabase Configuration (Backend - server/index.js uses these)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Gemini Configuration (Backend Only - server/index.js)
GEMINI_API_KEY=your-gemini-api-key-here

# Server Configuration
PORT=3000
NODE_ENV=production
```

**Important Notes:**
- **VITE_ prefixed variables** are embedded into the frontend code during the Docker build
- Coolify automatically passes environment variables as build arguments to Docker
- **After adding/updating VITE_ variables, you MUST rebuild the application** (they won't work if just restarted)
- The Dockerfile is configured to accept these as build arguments automatically

### Where to Find These Values

**Supabase Keys:**
1. Go to your Supabase project dashboard
2. Click **Settings** (gear icon) → **API**
3. **Project URL** → Copy to both `SUPABASE_URL` and `VITE_SUPABASE_URL`
4. **anon public** key → Copy to `VITE_SUPABASE_ANON_KEY`
5. **service_role** key → Copy to `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **Keep this secret!**

**Gemini Key:**
1. Go to https://aistudio.google.com/app/apikey
2. Click **Create API Key** (or use existing key)
3. Copy the key → Paste to `GEMINI_API_KEY`

**Important Notes:**
- The server (`server/index.js`) will use `SUPABASE_SERVICE_ROLE_KEY` if available, otherwise falls back to `VITE_SUPABASE_ANON_KEY`
- Frontend (`src/lib/supabase.js`) uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- The server uses `GEMINI_API_KEY` for AI features (Gemini 1.5 Flash model)
- All variables must be set in Coolify (don't rely on `.env` files in production)

## Step 6: Configure Build Settings

In Coolify's build configuration, set these **exact** values:

- **Build Pack:** Select `Dockerfile` (not Docker Compose)
- **Dockerfile Path:** `Dockerfile` (must be exactly this, no leading slash)
- **Build Context:** `.` (single dot, means root directory)
- **Build Command:** (leave completely empty - Dockerfile handles everything)
- **Start Command:** `node server/index.js`

**Important:** 
- The Dockerfile is at the **root** of your repository
- Do NOT use `/Dockerfile` or `./Dockerfile` - just `Dockerfile`
- Build Context must be `.` (root) so Docker can find the Dockerfile

The Dockerfile will:
1. Build the React frontend with `npm run build` (creates `dist/` folder)
2. Copy `dist/` and `server/` to production image
3. Run `node server/index.js` which serves both the API and static files

**If you get "Dockerfile: no such file or directory" error:**
- Verify Dockerfile Path is exactly `Dockerfile` (not `/Dockerfile`)
- Verify Build Context is exactly `.` (not empty, not `/`)
- Check that the Dockerfile exists in your Git repository root
- Try redeploying after fixing these settings

## Step 7: Configure Ports

- **Internal Port:** `3000` (matches `PORT` env var and `server/index.js`)
- **Expose Port:** `3000` (or your preferred external port)
- Coolify will handle reverse proxy automatically

## Step 8: Deploy

1. Click **Deploy** (or **Redeploy**) in Coolify
2. Watch the build logs:
   - First build takes 5-10 minutes (installs all dependencies)
   - You should see: "Building frontend..." then "Starting server..."
3. Check for errors in the logs:
   - ❌ "Missing Supabase environment variables" → Check Step 5
   - ❌ "Missing GEMINI_API_KEY" → Check Step 5
   - ❌ Build fails → Check Dockerfile syntax
   - ✅ "Server running on port 3000" → Success!

## Step 9: Configure Domain (Optional)

1. In Coolify, go to your application's **Domains** section
2. Add your custom domain (e.g., `mealplanner.yourdomain.com`)
3. Configure DNS records as instructed by Coolify:
   - Add A record pointing to Coolify's IP
   - Or CNAME to Coolify's domain
4. SSL certificates will be automatically provisioned (Let's Encrypt)

## Step 10: Verify Deployment

1. **Visit your application URL** (Coolify provides this)
2. **Test Authentication:**
   - You should see the login/signup page (`src/pages/AuthView.jsx`)
   - Click "Sign Up" tab
   - Create a test account (e.g., `test@example.com`)
   - You should be redirected to onboarding
3. **Test Onboarding:**
   - Complete the 3-step onboarding (`src/pages/OnboardingView.jsx`)
   - Set meal plan day (e.g., Sunday)
   - Set grocery day (e.g., Monday)
   - Add pantry items (optional)
   - Click "Finish setup"
4. **Test Meal Planning:**
   - Go to **Weekly Plan** page
   - Click "Generate Meal Plan"
   - Verify it creates a plan with 4 meals (Mon/Tue/Thu/Sat)
   - Check that Wed/Fri/Sun show as "Leftovers"
5. **Test AI Features:**
   - Toggle "Use Advanced AI" checkbox
   - Generate another meal plan
   - Go to **Discover** tab (bottom nav)
   - Search for recipes (e.g., "Aldi budget meals")
   - Verify AI discovery works

## Troubleshooting

### Build Fails

**Error: "Dockerfile: no such file or directory"**
- **This is a Coolify configuration issue**
- Go to your application in Coolify → **Settings** → **Build**
- Verify **Dockerfile Path** is exactly `Dockerfile` (not `/Dockerfile` or `./Dockerfile`)
- Verify **Build Context** is exactly `.` (single dot, not empty, not `/`)
- Verify **Build Pack** is set to `Dockerfile` (not Docker Compose)
- The Dockerfile exists at the root of your repository - verify in GitHub/GitLab
- Try clicking **Save** and then **Redeploy**
- If still failing, try setting Dockerfile Path to `./Dockerfile` (with `./` prefix)

**Error: "npm ERR! code ELIFECYCLE"**
- Check build logs for specific package errors
- Verify `package.json` has `express` dependency
- Try rebuilding (sometimes npm cache issues)

**Error: "Cannot find module 'express'"**
- The Dockerfile should install dependencies automatically
- Check that `package.json` includes `"express": "^4.18.2"`
- Verify Dockerfile copies `package.json` correctly

**Error: "Missing Supabase environment variables" or "VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set"**
- **This is a build-time issue** - Vite embeds these variables during the Docker build
- Check Step 5 - `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` must be set in Coolify
- Verify variable names match exactly (case-sensitive, must have `VITE_` prefix)
- Check for typos in URLs (should end with `.supabase.co`)
- **CRITICAL:** After adding/updating `VITE_` variables, you MUST rebuild (not just restart):
  1. Go to your application in Coolify
  2. Click **"Rebuild"** or **"Redeploy"** button
  3. Wait for the build to complete
  4. The new variables will be embedded in the frontend code
- If still not working, check build logs to verify variables were passed during build

### Application Won't Start

**Error: "Server running on port 3000" but app doesn't load**
- Verify `PORT=3000` matches Coolify's port configuration
- Check that Coolify is routing traffic to port 3000
- Look for errors in Coolify application logs

**Error: "Missing GEMINI_API_KEY environment variable"**
- The server (`server/index.js` line 28) requires this
- Add `GEMINI_API_KEY` to Coolify environment variables
- Verify the key is valid (get from https://aistudio.google.com/app/apikey)

**Error: "Cannot GET /" or 404 errors**
- The server should serve `dist/index.html` for all routes
- Check that `npm run build` completed successfully
- Verify `dist/` folder exists in the Docker image

### Authentication Errors

**Error: "User must be authenticated"**
- Check that Email/Password auth is enabled in Supabase (Step 2)
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct
- Check browser console for Supabase connection errors

**Error: "RLS policy violation" or "permission denied"**
- You must run the migration SQL first (Step 1)
- Verify `user_id` columns exist in `meal_plans`, `user_pantry`, `grocery_lists`
- Check that RLS policies were created (run migration again if needed)

**Error: "Invalid login credentials"**
- Verify Email/Password provider is enabled in Supabase
- Check that you're using the correct email/password
- Try creating a new account to test

**Error: "Failed to sign in with Google" or "redirect_uri_mismatch"**
- **This is the most common Google OAuth issue in production**
- Verify Google OAuth is enabled in Supabase (Step 2)
- Check Google Cloud Console:
  1. Go to [Google Cloud Console](https://console.cloud.google.com/)
  2. Navigate to **APIs & Services** → **Credentials**
  3. Edit your OAuth 2.0 Client ID
  4. In **Authorized redirect URIs**, add:
     - `https://YOUR-SUPABASE-PROJECT.supabase.co/auth/v1/callback`
     - Replace `YOUR-SUPABASE-PROJECT` with your actual Supabase project ID
  5. **Important:** No trailing slash, exact case, exact path
- Check Supabase URL Configuration:
  1. In Supabase Dashboard → **Authentication** → **URL Configuration**
  2. **Site URL:** Should be your production URL (e.g., `https://your-app.com`)
  3. **Redirect URLs:** Must include:
     - `https://your-app.com`
     - `https://your-app.com/**`
- Wait 1-2 minutes after making changes for them to propagate
- Clear browser cache or try incognito mode
- Check browser console for specific error messages

### AI Features Not Working

**Error: "Failed to generate meal plan" or "API error: 401"**
- Check that `GEMINI_API_KEY` is set correctly in Coolify
- Verify the key is valid (test at https://aistudio.google.com/app/apikey)
- Check backend logs in Coolify for Gemini API errors

**Error: "User must be authenticated to use AI features"**
- The backend (`server/index.js`) verifies JWT tokens
- Ensure you're logged in before using AI features
- Check browser Network tab - API calls should include `Authorization: Bearer ...` header

**Error: "Failed to discover recipes"**
- Check backend logs for Gemini API errors
- Verify `GEMINI_API_KEY` has sufficient quota/access
- Test the `/api/ai/discover` endpoint directly (check Network tab)

### Frontend Not Loading

**Blank page or "Cannot GET /"**
- The Express server (`server/index.js`) serves static files from `dist/`
- Verify the build completed: check logs for "Build complete"
- Check that `dist/index.html` exists in the Docker container

**Error: "Failed to fetch" or CORS errors**
- The backend API endpoints (`/api/ai/*`) should work from same origin
- If using custom domain, ensure it's configured correctly
- Check that the server is running (look for "Server running on port 3000" in logs)

## Post-Deployment Checklist

**Before Deployment:**
- [ ] Database migration applied (`docs/migrations/001_add_user_isolation.sql` in Supabase)
- [ ] Email/Password auth enabled in Supabase Dashboard
- [ ] All 6 environment variables set in Coolify:
  - [ ] `VITE_SUPABASE_URL`
  - [ ] `VITE_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `GEMINI_API_KEY`
  - [ ] `PORT=3000`
  - [ ] `NODE_ENV=production`

**After Deployment:**
- [ ] Application builds successfully (check Coolify logs)
- [ ] Application starts without errors (look for "Server running on port 3000")
- [ ] Can access the app URL (shows login/signup page)
- [ ] Can create user account (sign up works)
- [ ] Can log in with created account
- [ ] Onboarding flow works (3 steps complete)
- [ ] Can generate meal plans (standard mode)
- [ ] AI features work (toggle "Use Advanced AI" and generate)
- [ ] Recipe Discovery works (Discover tab → search recipes)
- [ ] Pantry feature works (add/view pantry items)
- [ ] Grocery list generation works

## Updating the Application

1. Make your code changes locally
2. Test locally (optional but recommended):
   ```bash
   npm run build
   npm start
   # Test at http://localhost:3000
   ```
3. Commit and push to Git:
   ```bash
   git add .
   git commit -m "Your update message"
   git push origin main
   ```
4. In Coolify, click **Redeploy**
5. Coolify will:
   - Pull latest code from Git
   - Rebuild the Docker image
   - Restart the application
6. Check logs to verify deployment succeeded

## Project Structure Reference

For troubleshooting, here's what the deployment uses:

```
aldi_meal_planning/
├── Dockerfile              # Multi-stage build (builds React, then serves with Express)
├── server/
│   └── index.js           # Express server (serves API + static files)
├── src/                   # React frontend source
│   ├── lib/supabase.js    # Frontend Supabase client (uses VITE_ vars)
│   ├── api/ai/            # AI API calls (plannerAgent.js, recipeDiscovery.js)
│   └── pages/             # React pages (AuthView, WeeklyPlanView, etc.)
├── package.json           # Dependencies (includes express, @google/generative-ai, @supabase/supabase-js)
└── dist/                  # Built React app (created by `npm run build`)
```

**Key Files:**
- `server/index.js` - Express server, handles `/api/ai/*` endpoints
- `src/lib/supabase.js` - Frontend Supabase client
- `src/api/ai/plannerAgent.js` - Calls backend `/api/ai/plan` (uses Gemini)
- `src/api/ai/recipeDiscovery.js` - Calls backend `/api/ai/discover` (uses Gemini)
- `backend/ai/geminiClient.js` - Gemini client for backend AI operations

## Security Notes

- ⚠️ **Never commit `.env` or `.env.local` files to Git**
- ⚠️ **Keep `SUPABASE_SERVICE_ROLE_KEY` secret** - it bypasses RLS
- ⚠️ **Keep `GEMINI_API_KEY` secret** - it's used server-side only
- ✅ Use Coolify's environment variable management (secure, encrypted)
- ✅ The frontend never sees `GEMINI_API_KEY` (only backend has it)
- ✅ RLS policies protect user data (each user only sees their own data)
- ✅ Regularly update dependencies: `npm audit` and `npm update`

## Environment Variable Reference

**Frontend (Vite - needs `VITE_` prefix):**
- `VITE_SUPABASE_URL` - Used by `src/lib/supabase.js`
- `VITE_SUPABASE_ANON_KEY` - Used by `src/lib/supabase.js`

**Backend (Node.js - no prefix needed):**
- `SUPABASE_URL` - Used by `server/index.js` for JWT verification
- `SUPABASE_SERVICE_ROLE_KEY` - Used by `server/index.js` (fallback: `VITE_SUPABASE_ANON_KEY`)
- `GEMINI_API_KEY` - Used by `server/index.js` for AI endpoints (Gemini 1.5 Flash)
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Set to `production`

## Support & Debugging

If you encounter issues:

1. **Check Coolify Application Logs:**
   - Go to your app in Coolify
   - Click **Logs** tab
   - Look for errors (red text)
   - Common errors are listed in Troubleshooting section above

2. **Check Supabase Logs:**
   - Go to Supabase Dashboard → **Logs**
   - Check **API Logs** for database errors
   - Check **Auth Logs** for authentication errors

3. **Check Browser Console:**
   - Open browser DevTools (F12)
   - Check **Console** tab for frontend errors
   - Check **Network** tab for failed API calls

4. **Verify Environment Variables:**
   - In Coolify, go to **Environment Variables**
   - Verify all 6 variables are set
   - Check for typos (especially in URLs)

5. **Test Backend API Directly:**
   - Try: `https://your-app-url.com/api/health`
   - Should return: `{"status":"ok","timestamp":"..."}`
   - If this fails, the server isn't running correctly

6. **Review This Guide:**
   - Make sure you completed Steps 1-2 (migration + auth setup)
   - Verify all environment variables match exactly
   - Check that Dockerfile build completed successfully

