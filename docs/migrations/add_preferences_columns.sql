-- ============================================
-- ALDI MEAL PLANNER - PREFERENCES UPDATE
-- Run this in Supabase SQL Editor
-- ============================================

-- Add detailed preference columns to user_preferences
ALTER TABLE user_preferences 
  ADD COLUMN IF NOT EXISTS dietary_tags TEXT[], -- e.g. ['keto', 'vegan', 'gluten-free']
  ADD COLUMN IF NOT EXISTS liked_ingredients TEXT[], -- e.g. ['salmon', 'avocado']
  ADD COLUMN IF NOT EXISTS disliked_ingredients TEXT[], -- e.g. ['mushrooms', 'cilantro']
  ADD COLUMN IF NOT EXISTS calorie_goal INTEGER,
  ADD COLUMN IF NOT EXISTS macro_goals JSONB; -- e.g. { "protein": "high", "carbs": "low" }

COMMENT ON COLUMN user_preferences.dietary_tags IS 'Array of active dietary restrictions/tags';
COMMENT ON COLUMN user_preferences.liked_ingredients IS 'Ingredients the user prefers (score boost)';
COMMENT ON COLUMN user_preferences.disliked_ingredients IS 'Ingredients the user avoids (filter out)';

