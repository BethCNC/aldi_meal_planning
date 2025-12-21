
-- ============================================
-- MIGRATION: 004_migrate_to_tdd_schema (TDD Alignment)
-- ============================================

-- Recipes: Add qualitative fields
ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS protein_category TEXT CHECK (protein_category IN ('poultry', 'beef', 'pork', 'vegetarian', 'fish')),
ADD COLUMN IF NOT EXISTS texture_profile TEXT,
ADD COLUMN IF NOT EXISTS prep_effort_level TEXT CHECK (prep_effort_level IN ('low', 'medium', 'high')),
ADD COLUMN IF NOT EXISTS description TEXT;

-- Ingredients: Add integer pricing
ALTER TABLE ingredients
ADD COLUMN IF NOT EXISTS aldi_price_cents INTEGER,
ADD COLUMN IF NOT EXISTS unit_size TEXT;

-- User History: Track consumption
CREATE TABLE IF NOT EXISTS user_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    recipe_id TEXT REFERENCES recipes(id) ON DELETE CASCADE,
    last_eaten_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
