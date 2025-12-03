# 🔧 Fix Google OAuth - Step-by-Step Guide

## The Problem
Google sign-in redirects to: `https://lekyfdszxebftrnpwwhm.supabase.co/auth/v1/callback` but it's not working.

## ✅ Quick Fix (5 minutes)

### Step 1: Add Redirect URI to Google Cloud Console

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/
   - Select your project (or create one if needed)

2. **Navigate to OAuth Credentials:**
   - Click **APIs & Services** in the left sidebar
   - Click **Credentials**
   - Find your **OAuth 2.0 Client ID** (the one used for Supabase)
   - Click on it to edit

3. **Add the Redirect URI:**
   - Scroll to **Authorized redirect URIs**
   - Click **+ ADD URI**
   - Paste this EXACT URL (no variations):
     ```
     https://lekyfdszxebftrnpwwhm.supabase.co/auth/v1/callback
     ```
   - ⚠️ **CRITICAL CHECKS:**
     - ✅ No trailing slash (`/` at the end)
     - ✅ All lowercase
     - ✅ Exact path: `/auth/v1/callback`
     - ✅ Exact domain: `lekyfdszxebftrnpwwhm.supabase.co`
   - Click **Save**

### Step 2: Verify Supabase URL Configuration

1. **Go to Supabase Dashboard:**
   - Visit: https://supabase.com/dashboard
   - Select your project: `lekyfdszxebftrnpwwhm`

2. **Check URL Configuration:**
   - Click **Authentication** in the left sidebar
   - Click **URL Configuration**
   - Verify these settings:

   **Site URL:**
   - For development: `http://localhost:5173`
   - For production: Your production URL

   **Redirect URLs:**
   - Must include: `http://localhost:5173`
   - Must include: `http://localhost:5173/**`
   - (Add your production URLs if deploying)

3. **Save if you made changes**

### Step 3: Verify Google Provider is Enabled

1. In Supabase Dashboard:
   - Go to **Authentication** → **Providers**
   - Find **Google** in the list
   - Make sure it's **Enabled** (toggle should be ON)
   - Verify **Client ID** and **Client Secret** are filled in
   - These should match your Google Cloud Console credentials

### Step 4: Test Again

1. **Wait 1-2 minutes** for Google changes to propagate
2. **Clear browser cache** or use incognito mode
3. Go to your app: `http://localhost:5173/auth`
4. Click **"Sign in with Google"** or **"Sign up with Google"**
5. Should now redirect to Google sign-in page!

## 🐛 Still Not Working?

### Check 1: Verify the Exact Callback URL

Your Supabase callback URL is:
```
https://lekyfdszxebftrnpwwhm.supabase.co/auth/v1/callback
```

To verify this is correct:
1. Go to Supabase Dashboard → Your Project
2. Click **Settings** (gear icon)
3. Click **API**
4. Your **Project URL** should be: `https://lekyfdszxebftrnpwwhm.supabase.co`
5. The callback URL is always: `{PROJECT_URL}/auth/v1/callback`

### Check 2: OAuth Consent Screen

1. In Google Cloud Console:
   - Go to **APIs & Services** → **OAuth consent screen**
   - Make sure it's configured:
     - **User Type:** External (for public apps) or Internal (for workspace)
     - **App name:** "Aldi Meal Planner" (or your app name)
     - **User support email:** Your email
     - **Developer contact:** Your email
   - If using External, make sure it's **Published** (not just "Testing")
   - For testing, "Testing" mode works but you need to add test users

### Check 3: Browser Console Errors

1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Try clicking Google sign-in button
4. Look for any error messages
5. Common errors:
   - `redirect_uri_mismatch` → Redirect URI not in Google Console
   - `access_denied` → OAuth consent screen issue
   - `invalid_client` → Client ID/Secret wrong in Supabase

### Check 4: Network Tab

1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Try clicking Google sign-in button
4. Look for failed requests (red)
5. Check the request URL and response

## ✅ Success Indicators

You'll know it's fixed when:
- ✅ Clicking Google button redirects to Google sign-in page (not error page)
- ✅ After signing in with Google, you're redirected back to your app
- ✅ You're automatically logged in
- ✅ No error messages in console

## 📝 Common Mistakes

❌ **Wrong:**
- `https://lekyfdszxebftrnpwwhm.supabase.co/auth/v1/callback/` (trailing slash)
- `https://LEKYFDSZXEBFTRNPWWHM.supabase.co/auth/v1/callback` (wrong case)
- `https://lekyfdszxebftrnpwwhm.supabase.co/auth/v1/callbacks` (wrong path)
- `http://lekyfdszxebftrnpwwhm.supabase.co/auth/v1/callback` (http instead of https)

✅ **Correct:**
- `https://lekyfdszxebftrnpwwhm.supabase.co/auth/v1/callback`

## 🔗 Quick Links

- **Google Cloud Console:** https://console.cloud.google.com/
- **Supabase Dashboard:** https://supabase.com/dashboard
- **Your Supabase Project:** https://supabase.com/dashboard/project/lekyfdszxebftrnpwwhm

---

**Last Updated:** 2025-01-XX
**Status:** Active Fix Guide

