-- ============================================
-- MIGRATION: Fix meal_plans unique constraint
-- Run this in Supabase SQL Editor
-- ============================================
-- This fixes the unique constraint to include user_id
-- so multiple users can have meal plans for the same week/day

-- Drop the old unique constraint (if it exists)
ALTER TABLE meal_plans 
DROP CONSTRAINT IF EXISTS meal_plans_week_start_date_day_of_week_meal_type_key;

-- Add new unique constraint that includes user_id
ALTER TABLE meal_plans 
ADD CONSTRAINT meal_plans_user_week_day_meal_unique 
UNIQUE (user_id, week_start_date, day_of_week, meal_type);

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
-- You should see "Success. No rows returned" if everything worked!
-- 
-- This allows multiple users to have meal plans for the same week
-- while still preventing duplicate entries for the same user.

