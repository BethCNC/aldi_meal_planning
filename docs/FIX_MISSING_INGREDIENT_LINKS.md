# Fix Missing Ingredient Links (11 Recipes)

These 11 recipes have no ingredient links, so they can't have costs calculated:

1. Chicken & Broccoli (Brown Sauce)
2. Chicken Stir Fry Noodles Recipe
3. Crab Ravioli with Lemon-Garlic No-Cream Sauce
4. Easy 30 Minute Sausage and Pepper Pasta
5. Honey-Garlic Chicken
6. Leftovers
7. Orange Chicken
8. Sheet-Pan Chicken Fajitas
9. Smash Burger Bowls
10. Spaghetti Night
11. Taco Pasta Casserole

---

## Option 1: Check Source URLs

Some recipes have source URLs. Check if you can get ingredient lists from those:

```sql
-- Find recipes with source URLs
SELECT 
    name,
    source_url
FROM recipes
WHERE total_cost IS NULL
  AND source_url IS NOT NULL
ORDER BY name;
```

If you have source URLs, you can:
- Visit the URL and copy the ingredient list
- Use a recipe scraper to extract ingredients automatically

---

## Option 2: Add Ingredients Manually in Supabase

### Step 1: Get Recipe ID

```sql
-- Get ID for a specific recipe
SELECT id, name FROM recipes WHERE name = 'Spaghetti Night';
```

### Step 2: Get Ingredient IDs

```sql
-- Find ingredients you need
SELECT id, item, price_per_base_unit, base_unit 
FROM ingredients 
WHERE item ILIKE '%pasta%' 
   OR item ILIKE '%spaghetti%'
ORDER BY item;
```

### Step 3: Insert Recipe Ingredient Links

```sql
-- Example: Add ingredients for "Spaghetti Night"
-- Replace recipe_id and ingredient_ids with actual values

INSERT INTO recipe_ingredients (
    recipe_id,
    ingredient_id,
    quantity,
    unit,
    ingredient_name,
    raw_line,
    calculated_cost
)
VALUES
    ('recipe-id-here', 'ingredient-id-1', 1, 'lb', 'spaghetti', '1 lb spaghetti', 1.45),
    ('recipe-id-here', 'ingredient-id-2', 1, 'jar', 'spaghetti sauce', '1 jar spaghetti sauce', 0.99),
    -- Add more ingredients...
;
```

---

## Option 3: Use Interactive Script

I can create a script that:
1. Shows you each recipe
2. Lets you paste ingredient lines
3. Matches to ingredients database
4. Creates links automatically

**Would you like me to create this?**

---

## Option 4: Re-fetch from Notion

If these recipes exist in Notion with ingredient lists:

1. Run: `node scripts/fetch-notion-databases.js` (re-fetches from Notion)
2. Check if recipes now have `ingredientsList` field
3. Create a script to parse and create ingredient links

---

## Quick Check: Which Recipes Have Source URLs?

```sql
SELECT 
    name,
    source_url,
    servings
FROM recipes
WHERE total_cost IS NULL
  AND source_url IS NOT NULL
ORDER BY name;
```

This will show which recipes we can potentially scrape ingredient data from.
