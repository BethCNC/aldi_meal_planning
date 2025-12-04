# Fix: Missing Supabase Environment Variables in Production

## 🐛 The Error

You're seeing this error in the browser console:
```
Missing Supabase environment variables. VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set.
```

## 🔍 Why This Happens

Vite (the build tool) embeds environment variables **at build time**, not runtime. This means:
- The variables must be available when Docker builds the frontend
- Just setting them in Coolify isn't enough - you must **rebuild** after adding them
- The Dockerfile needs to accept them as build arguments

## ✅ Quick Fix (5 minutes)

### Step 1: Verify Variables in Coolify

1. Go to your Coolify dashboard
2. Navigate to your application
3. Go to **Environment Variables** section
4. Verify these are set (with exact names):
   - `VITE_SUPABASE_URL` = `https://lekyfdszxebftrnpwwhm.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `your-anon-key-here`

### Step 2: Get Your Supabase Keys (if needed)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/lekyfdszxebftrnpwwhm)
2. Click **Settings** (gear icon) → **API**
3. Copy:
   - **Project URL** → Use for `VITE_SUPABASE_URL`
   - **anon public** key → Use for `VITE_SUPABASE_ANON_KEY`

### Step 3: Add/Update Variables in Coolify

1. In Coolify → Your App → **Environment Variables**
2. Add or update:
   ```
   VITE_SUPABASE_URL=https://lekyfdszxebftrnpwwhm.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
3. **Important:** Make sure the names are exactly `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (case-sensitive)

### Step 4: REBUILD (Critical!)

**You MUST rebuild, not just restart:**

1. In Coolify → Your App
2. Click **"Rebuild"** or **"Redeploy"** button
3. Wait for the build to complete (this may take 2-5 minutes)
4. The build process will embed the variables into the frontend code

### Step 5: Verify It Works

1. After rebuild completes, visit your app
2. Open browser console (F12)
3. The error should be gone
4. Try signing in - it should work now

## 🐛 Still Not Working?

### Check 1: Variable Names

Make sure the names are **exactly**:
- `VITE_SUPABASE_URL` (not `SUPABASE_URL` or `VITE_SUPABASE_URL_`)
- `VITE_SUPABASE_ANON_KEY` (not `SUPABASE_ANON_KEY` or `VITE_SUPABASE_KEY`)

### Check 2: Build Logs

1. In Coolify → Your App → **Logs**
2. Look for the build stage
3. Check if you see any errors about missing variables
4. The build should show: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` being used

### Check 3: Values Are Correct

- `VITE_SUPABASE_URL` should be: `https://lekyfdszxebftrnpwwhm.supabase.co`
- `VITE_SUPABASE_ANON_KEY` should be a long string starting with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- No extra spaces or quotes around the values

### Check 4: Dockerfile is Updated

The Dockerfile should have these lines in the builder stage:
```dockerfile
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
```

If your Dockerfile doesn't have these, pull the latest code from GitHub.

## 📋 Checklist

- [ ] `VITE_SUPABASE_URL` is set in Coolify environment variables
- [ ] `VITE_SUPABASE_ANON_KEY` is set in Coolify environment variables
- [ ] Variable names are exactly correct (case-sensitive)
- [ ] Values are correct (no typos, no extra spaces)
- [ ] **Application was REBUILT after adding/updating variables**
- [ ] Build completed successfully (check logs)
- [ ] Browser console shows no Supabase errors

## 🔗 Quick Links

- **Supabase Dashboard:** https://supabase.com/dashboard/project/lekyfdszxebftrnpwwhm
- **Supabase API Settings:** https://supabase.com/dashboard/project/lekyfdszxebftrnpwwhm/settings/api

---

**Last Updated:** 2025-01-XX
**Status:** Active Fix Guide

