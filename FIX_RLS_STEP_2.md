# Fix RLS Error - Step 2

## The Problem

After running the first migration, you're still getting RLS errors. This is likely because:

1. **The unique constraint doesn't include `user_id`** - The table has a unique constraint on `(week_start_date, day_of_week, meal_type)` but it should include `user_id` to allow multiple users to have plans for the same week.

2. **The upsert conflict resolution is wrong** - The code tries to upsert using the old constraint columns.

## Solution

### Step 1: Fix the Unique Constraint

Run this SQL in Supabase SQL Editor:

```sql
-- Drop the old unique constraint (if it exists)
ALTER TABLE meal_plans 
DROP CONSTRAINT IF EXISTS meal_plans_week_start_date_day_of_week_meal_type_key;

-- Add new unique constraint that includes user_id
ALTER TABLE meal_plans 
ADD CONSTRAINT meal_plans_user_week_day_meal_unique 
UNIQUE (user_id, week_start_date, day_of_week, meal_type);
```

**OR** use the migration file: `docs/migrations/002_fix_meal_plans_unique_constraint.sql`

### Step 2: Code Already Fixed

I've already updated the code to use the correct conflict resolution. The app should now work after you run Step 1.

### Step 3: Test Again

1. Refresh your browser (hard refresh: Cmd+Shift+R or Ctrl+Shift+R)
2. Try generating the meal plan again
3. It should work now!

## What This Fixes

- **Before**: Unique constraint was `(week_start_date, day_of_week, meal_type)` - only one user could have a plan for a given week/day
- **After**: Unique constraint is `(user_id, week_start_date, day_of_week, meal_type)` - each user can have their own plan

## Still Having Issues?

If you still get errors:

1. **Check the exact error message** in the browser console (F12)
2. **Verify the constraint was updated**:
   - Go to Supabase Dashboard > Table Editor > meal_plans
   - Check the constraints section
   - You should see `meal_plans_user_week_day_meal_unique`
3. **Check RLS policies**:
   - Go to Authentication > Policies
   - Verify "Users can insert own meal plans" policy exists and is enabled

