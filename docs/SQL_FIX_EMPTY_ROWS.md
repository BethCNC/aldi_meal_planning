# SQL Queries to Fix Empty Rows

Run these queries in **Supabase SQL Editor** to identify and fix empty/null data.

---

## 1. Find Recipes Missing Costs

```sql
-- Recipes with missing costs
SELECT 
    id,
    name,
    servings,
    total_cost,
    cost_per_serving
FROM recipes
WHERE total_cost IS NULL 
   OR cost_per_serving IS NULL
   OR servings IS NULL
   OR servings = 0
ORDER BY name;
```

---

## 2. Find Recipes Missing Servings

```sql
-- Recipes with missing or zero servings
SELECT 
    id,
    name,
    servings,
    total_cost,
    cost_per_serving
FROM recipes
WHERE servings IS NULL 
   OR servings = 0
ORDER BY name;
```

**Fix:** Update servings manually (most recipes are 4-6 servings):

```sql
-- Example: Set servings to 4 for a specific recipe
UPDATE recipes
SET servings = 4,
    cost_per_serving = CASE 
        WHEN total_cost IS NOT NULL AND total_cost > 0 
        THEN total_cost / 4 
        ELSE NULL 
    END,
    updated_at = NOW()
WHERE id = 'recipe-id-here';
```

---

## 3. Find Recipes with Costs but No Ingredient Links

```sql
-- Recipes that have costs but no recipe_ingredient links
SELECT 
    r.id,
    r.name,
    r.total_cost,
    COUNT(ri.id) as ingredient_count
FROM recipes r
LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
WHERE r.total_cost IS NOT NULL
GROUP BY r.id, r.name, r.total_cost
HAVING COUNT(ri.id) = 0
ORDER BY r.name;
```

---

## 4. Find Recipes Missing Ingredient Links

```sql
-- All recipes without any ingredient links
SELECT 
    r.id,
    r.name,
    r.servings,
    r.total_cost
FROM recipes r
LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
WHERE ri.id IS NULL
ORDER BY r.name;
```

---

## 5. Fix Cost Per Serving from Total Cost

```sql
-- Calculate cost_per_serving for recipes with total_cost and servings
UPDATE recipes
SET cost_per_serving = CASE
    WHEN servings > 0 AND total_cost IS NOT NULL 
    THEN ROUND((total_cost / servings)::numeric, 2)
    ELSE cost_per_serving
END,
updated_at = NOW()
WHERE total_cost IS NOT NULL 
  AND servings > 0
  AND (cost_per_serving IS NULL OR cost_per_serving = 0);
```

---

## 6. Recalculate Recipe Costs from Ingredients

```sql
-- Recalculate total_cost and cost_per_serving from recipe_ingredients
WITH recipe_costs AS (
    SELECT 
        recipe_id,
        COALESCE(SUM(calculated_cost), 0) as total_cost
    FROM recipe_ingredients
    WHERE calculated_cost IS NOT NULL
    GROUP BY recipe_id
)
UPDATE recipes r
SET 
    total_cost = rc.total_cost,
    cost_per_serving = CASE
        WHEN r.servings > 0 AND rc.total_cost > 0
        THEN ROUND((rc.total_cost / r.servings)::numeric, 2)
        ELSE 0
    END,
    updated_at = NOW()
FROM recipe_costs rc
WHERE r.id = rc.recipe_id
  AND (r.total_cost IS NULL OR r.total_cost != rc.total_cost);
```

---

## 7. Find Recipe Ingredients Missing Costs

```sql
-- Recipe ingredients without calculated_cost
SELECT 
    ri.id,
    ri.recipe_id,
    r.name as recipe_name,
    ri.ingredient_name,
    ri.quantity,
    ri.unit,
    ri.calculated_cost,
    i.price_per_base_unit,
    i.base_unit
FROM recipe_ingredients ri
JOIN recipes r ON ri.recipe_id = r.id
LEFT JOIN ingredients i ON ri.ingredient_id = i.id
WHERE ri.calculated_cost IS NULL
ORDER BY r.name, ri.ingredient_name;
```

---

## 8. Calculate Missing Recipe Ingredient Costs

```sql
-- Calculate costs for recipe_ingredients that are missing them
-- (Simple calculation - assumes unit matches base_unit)
UPDATE recipe_ingredients ri
SET calculated_cost = ROUND((ri.quantity * i.price_per_base_unit)::numeric, 2)
FROM ingredients i
WHERE ri.ingredient_id = i.id
  AND ri.calculated_cost IS NULL
  AND ri.quantity IS NOT NULL
  AND ri.quantity > 0
  AND i.price_per_base_unit IS NOT NULL;
```

---

## 9. Set Default Servings for Recipes

```sql
-- Set default servings (4) for recipes missing it
UPDATE recipes
SET servings = 4,
    cost_per_serving = CASE
        WHEN total_cost IS NOT NULL AND total_cost > 0
        THEN ROUND((total_cost / 4)::numeric, 2)
        ELSE NULL
    END,
    updated_at = NOW()
WHERE servings IS NULL OR servings = 0;
```

⚠️ **Note:** Review this before running - you may want to set different serving sizes for different recipes.

---

## 10. Complete Fix Script

Run this to fix most common issues:

```sql
-- Step 1: Calculate missing recipe_ingredient costs
UPDATE recipe_ingredients ri
SET calculated_cost = ROUND((ri.quantity * i.price_per_base_unit)::numeric, 2)
FROM ingredients i
WHERE ri.ingredient_id = i.id
  AND ri.calculated_cost IS NULL
  AND ri.quantity IS NOT NULL
  AND ri.quantity > 0
  AND i.price_per_base_unit IS NOT NULL;

-- Step 2: Recalculate recipe costs from ingredients
WITH recipe_costs AS (
    SELECT 
        recipe_id,
        COALESCE(SUM(calculated_cost), 0) as total_cost
    FROM recipe_ingredients
    WHERE calculated_cost IS NOT NULL
    GROUP BY recipe_id
)
UPDATE recipes r
SET 
    total_cost = rc.total_cost,
    cost_per_serving = CASE
        WHEN r.servings > 0 AND rc.total_cost > 0
        THEN ROUND((rc.total_cost / r.servings)::numeric, 2)
        ELSE 0
    END,
    updated_at = NOW()
FROM recipe_costs rc
WHERE r.id = rc.recipe_id;

-- Step 3: Fix cost_per_serving for recipes with total_cost but missing cost_per_serving
UPDATE recipes
SET cost_per_serving = CASE
    WHEN servings > 0 AND total_cost IS NOT NULL AND total_cost > 0
    THEN ROUND((total_cost / servings)::numeric, 2)
    ELSE cost_per_serving
END,
updated_at = NOW()
WHERE (cost_per_serving IS NULL OR cost_per_serving = 0)
  AND total_cost IS NOT NULL
  AND servings > 0;
```

---

## Summary

After running these queries, you should have:
- ✅ All recipe_ingredients with calculated_cost
- ✅ All recipes with total_cost (if they have ingredient links)
- ✅ All recipes with cost_per_serving (if they have servings)

**Recipes still needing work:**
- Recipes without ingredient links (need to parse ingredient text and create links)
- Recipes without servings (need manual input of serving sizes)
