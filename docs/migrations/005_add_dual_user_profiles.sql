-- ============================================
-- MIGRATION: 005_add_dual_user_profiles
-- Description: Adds dual user profile support for shared household meal planning
-- with conflicting medical dietary requirements (MCAS/POTS/hEDS vs Heart Health)
-- ============================================

-- 1. ADD DUAL USER PROFILE COLUMNS TO user_preferences
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS user_profile_type TEXT CHECK (user_profile_type IN ('user_a', 'user_b', 'household')),
  ADD COLUMN IF NOT EXISTS medical_conditions TEXT[],
  ADD COLUMN IF NOT EXISTS sodium_requirement TEXT CHECK (sodium_requirement IN ('high', 'low')),
  ADD COLUMN IF NOT EXISTS histamine_sensitive BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS texture_preferences JSONB,
  ADD COLUMN IF NOT EXISTS meal_frequency INTEGER,
  ADD COLUMN IF NOT EXISTS calorie_target_min INTEGER,
  ADD COLUMN IF NOT EXISTS calorie_target_max INTEGER,
  ADD COLUMN IF NOT EXISTS safe_ingredients TEXT[],
  ADD COLUMN IF NOT EXISTS avoid_ingredients TEXT[],
  ADD COLUMN IF NOT EXISTS seafood_preferences JSONB;

-- Update macro_goals if it doesn't exist (from previous migration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_preferences' AND column_name = 'macro_goals'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN macro_goals JSONB;
  END IF;
END $$;

COMMENT ON COLUMN user_preferences.user_profile_type IS 'Profile type: user_a (MCAS/POTS/hEDS), user_b (Heart Health), or household (shared)';
COMMENT ON COLUMN user_preferences.medical_conditions IS 'Array of medical conditions: MCAS, POTS, hEDS, or heart_health';
COMMENT ON COLUMN user_preferences.sodium_requirement IS 'High (3000mg+) for User A, Low (<2000mg) for User B';
COMMENT ON COLUMN user_preferences.histamine_sensitive IS 'True if user has MCAS/histamine sensitivity';
COMMENT ON COLUMN user_preferences.texture_preferences IS 'JSON object with texture aversions: {no_cooked_eggs, no_oatmeal, no_granola, onion_preference}';
COMMENT ON COLUMN user_preferences.meal_frequency IS 'Number of meals per day: 5-6 for User A, 3-4 for User B';
COMMENT ON COLUMN user_preferences.calorie_target_min IS 'Minimum daily calorie target';
COMMENT ON COLUMN user_preferences.calorie_target_max IS 'Maximum daily calorie target';
COMMENT ON COLUMN user_preferences.safe_ingredients IS 'Whitelist of ingredients safe for this user profile';
COMMENT ON COLUMN user_preferences.avoid_ingredients IS 'Blacklist of trigger ingredients to avoid';
COMMENT ON COLUMN user_preferences.seafood_preferences IS 'JSON object: {user_a_loves_fish, user_b_dislikes_fishy_fish, acceptable_fish: [tilapia, cod, shrimp]}';

-- 2. CREATE household_profiles TABLE
CREATE TABLE IF NOT EXISTS household_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_a_profile_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_b_profile_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    shared_budget DECIMAL(10, 2) DEFAULT 150.00,
    meal_plan_cycle_days INTEGER DEFAULT 8,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_household_profiles_user ON household_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_household_profiles_user_a ON household_profiles(user_a_profile_id);
CREATE INDEX IF NOT EXISTS idx_household_profiles_user_b ON household_profiles(user_b_profile_id);

COMMENT ON TABLE household_profiles IS 'Links two user profiles together for shared household meal planning';
COMMENT ON COLUMN household_profiles.user_id IS 'Primary user account that manages the household';
COMMENT ON COLUMN household_profiles.user_a_profile_id IS 'User A profile (MCAS/POTS/hEDS) - can be same as user_id or different';
COMMENT ON COLUMN household_profiles.user_b_profile_id IS 'User B profile (Heart Health) - can be same as user_id or different';
COMMENT ON COLUMN household_profiles.shared_budget IS 'Shared weekly budget (default $150 for 8-day cycle)';
COMMENT ON COLUMN household_profiles.meal_plan_cycle_days IS 'Number of days in meal plan cycle (default 8)';

-- 3. ENABLE ROW LEVEL SECURITY
ALTER TABLE household_profiles ENABLE ROW LEVEL SECURITY;

-- 4. CREATE RLS POLICIES FOR household_profiles
DROP POLICY IF EXISTS "Users can view own household profile" ON household_profiles;
CREATE POLICY "Users can view own household profile"
  ON household_profiles FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = user_a_profile_id OR auth.uid() = user_b_profile_id);

DROP POLICY IF EXISTS "Users can insert own household profile" ON household_profiles;
CREATE POLICY "Users can insert own household profile"
  ON household_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own household profile" ON household_profiles;
CREATE POLICY "Users can update own household profile"
  ON household_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own household profile" ON household_profiles;
CREATE POLICY "Users can delete own household profile"
  ON household_profiles FOR DELETE
  USING (auth.uid() = user_id);
