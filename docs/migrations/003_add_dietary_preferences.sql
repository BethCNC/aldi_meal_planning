-- ============================================
-- MIGRATION: Add Dietary Preferences
-- Run this in Supabase SQL Editor
-- ============================================
-- Adds dietary_restrictions column to user_preferences table

-- Add dietary_restrictions column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_preferences' AND column_name = 'dietary_restrictions'
  ) THEN
    ALTER TABLE user_preferences 
    ADD COLUMN dietary_restrictions JSONB;
    
    COMMENT ON COLUMN user_preferences.dietary_restrictions IS 'User dietary preferences and restrictions (e.g., chicken_breast_only, no_dark_meat_chicken)';
  END IF;
END $$;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
-- You should see "Success. No rows returned" if everything worked!
-- 
-- This allows users to set dietary preferences like:
-- - chicken_breast_only: true
-- - no_dark_meat_chicken: true
-- 
-- The meal plan generator will automatically filter out recipes with dark meat chicken
-- when this preference is enabled.

