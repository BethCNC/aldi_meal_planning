# Supabase Database Schema (PostgreSQL)

## Copy this SQL into Supabase SQL Editor

Go to: **Supabase Dashboard > SQL Editor > New Query**

Paste this entire SQL script and click **Run**:

---

```sql
-- ============================================
-- ALDI MEAL PLANNING DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================

-- Drop existing tables (if any)
DROP TABLE IF EXISTS recipe_ingredients CASCADE;
DROP TABLE IF EXISTS recipes CASCADE;
DROP TABLE IF EXISTS ingredients CASCADE;
DROP TABLE IF EXISTS unit_conversions CASCADE;
DROP TABLE IF EXISTS units CASCADE;
DROP VIEW IF EXISTS recipe_cost_summary CASCADE;

-- ============================================
-- INGREDIENTS TABLE
-- ============================================
CREATE TABLE ingredients (
    id TEXT PRIMARY KEY,
    item TEXT NOT NULL,
    price_per_package REAL,
    package_size REAL,
    package_unit TEXT,
    base_unit TEXT NOT NULL,
    price_per_base_unit REAL NOT NULL,
    category TEXT,
    notes TEXT,
    notion_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ingredients_item ON ingredients(item);
CREATE INDEX idx_ingredients_category ON ingredients(category);

COMMENT ON TABLE ingredients IS 'All Aldi ingredients with pricing information';

-- ============================================
-- RECIPES TABLE
-- ============================================
CREATE TABLE recipes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    servings INTEGER,
    category TEXT,
    total_cost REAL,
    cost_per_serving REAL,
    instructions TEXT,
    source_url TEXT,
    image_url TEXT,
    tags TEXT,
    notion_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_recipes_name ON recipes(name);
CREATE INDEX idx_recipes_category ON recipes(category);
CREATE INDEX idx_recipes_cost ON recipes(cost_per_serving);

COMMENT ON TABLE recipes IS 'Recipe metadata and calculated costs';

-- ============================================
-- RECIPE INGREDIENTS TABLE (Junction Table)
-- ============================================
CREATE TABLE recipe_ingredients (
    id SERIAL PRIMARY KEY,
    recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    ingredient_id TEXT NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    quantity REAL NOT NULL,
    unit TEXT,
    ingredient_name TEXT NOT NULL,
    raw_line TEXT,
    calculated_cost REAL,
    matched_with_fuzzy BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(recipe_id, ingredient_id, raw_line)
);

CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_ingredient ON recipe_ingredients(ingredient_id);

COMMENT ON TABLE recipe_ingredients IS 'Links recipes to ingredients with quantities and calculated costs';

-- ============================================
-- UNITS TABLE
-- ============================================
CREATE TABLE units (
    id SERIAL PRIMARY KEY,
    unit TEXT NOT NULL UNIQUE,
    unit_type TEXT NOT NULL CHECK (unit_type IN ('weight', 'volume', 'count')),
    is_base_unit BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_units_type ON units(unit_type);

COMMENT ON TABLE units IS 'Unit types and definitions';

-- ============================================
-- UNIT CONVERSIONS TABLE
-- ============================================
CREATE TABLE unit_conversions (
    id SERIAL PRIMARY KEY,
    from_unit TEXT NOT NULL,
    to_unit TEXT NOT NULL,
    conversion_factor REAL NOT NULL,
    ingredient_type TEXT,
    notes TEXT
);

CREATE INDEX idx_conversions_from ON unit_conversions(from_unit);
CREATE INDEX idx_conversions_to ON unit_conversions(to_unit);

COMMENT ON TABLE unit_conversions IS 'Conversion factors between units';

-- ============================================
-- INSERT STANDARD UNITS
-- ============================================
INSERT INTO units (unit, unit_type, is_base_unit) VALUES
    ('lb', 'weight', TRUE),
    ('oz', 'weight', TRUE),
    ('g', 'weight', FALSE),
    ('kg', 'weight', FALSE),
    ('cup', 'volume', TRUE),
    ('fl oz', 'volume', TRUE),
    ('tbsp', 'volume', FALSE),
    ('tsp', 'volume', FALSE),
    ('each', 'count', TRUE),
    ('can', 'count', FALSE),
    ('packet', 'count', FALSE),
    ('pint', 'volume', FALSE),
    ('quart', 'volume', FALSE),
    ('ml', 'volume', FALSE),
    ('l', 'volume', FALSE);

-- ============================================
-- INSERT UNIT CONVERSIONS
-- ============================================
INSERT INTO unit_conversions (from_unit, to_unit, conversion_factor, ingredient_type, notes) VALUES
    -- Weight conversions
    ('lb', 'oz', 16.0, NULL, 'Standard weight conversion'),
    ('oz', 'lb', 0.0625, NULL, 'Standard weight conversion'),
    ('oz', 'g', 28.3495, NULL, 'Ounces to grams'),
    ('lb', 'g', 453.592, NULL, 'Pounds to grams'),
    
    -- Volume conversions
    ('cup', 'fl oz', 8.0, NULL, 'Standard volume conversion'),
    ('tbsp', 'tsp', 3.0, NULL, 'Tablespoons to teaspoons'),
    ('tsp', 'tbsp', 0.3333, NULL, 'Teaspoons to tablespoons'),
    ('pint', 'fl oz', 16.0, NULL, 'Pint to fluid ounces'),
    ('quart', 'fl oz', 32.0, NULL, 'Quart to fluid ounces'),
    ('cup', 'ml', 236.588, NULL, 'Cups to milliliters'),
    ('fl oz', 'ml', 29.5735, NULL, 'Fluid ounces to milliliters'),
    
    -- Cross-conversions (volume to weight for specific ingredients)
    ('cup', 'oz', 8.6, 'milk', 'Liquid volume to weight for milk'),
    ('cup', 'oz', 7.0, 'rice', 'Rice volume to weight'),
    ('cup', 'oz', 4.25, 'flour', 'Flour volume to weight'),
    ('cup', 'oz', 8.0, 'water', 'Water volume to weight');

-- ============================================
-- CREATE VIEW: RECIPE COST SUMMARY
-- ============================================
CREATE VIEW recipe_cost_summary AS
SELECT 
    r.id,
    r.name,
    r.servings,
    r.category,
    COALESCE(SUM(ri.calculated_cost), 0) AS total_cost,
    CASE 
        WHEN r.servings > 0 AND r.servings IS NOT NULL
        THEN COALESCE(SUM(ri.calculated_cost), 0) / r.servings 
        ELSE 0 
    END AS cost_per_serving,
    COUNT(ri.id) AS ingredient_count,
    SUM(CASE WHEN ri.matched_with_fuzzy = TRUE THEN 1 ELSE 0 END) AS fuzzy_matched_count
FROM recipes r
LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
GROUP BY r.id, r.name, r.servings, r.category;

COMMENT ON VIEW recipe_cost_summary IS 'Pre-calculated cost summary for each recipe';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
-- You should see "Success. No rows returned" if everything worked!

```

---

## After Running

1. ✅ You should see "Success. No rows returned"
2. ✅ Go to **Table Editor** in Supabase dashboard
3. ✅ You should see 5 tables: `ingredients`, `recipes`, `recipe_ingredients`, `units`, `unit_conversions`
4. ✅ Run: `node scripts/setup-supabase.js --check` to verify

---

## Next Steps

After the schema is created:
1. Run: `node scripts/migrate-to-supabase.js` to import data from Notion
2. Use the SQL queries in `docs/SQL_QUERIES.md` to calculate costs
