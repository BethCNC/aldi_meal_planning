-- ============================================
-- MIGRATION: 004_migrate_to_tdd_schema
-- Description: Updates schema to match Technical Design Document (TDD)
-- Adds fields for sensory profiles, integer pricing, and user history.
-- ============================================

-- 1. UPDATE RECIPES TABLE
-- Add qualitative fields for AI decision making
ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS protein_category TEXT CHECK (protein_category IN ('poultry', 'beef', 'pork', 'vegetarian', 'fish')),
ADD COLUMN IF NOT EXISTS texture_profile TEXT, -- e.g., 'crunchy', 'soft', 'chewy'
ADD COLUMN IF NOT EXISTS prep_effort_level TEXT CHECK (prep_effort_level IN ('low', 'medium', 'high')),
ADD COLUMN IF NOT EXISTS description TEXT;

CREATE INDEX IF NOT EXISTS idx_recipes_protein ON recipes(protein_category);
CREATE INDEX IF NOT EXISTS idx_recipes_texture ON recipes(texture_profile);
CREATE INDEX IF NOT EXISTS idx_recipes_effort ON recipes(prep_effort_level);

COMMENT ON COLUMN recipes.protein_category IS 'Main protein source for variety rules';
COMMENT ON COLUMN recipes.texture_profile IS 'Texture characteristics for sensory-friendly planning';
COMMENT ON COLUMN recipes.prep_effort_level IS 'Estimated effort required to prepare';

-- 2. UPDATE INGREDIENTS TABLE
-- Add integer pricing to avoid floating point errors
ALTER TABLE ingredients
ADD COLUMN IF NOT EXISTS aldi_price_cents INTEGER,
ADD COLUMN IF NOT EXISTS unit_size TEXT;

COMMENT ON COLUMN ingredients.aldi_price_cents IS 'Price in cents to avoid floating point errors';
COMMENT ON COLUMN ingredients.unit_size IS 'Human readable size (e.g., "15oz can")';

-- 3. CREATE USER HISTORY TABLE
-- Tracks consumption to prevent burnout/repetition
CREATE TABLE IF NOT EXISTS user_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- Assumes linking to auth.users if using Supabase Auth
    recipe_id TEXT REFERENCES recipes(id) ON DELETE CASCADE,
    last_eaten_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_history_user_recipe ON user_history(user_id, recipe_id);
CREATE INDEX IF NOT EXISTS idx_user_history_date ON user_history(last_eaten_date);

COMMENT ON TABLE user_history IS 'Tracks when users last ate a recipe to enforce variety rules';

-- 4. DATA MIGRATION HELPER (Optional)
-- Attempt to populate aldi_price_cents from existing price_per_package
-- Only if price_per_package is not null
UPDATE ingredients
SET aldi_price_cents = CAST(price_per_package * 100 AS INTEGER)
WHERE aldi_price_cents IS NULL AND price_per_package IS NOT NULL;

