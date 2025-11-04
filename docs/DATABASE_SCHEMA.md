# Database Schema Design

## Complete Schema for Aldi Meal Planning

This schema is designed for SQLite but can easily be adapted to PostgreSQL.

---

## Table: `ingredients`

Stores all ingredient information from Notion.

```sql
CREATE TABLE ingredients (
    id TEXT PRIMARY KEY,                    -- Notion page ID
    item TEXT NOT NULL,                     -- Ingredient name
    price_per_package REAL,                 -- Price for full package
    package_size REAL,                      -- Size of package
    package_unit TEXT,                      -- Unit (lb, oz, each, etc.)
    base_unit TEXT NOT NULL,                -- Base unit for PPU
    price_per_base_unit REAL NOT NULL,      -- Price per base unit ($/lb, $/oz, etc.)
    category TEXT,                          -- Grocery category
    notes TEXT,                             -- Additional notes
    notion_url TEXT,                        -- Link back to Notion
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ingredients_item ON ingredients(item);
CREATE INDEX idx_ingredients_category ON ingredients(category);
```

**Example data:**
```sql
INSERT INTO ingredients VALUES (
    'notion-id-123',
    'ground beef',
    9.99,
    1.5,
    'lb',
    'lb',
    6.66,
    'Meat',
    NULL,
    'https://notion.so/...',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
```

---

## Table: `recipes`

Stores recipe metadata.

```sql
CREATE TABLE recipes (
    id TEXT PRIMARY KEY,                    -- Notion page ID
    name TEXT NOT NULL,                     -- Recipe name
    servings INTEGER,                       -- Number of servings
    category TEXT,                          -- Beef, Chicken, Vegetarian, etc.
    total_cost REAL,                        -- Calculated total cost
    cost_per_serving REAL,                  -- Calculated cost per serving
    instructions TEXT,                      -- Cooking instructions
    source_url TEXT,                        -- Original recipe URL
    tags TEXT,                              -- Comma-separated tags
    notion_url TEXT,                        -- Link back to Notion
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_recipes_name ON recipes(name);
CREATE INDEX idx_recipes_category ON recipes(category);
CREATE INDEX idx_recipes_cost ON recipes(cost_per_serving);
```

---

## Table: `recipe_ingredients`

Junction table linking recipes to ingredients with quantities.

This is the KEY table that makes cost calculation possible!

```sql
CREATE TABLE recipe_ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id TEXT NOT NULL,                -- References recipes.id
    ingredient_id TEXT NOT NULL,            -- References ingredients.id
    quantity REAL NOT NULL,                 -- Amount needed (e.g., 1.5)
    unit TEXT,                              -- Unit (lb, cup, oz, etc.)
    ingredient_name TEXT NOT NULL,          -- Parsed name from recipe
    raw_line TEXT,                          -- Original recipe line
    calculated_cost REAL,                   -- Calculated cost for this ingredient
    matched_with_fuzzy BOOLEAN DEFAULT 0,   -- True if fuzzy matched
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id),
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
);

CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_ingredient ON recipe_ingredients(ingredient_id);
```

**Example data:**
```sql
INSERT INTO recipe_ingredients VALUES (
    NULL,                                   -- id (auto)
    'recipe-id-456',                        -- recipe_id
    'ingredient-id-123',                    -- ingredient_id
    1.0,                                    -- quantity
    'lb',                                   -- unit
    'ground beef',                          -- ingredient_name
    '1 lb ground beef',                     -- raw_line
    6.66,                                   -- calculated_cost
    0,                                      -- matched_with_fuzzy
    CURRENT_TIMESTAMP
);
```

---

## Table: `units`

Reference table for unit types.

```sql
CREATE TABLE units (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unit TEXT NOT NULL UNIQUE,              -- Unit name (lb, oz, cup, etc.)
    unit_type TEXT NOT NULL,                -- weight, volume, count
    is_base_unit BOOLEAN DEFAULT 0          -- Is this a base unit?
);

CREATE INDEX idx_units_type ON units(unit_type);
```

**Example data:**
```sql
INSERT INTO units (unit, unit_type, is_base_unit) VALUES
('lb', 'weight', 1),
('oz', 'weight', 1),
('cup', 'volume', 1),
('fl oz', 'volume', 1),
('tbsp', 'volume', 0),
('tsp', 'volume', 0),
('each', 'count', 1);
```

---

## Table: `unit_conversions`

Conversion factors between units.

```sql
CREATE TABLE unit_conversions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_unit TEXT NOT NULL,                -- Source unit
    to_unit TEXT NOT NULL,                  -- Target unit
    conversion_factor REAL NOT NULL,        -- Multiplier (e.g., 16 for lb→oz)
    ingredient_type TEXT,                   -- Optional: specific ingredient
    notes TEXT,
    FOREIGN KEY (from_unit) REFERENCES units(unit),
    FOREIGN KEY (to_unit) REFERENCES units(unit)
);

CREATE INDEX idx_conversions_from ON unit_conversions(from_unit);
CREATE INDEX idx_conversions_to ON unit_conversions(to_unit);
```

**Example data:**
```sql
INSERT INTO unit_conversions (from_unit, to_unit, conversion_factor, notes) VALUES
('lb', 'oz', 16.0, 'Standard weight conversion'),
('cup', 'fl oz', 8.0, 'Standard volume conversion'),
('tbsp', 'tsp', 3.0, 'Standard volume conversion'),
('cup', 'oz', 8.6, 'Volume to weight for liquids like milk'),
('cup', 'oz', 7.0, 'Volume to weight for rice', 'rice'),
('cup', 'oz', 4.25, 'Volume to weight for flour', 'flour');
```

---

## Views for Easy Querying

### View: `recipe_cost_summary`

Pre-calculated cost summary for each recipe.

```sql
CREATE VIEW recipe_cost_summary AS
SELECT 
    r.id,
    r.name,
    r.servings,
    r.category,
    COALESCE(SUM(ri.calculated_cost), 0) AS total_cost,
    CASE 
        WHEN r.servings > 0 
        THEN COALESCE(SUM(ri.calculated_cost), 0) / r.servings 
        ELSE 0 
    END AS cost_per_serving,
    COUNT(ri.id) AS ingredient_count,
    SUM(CASE WHEN ri.matched_with_fuzzy = 1 THEN 1 ELSE 0 END) AS fuzzy_matched_count
FROM recipes r
LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
GROUP BY r.id, r.name, r.servings, r.category;
```

---

## Relationships Diagram

```
┌─────────────────┐
│   ingredients   │
│─────────────────│
│ id (PK)         │
│ item            │
│ price_per_*     │
└────────┬────────┘
         │
         │ 1
         │
         │ many
         │
┌────────▼──────────────────┐
│ recipe_ingredients        │
│───────────────────────────│
│ id (PK)                   │
│ recipe_id (FK) ───────────┼──┐
│ ingredient_id (FK)        │  │
│ quantity                  │  │
│ unit                      │  │
│ calculated_cost           │  │
└───────────────────────────┘  │
                               │
                               │ many
                               │
                               │ 1
         ┌─────────────────────┘
         │
┌────────▼────────┐
│    recipes      │
│─────────────────│
│ id (PK)         │
│ name            │
│ servings        │
│ category        │
│ total_cost      │
└─────────────────┘
```

---

## Benefits of This Schema

1. **Normalized**: No data duplication (ingredients stored once)
2. **Flexible**: Easy to add new recipes/ingredients
3. **Queryable**: Fast joins for cost calculations
4. **Traceable**: Can see which ingredients matched vs. fuzzy matched
5. **Extensible**: Easy to add price history, meal plans, etc.

---

## Next Steps

1. Run migration script to create this schema
2. Import data from Notion
3. Use SQL queries to calculate costs
