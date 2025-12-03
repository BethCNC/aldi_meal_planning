-- Create user recipe preferences table for tracking likes/dislikes
-- This allows users to blacklist recipes they don't like

CREATE TABLE IF NOT EXISTS user_recipe_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  preference TEXT NOT NULL CHECK (preference IN ('like', 'dislike', 'neutral')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, recipe_id)
);

-- Index for fast lookups
CREATE INDEX idx_user_recipe_prefs_user_id ON user_recipe_preferences(user_id);
CREATE INDEX idx_user_recipe_prefs_recipe_id ON user_recipe_preferences(recipe_id);
CREATE INDEX idx_user_recipe_prefs_preference ON user_recipe_preferences(preference);

-- RLS Policies
ALTER TABLE user_recipe_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only see their own preferences
CREATE POLICY "Users can view own recipe preferences"
  ON user_recipe_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert own recipe preferences"
  ON user_recipe_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update own recipe preferences"
  ON user_recipe_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own preferences
CREATE POLICY "Users can delete own recipe preferences"
  ON user_recipe_preferences
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_recipe_preference_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_recipe_preference_updated_at_trigger
  BEFORE UPDATE ON user_recipe_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_recipe_preference_updated_at();

-- Add comments
COMMENT ON TABLE user_recipe_preferences IS 'Tracks user preferences for recipes (like, dislike, neutral)';
COMMENT ON COLUMN user_recipe_preferences.preference IS 'User preference: like, dislike, or neutral';
COMMENT ON COLUMN user_recipe_preferences.notes IS 'Optional notes about why user dislikes/likes recipe';
