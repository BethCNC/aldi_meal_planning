# Google OAuth Production Fix - Quick Guide

## ✅ You've Already Done This
- Google Cloud Console callback URL: `https://lekyfdszxebftrnpwwhm.supabase.co/auth/v1/callback`

## 🔧 What You Need to Do Now

### Step 1: Add Production URL to Supabase

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `lekyfdszxebftrnpwwhm`
3. Navigate to **Authentication** → **URL Configuration**
4. In the **Redirect URLs** section, add your production URL:
   - `https://your-production-domain.com`
   - `https://your-production-domain.com/**`
   - Replace `your-production-domain.com` with your actual Coolify domain
5. Set **Site URL** to your production URL:
   - `https://your-production-domain.com`
6. Click **Save**

### Step 2: Verify Google Provider is Enabled

1. In Supabase Dashboard → **Authentication** → **Providers**
2. Find **Google** in the list
3. Make sure it's **Enabled** (toggle should be ON)
4. Verify **Client ID** and **Client Secret** are filled in

### Step 3: Test the Flow

1. Go to your production app
2. Click "Sign in with Google"
3. You should be redirected to Google sign-in
4. After signing in, you should be redirected back to your app
5. You should be logged in

## 🐛 Common Issues

### Issue: "redirect_uri_mismatch" Error

**Solution:**
- The callback URL in Google Cloud Console must match exactly:
  - `https://lekyfdszxebftrnpwwhm.supabase.co/auth/v1/callback`
- No trailing slash, exact case, exact path

### Issue: Redirects to Supabase but not back to app

**Solution:**
- Your production URL must be in Supabase's **Redirect URLs** list
- Check **Authentication** → **URL Configuration** in Supabase
- Add both:
  - `https://your-domain.com`
  - `https://your-domain.com/**`

### Issue: "Invalid redirect URL" in Supabase

**Solution:**
- Make sure the URL in the **Redirect URLs** list matches your production domain exactly
- Check for typos (http vs https, trailing slashes, etc.)
- Wait 1-2 minutes after saving for changes to propagate

## 📋 Quick Checklist

- [ ] Google Cloud Console has callback URL: `https://lekyfdszxebftrnpwwhm.supabase.co/auth/v1/callback`
- [ ] Supabase **Site URL** is set to your production domain
- [ ] Supabase **Redirect URLs** includes your production domain
- [ ] Google provider is enabled in Supabase
- [ ] Google OAuth Client ID and Secret are set in Supabase
- [ ] Environment variables are set in Coolify:
  - `VITE_SUPABASE_URL=https://lekyfdszxebftrnpwwhm.supabase.co`
  - `VITE_SUPABASE_ANON_KEY=your-anon-key`

## 🔗 Quick Links

- **Supabase Dashboard:** https://supabase.com/dashboard/project/lekyfdszxebftrnpwwhm
- **Authentication Settings:** https://supabase.com/dashboard/project/lekyfdszxebftrnpwwhm/auth/url-configuration
- **Google Cloud Console:** https://console.cloud.google.com/

---

**Last Updated:** 2025-01-XX
**Status:** Production OAuth Fix Guide

