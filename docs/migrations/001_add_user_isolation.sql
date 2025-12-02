-- ============================================
-- MIGRATION: Add User Isolation (Phase 1)
-- Run this in Supabase SQL Editor
-- ============================================
-- This migration adds user_id columns and Row Level Security (RLS)
-- to enable multi-user support.

-- ============================================
-- 1. Add user_id columns to user-specific tables
-- ============================================

-- Add user_id to meal_plans (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'meal_plans' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE meal_plans ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    CREATE INDEX idx_meal_plans_user ON meal_plans(user_id);
  END IF;
END $$;

-- Add user_id to user_pantry (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_pantry' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE user_pantry ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    CREATE INDEX idx_user_pantry_user ON user_pantry(user_id);
  END IF;
END $$;

-- Add user_id to grocery_lists (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'grocery_lists' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE grocery_lists ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    CREATE INDEX idx_grocery_lists_user ON grocery_lists(user_id);
  END IF;
END $$;

-- Add user_id to recipes (optional - for user-created recipes)
-- Note: Public recipes (from catalog) will have NULL user_id
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'recipes' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE recipes ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    CREATE INDEX idx_recipes_user ON recipes(user_id);
  END IF;
END $$;

-- Update user_preferences to use UUID instead of TEXT for user_id
-- (if it's currently TEXT, migrate existing 'default' users)
DO $$ 
BEGIN
  -- Check if user_id is TEXT and needs migration
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_preferences' 
    AND column_name = 'user_id' 
    AND data_type = 'text'
  ) THEN
    -- Migrate existing 'default' user data to a system user or delete
    -- For now, we'll delete old default entries (users will re-onboard)
    DELETE FROM user_preferences WHERE user_id = 'default';
    
    -- Alter column type
    ALTER TABLE user_preferences 
    DROP CONSTRAINT IF EXISTS user_preferences_user_id_key;
    
    ALTER TABLE user_preferences 
    ALTER COLUMN user_id TYPE UUID USING NULL;
    
    ALTER TABLE user_preferences 
    ALTER COLUMN user_id SET NOT NULL;
    
    ALTER TABLE user_preferences 
    ADD CONSTRAINT user_preferences_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    
    ALTER TABLE user_preferences 
    ADD CONSTRAINT user_preferences_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- ============================================
-- 2. Enable Row Level Security (RLS)
-- ============================================

ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_pantry ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
-- Recipes: Only enable RLS for user-created recipes (user_id IS NOT NULL)
-- Public recipes (user_id IS NULL) remain accessible to all

-- ============================================
-- 3. Create RLS Policies
-- ============================================

-- MEAL PLANS: Users can only see/modify their own meal plans
DROP POLICY IF EXISTS "Users can view own meal plans" ON meal_plans;
CREATE POLICY "Users can view own meal plans"
  ON meal_plans FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own meal plans" ON meal_plans;
CREATE POLICY "Users can insert own meal plans"
  ON meal_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own meal plans" ON meal_plans;
CREATE POLICY "Users can update own meal plans"
  ON meal_plans FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own meal plans" ON meal_plans;
CREATE POLICY "Users can delete own meal plans"
  ON meal_plans FOR DELETE
  USING (auth.uid() = user_id);

-- USER PANTRY: Users can only see/modify their own pantry
DROP POLICY IF EXISTS "Users can view own pantry" ON user_pantry;
CREATE POLICY "Users can view own pantry"
  ON user_pantry FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own pantry items" ON user_pantry;
CREATE POLICY "Users can insert own pantry items"
  ON user_pantry FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own pantry items" ON user_pantry;
CREATE POLICY "Users can update own pantry items"
  ON user_pantry FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own pantry items" ON user_pantry;
CREATE POLICY "Users can delete own pantry items"
  ON user_pantry FOR DELETE
  USING (auth.uid() = user_id);

-- GROCERY LISTS: Users can only see/modify their own lists
DROP POLICY IF EXISTS "Users can view own grocery lists" ON grocery_lists;
CREATE POLICY "Users can view own grocery lists"
  ON grocery_lists FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own grocery lists" ON grocery_lists;
CREATE POLICY "Users can insert own grocery lists"
  ON grocery_lists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own grocery lists" ON grocery_lists;
CREATE POLICY "Users can update own grocery lists"
  ON grocery_lists FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own grocery lists" ON grocery_lists;
CREATE POLICY "Users can delete own grocery lists"
  ON grocery_lists FOR DELETE
  USING (auth.uid() = user_id);

-- USER PREFERENCES: Users can only see/modify their own preferences
DROP POLICY IF EXISTS "Users can view own preferences" ON user_preferences;
CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own preferences" ON user_preferences;
CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;
CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own preferences" ON user_preferences;
CREATE POLICY "Users can delete own preferences"
  ON user_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- RECIPES: Public recipes (user_id IS NULL) are readable by all
-- User-created recipes (user_id IS NOT NULL) are private to the creator
DROP POLICY IF EXISTS "Anyone can view public recipes" ON recipes;
CREATE POLICY "Anyone can view public recipes"
  ON recipes FOR SELECT
  USING (user_id IS NULL OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own recipes" ON recipes;
CREATE POLICY "Users can insert own recipes"
  ON recipes FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can update own recipes" ON recipes;
CREATE POLICY "Users can update own recipes"
  ON recipes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own recipes" ON recipes;
CREATE POLICY "Users can delete own recipes"
  ON recipes FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 4. Public tables (no RLS needed)
-- ============================================
-- ingredients: Public read-only catalog (no user_id column)
-- recipe_ingredients: Public (links public recipes to ingredients)
-- units, unit_conversions: Public reference data

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
-- You should see "Success. No rows returned" if everything worked!
-- 
-- Next steps:
-- 1. Enable Email/Password auth in Supabase Dashboard > Authentication > Providers
-- 2. Test login/signup in the app
-- 3. Verify RLS policies work by checking data isolation between users

