-- ============================================
-- PANTRY FIRST FEATURE - DATABASE TABLES
-- Run this in Supabase SQL Editor
-- ============================================

-- Drop existing tables if they exist (for clean reinstall)
DROP TABLE IF EXISTS pantry_usage CASCADE;
DROP TABLE IF EXISTS grocery_lists CASCADE;
DROP TABLE IF EXISTS meal_plans CASCADE;
DROP TABLE IF EXISTS user_pantry CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;

-- ============================================
-- 1. USER PANTRY TABLE
-- Stores ingredients the user currently has at home
-- ============================================
CREATE TABLE user_pantry (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  ingredient_id TEXT NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity REAL NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL,
  added_date TIMESTAMP DEFAULT NOW(),
  use_by_date DATE, -- expiration tracking
  must_use BOOLEAN DEFAULT FALSE, -- "use this first" flag
  source TEXT, -- "leftover", "impulse buy", "meal prep", "manual_entry", etc.
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX idx_pantry_expiring ON user_pantry(use_by_date) 
WHERE must_use = TRUE;

CREATE INDEX idx_pantry_ingredient ON user_pantry(ingredient_id);

CREATE INDEX idx_pantry_active ON user_pantry(ingredient_id) 
WHERE quantity > 0;

COMMENT ON TABLE user_pantry IS 'Ingredients currently available in user pantry';

-- ============================================
-- 2. MEAL PLANS TABLE
-- Weekly meal planning calendar
-- ============================================
CREATE TABLE meal_plans (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  week_start_date DATE NOT NULL,
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 1=Monday, etc.
  meal_type TEXT DEFAULT 'dinner',
  recipe_id TEXT REFERENCES recipes(id) ON DELETE SET NULL,
  notes TEXT, -- free-text for breakfast/lunch
  is_leftover_night BOOLEAN DEFAULT FALSE,
  is_order_out_night BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'planned', -- planned, shopped, cooked, skipped
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(week_start_date, day_of_week, meal_type)
);

-- Indexes
CREATE INDEX idx_meal_plans_week ON meal_plans(week_start_date);
CREATE INDEX idx_meal_plans_recipe ON meal_plans(recipe_id);

COMMENT ON TABLE meal_plans IS 'Weekly meal planning calendar';

-- ============================================
-- 3. GROCERY LISTS TABLE
-- Generated shopping lists
-- ============================================
CREATE TABLE grocery_lists (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  week_start_date DATE NOT NULL,
  ingredient_id TEXT REFERENCES ingredients(id),
  quantity_needed REAL NOT NULL CHECK (quantity_needed > 0),
  unit TEXT NOT NULL,
  packages_to_buy INTEGER, -- rounded up from quantity needed
  estimated_cost REAL,
  is_purchased BOOLEAN DEFAULT FALSE,
  category TEXT, -- denormalized for grouping (Produce, Meat, Dairy, etc.)
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(week_start_date, ingredient_id)
);

-- Indexes
CREATE INDEX idx_grocery_lists_week ON grocery_lists(week_start_date);
CREATE INDEX idx_grocery_lists_category ON grocery_lists(category);

COMMENT ON TABLE grocery_lists IS 'Generated shopping lists for weekly meal plans';

-- ============================================
-- 4. PANTRY USAGE TRACKING (Optional but Valuable)
-- Track when pantry items are used in recipes
-- ============================================
CREATE TABLE pantry_usage (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  pantry_item_id TEXT NOT NULL REFERENCES user_pantry(id) ON DELETE CASCADE,
  recipe_id TEXT REFERENCES recipes(id),
  meal_plan_id TEXT REFERENCES meal_plans(id),
  quantity_used REAL NOT NULL,
  unit TEXT,
  used_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_pantry_usage_date ON pantry_usage(used_date);
CREATE INDEX idx_pantry_usage_pantry ON pantry_usage(pantry_item_id);

COMMENT ON TABLE pantry_usage IS 'Track when pantry items are consumed in recipes';

-- ============================================
-- 5. USER PREFERENCES
-- Stores scheduling preferences for automation
-- ============================================
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,
  meal_plan_day INTEGER CHECK (meal_plan_day BETWEEN 0 AND 6),
  grocery_day INTEGER CHECK (grocery_day BETWEEN 0 AND 6),
  timezone TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE user_preferences IS 'Schedule settings (meal plan day, grocery day, onboarding state)';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
-- You should see "Success. No rows returned" if everything worked!
