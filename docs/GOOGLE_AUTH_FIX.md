# Fix: Google OAuth redirect_uri_mismatch Error

## 🐛 The Problem

You're seeing: **"Error 400: redirect_uri_mismatch"**

This means the redirect URI in Google Cloud Console doesn't match what Supabase is sending.

## ✅ Your Supabase Callback URL

Based on your project, your callback URL is:
```
https://lekyfdszxebftrnpwwhm.supabase.co/auth/v1/callback
```

## 🔧 Quick Fix (5 minutes)

### Step 1: Update Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** → **Credentials**
4. Find your OAuth 2.0 Client ID (the one you're using for Supabase)
5. Click on it to edit

### Step 2: Add the Redirect URI

In the **Authorized redirect URIs** section:

1. Click **+ ADD URI**
2. Paste this EXACT URL (no variations):
   ```
   https://lekyfdszxebftrnpwwhm.supabase.co/auth/v1/callback
   ```
3. ⚠️ **Important checks:**
   - ✅ No trailing slash
   - ✅ Exact case (lowercase)
   - ✅ Exact path (`/auth/v1/callback`)
   - ✅ Exact domain (`lekyfdszxebftrnpwwhm.supabase.co`)

4. Click **Save**

### Step 3: Verify Supabase Configuration

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** → **URL Configuration**
4. Verify:
   - **Site URL**: Should be your app URL (e.g., `http://localhost:5173` for dev)
   - **Redirect URLs**: Should include your app URL

### Step 4: Test Again

1. Wait 1-2 minutes for Google changes to propagate
2. Go back to your app
3. Click "Sign in with Google" or "Sign up with Google"
4. Should now redirect properly!

## 🔍 Troubleshooting

### Still not working?

1. **Check for typos:**
   - Compare the URL in Google Console with the one above
   - Make sure there are no extra spaces or characters

2. **Check multiple redirect URIs:**
   - If you have multiple URIs listed, make sure the Supabase one is there
   - You can have multiple URIs, just make sure this one is included

3. **Verify OAuth consent screen:**
   - Go to **APIs & Services** → **OAuth consent screen**
   - Make sure it's published (if using External user type)
   - For testing, you can use "Testing" mode

4. **Check Supabase redirect URL:**
   - In Supabase → Authentication → URL Configuration
   - Make sure your app's URL is in the Redirect URLs list
   - For local dev: `http://localhost:5173` (or your dev port)

5. **Clear browser cache:**
   - Sometimes cached OAuth errors persist
   - Try incognito/private window

## 📝 Common Mistakes

❌ **Wrong:**
- `https://lekyfdszxebftrnpwwhm.supabase.co/auth/v1/callback/` (trailing slash)
- `https://LEKYFDSZXEBFTRNPWWHM.supabase.co/auth/v1/callback` (wrong case)
- `https://lekyfdszxebftrnpwwhm.supabase.co/auth/v1/callbacks` (wrong path)

✅ **Correct:**
- `https://lekyfdszxebftrnpwwhm.supabase.co/auth/v1/callback`

## 🎯 Success Indicators

You'll know it's fixed when:
- ✅ Clicking Google button redirects to Google sign-in (not error page)
- ✅ After Google auth, you're redirected back to your app
- ✅ You're logged in successfully

---

**Last Updated:** 2025-01-XX
**Status:** Quick Fix Guide

