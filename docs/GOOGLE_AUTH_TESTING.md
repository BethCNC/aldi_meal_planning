# Google Authentication Testing Guide

## ✅ Implementation Complete

Google sign in/sign up buttons have been added to both the sign in and sign up pages.

## 🔧 Supabase Configuration Required

Before testing, ensure Google OAuth is configured in your Supabase project:

### Step 1: Enable Google Provider in Supabase

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Authentication** → **Providers** in the sidebar
4. Find **Google** in the list
5. Click **Enable Google**
6. You'll need to configure:
   - **Client ID** (from Google Cloud Console)
   - **Client Secret** (from Google Cloud Console)

### Step 2: Get Google OAuth Credentials

If you don't have Google OAuth credentials yet:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Configure OAuth consent screen (if not done):
   - User Type: External (for testing) or Internal (for workspace)
   - App name: "Aldi Meal Planner"
   - User support email: Your email
   - Developer contact: Your email
6. Create OAuth client:
   - Application type: **Web application**
   - Name: "Aldi Meal Planner Web"
   - **Authorized redirect URIs** (CRITICAL - must match exactly):
     - `https://lekyfdszxebftrnpwwhm.supabase.co/auth/v1/callback`
     - ⚠️ **IMPORTANT**: Copy this EXACT URL from your Supabase project
     - ⚠️ **NO trailing slashes, NO variations**
7. Copy the **Client ID** and **Client Secret**

### ⚠️ Fixing "redirect_uri_mismatch" Error

If you see "Error 400: redirect_uri_mismatch":

1. **Get your exact callback URL from Supabase:**
   - Go to Supabase Dashboard → Your Project
   - Navigate to **Authentication** → **URL Configuration**
   - Copy the **Site URL** and **Redirect URLs**
   - Your callback URL should be: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`

2. **Update Google Cloud Console:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to **APIs & Services** → **Credentials**
   - Click on your OAuth 2.0 Client ID
   - Under **Authorized redirect URIs**, add:
     - `https://lekyfdszxebftrnpwwhm.supabase.co/auth/v1/callback`
   - ⚠️ **Must match EXACTLY** - no trailing slashes, exact case
   - Click **Save**

3. **Wait a few minutes** for changes to propagate

4. **Try again** - the redirect should work now

### Step 3: Configure in Supabase

1. In Supabase Dashboard → Authentication → Providers → Google
2. Paste your **Client ID** and **Client Secret**
3. Click **Save**
4. The redirect URL should already be configured automatically

## 🧪 Testing the Google Authentication

### Test 1: Sign In with Google

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to the sign in page (usually `/auth` or `/login`)

3. You should see:
   - Email/password form
   - "or" divider
   - **"Sign in with Google"** button with Google icon

4. Click the **"Sign in with Google"** button

5. Expected behavior:
   - Button shows "Connecting..." state
   - Browser redirects to Google sign in page
   - After signing in, redirects back to your app
   - User is logged in

### Test 2: Sign Up with Google

1. On the sign in page, click "Don't have an account? Sign up"

2. You should see:
   - Sign up form
   - **"Sign up with Google"** button

3. Click the **"Sign up with Google"** button

4. Expected behavior:
   - Same flow as sign in
   - If account doesn't exist, Google creates it
   - User is logged in and redirected

### Test 3: Error Handling

1. Test with invalid/disabled Google provider:
   - Temporarily disable Google in Supabase
   - Try clicking the button
   - Should show error message

2. Test loading states:
   - Button should be disabled while connecting
   - Should show "Connecting..." text
   - Other form inputs should be disabled

## 🐛 Troubleshooting

### Issue: "Failed to sign in with Google"

**Possible causes:**
- Google OAuth not configured in Supabase
- Invalid Client ID or Client Secret
- Redirect URI mismatch
- Google Cloud Console project not configured correctly

**Solutions:**
1. Verify Google provider is enabled in Supabase
2. Check Client ID and Secret are correct
3. Verify redirect URI matches exactly (no trailing slashes)
4. Check Google Cloud Console → OAuth consent screen is published

### Issue: Redirect loop or wrong redirect URL

**Solution:**
- Check Supabase → Authentication → URL Configuration
- Ensure Site URL matches your app URL
- Ensure Redirect URLs includes your callback URL

### Issue: Button not showing

**Check:**
- Browser console for errors
- Network tab for failed requests
- Verify the component is rendering correctly

## 📝 Code Implementation Details

### Components Used

- **Button Component**: Uses `outline` variant with `leading` icon position
- **Google Icon**: Custom SVG component matching Google's brand colors
- **Divider**: Visual separator between email/password and Google auth

### State Management

- `googleLoading`: Tracks Google OAuth loading state
- `loading`: Tracks email/password form loading state
- Both buttons are disabled when either is loading

### OAuth Flow

1. User clicks "Sign in/up with Google"
2. `handleGoogleSignIn()` is called
3. Supabase `signInWithOAuth()` redirects to Google
4. User authenticates with Google
5. Google redirects back to Supabase callback
6. Supabase redirects to app (configured in `redirectTo`)
7. User is automatically logged in

## 🎨 Design Notes

- Google button uses `outline` variant to differentiate from primary action
- Google icon is positioned on the left (leading)
- Button text changes based on sign in/sign up mode
- Matches design system tokens for spacing and typography

## ✅ Success Criteria

You'll know it's working when:

- [ ] Google button appears on both sign in and sign up pages
- [ ] Clicking button redirects to Google sign in
- [ ] After Google auth, user is redirected back to app
- [ ] User is logged in and can access protected routes
- [ ] Error messages display if something goes wrong
- [ ] Loading states work correctly

---

**Last Updated:** 2025-01-XX
**Status:** Ready for Testing

