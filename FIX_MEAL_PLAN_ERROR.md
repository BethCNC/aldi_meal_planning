# Fix: Meal Plan RLS Error

## Problem
Error: `new row violates row-level security policy (USING expression) for table "meal_plans"`

## Cause
The `meal_plans` table is missing the `user_id` column and RLS policies needed for multi-user support.

## Solution

### Step 1: Run Migration in Supabase

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Run the Migration**
   - Copy the entire contents of `docs/migrations/001_add_user_isolation.sql`
   - Paste into the SQL Editor
   - Click "Run" (or press Cmd/Ctrl + Enter)

4. **Verify Success**
   - You should see: "Success. No rows returned"
   - If you see errors, check the error message

### Step 2: Verify the Fix

1. **Check Table Structure**
   - Go to Table Editor > `meal_plans`
   - Verify you see a `user_id` column (UUID type)

2. **Check RLS Policies**
   - Go to Authentication > Policies
   - Look for `meal_plans` table
   - You should see 4 policies:
     - "Users can view own meal plans"
     - "Users can insert own meal plans"
     - "Users can update own meal plans"
     - "Users can delete own meal plans"

### Step 3: Test Again

1. **Refresh the app** (or log out and back in)
2. **Try generating meal plan again**
3. It should work now!

## What the Migration Does

- Adds `user_id` column to `meal_plans`, `user_pantry`, `grocery_lists`, and `user_preferences`
- Enables Row-Level Security (RLS) on these tables
- Creates policies that allow users to only see/modify their own data
- Ensures `user_id` matches the authenticated user's ID (`auth.uid()`)

## Still Having Issues?

If you still get errors after running the migration:

1. **Check Authentication**
   - Make sure you're logged in
   - Check browser console for auth errors

2. **Verify User ID**
   - The code should automatically set `user_id` from `auth.uid()`
   - If not, check `src/api/mealPlanGenerator.js` line 183

3. **Check RLS Policies**
   - In Supabase Dashboard > Authentication > Policies
   - Ensure policies exist and are enabled

