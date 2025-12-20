-- ============================================
-- ALDI MEAL PLANNER - PRD FEATURES MIGRATION
-- Run this in Supabase SQL Editor
-- Adds support for:
-- 1. Recipe Verification & Moderation
-- 2. User Ratings & Feedback
-- 3. Recipe History (Repeat Avoidance)
-- 4. Moderation Queue
-- ============================================

-- 1. Add columns to recipes table
-- ============================================
ALTER TABLE recipes 
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'pending'; -- 'pending', 'approved', 'rejected', 'needs_edit'

COMMENT ON COLUMN recipes.is_verified IS 'True if recipe has been reviewed by a human';
COMMENT ON COLUMN recipes.is_ai_generated IS 'True if recipe was created by AI';
COMMENT ON COLUMN recipes.moderation_status IS 'Current status in the moderation workflow';

-- 2. Create user_ratings table
-- ============================================
CREATE TABLE IF NOT EXISTS user_ratings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL, -- Links to auth.users (or separate user profile)
  recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  meal_plan_id TEXT REFERENCES meal_plans(id),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, recipe_id, meal_plan_id)
);

CREATE INDEX IF NOT EXISTS idx_user_ratings_recipe ON user_ratings(recipe_id);
CREATE INDEX IF NOT EXISTS idx_user_ratings_user ON user_ratings(user_id);

COMMENT ON TABLE user_ratings IS 'User ratings and feedback for recipes';

-- 3. Create recipe_history table (for 4-week repeat avoidance)
-- ============================================
CREATE TABLE IF NOT EXISTS recipe_history (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  meal_plan_id TEXT REFERENCES meal_plans(id),
  week_start_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recipe_history_user_date ON recipe_history(user_id, week_start_date);
CREATE INDEX IF NOT EXISTS idx_recipe_history_recipe ON recipe_history(recipe_id);

COMMENT ON TABLE recipe_history IS 'Tracks when recipes were used to prevent recent repeats';

-- 4. Create moderation_queue table
-- ============================================
CREATE TABLE IF NOT EXISTS moderation_queue (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  source TEXT, -- 'scraped', 'ai_generated', 'user_submission'
  source_url TEXT,
  submitted_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  reviewed_by TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'needs_edit'
  admin_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_moderation_queue_status ON moderation_queue(status);

COMMENT ON TABLE moderation_queue IS 'Queue for reviewing new recipes before publishing';

-- ============================================
-- 5. RLS POLICIES (Optional but Recommended)
-- Uncomment and run if RLS is enabled
-- ============================================

-- Enable RLS
-- ALTER TABLE user_ratings ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE recipe_history ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE moderation_queue ENABLE ROW LEVEL SECURITY;

-- Policies for user_ratings
-- CREATE POLICY "Users can manage their own ratings" ON user_ratings
--   USING (auth.uid()::text = user_id)
--   WITH CHECK (auth.uid()::text = user_id);

-- Policies for recipe_history
-- CREATE POLICY "Users can view their own history" ON recipe_history
--   USING (auth.uid()::text = user_id);

-- Policies for moderation_queue
-- CREATE POLICY "Admins can manage moderation queue" ON moderation_queue
--   USING (auth.jwt() ->> 'role' = 'service_role' OR auth.uid() IN (SELECT id FROM admins));

