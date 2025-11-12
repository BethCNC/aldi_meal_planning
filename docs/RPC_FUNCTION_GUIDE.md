# RPC Function Guide - Pantry Recipe Matching

## What the RPC Function Does

The `find_recipes_with_pantry_items` function finds recipes that use ingredients you have in your pantry and calculates a **match percentage** to rank them.

---

## How Match Percentage is Calculated

### Current Formula:
```
match_percentage = (pantry_ingredients_used / total_ingredients) * 100
```

**Example:**
- Recipe has 8 total ingredients
- You have 3 of those ingredients in pantry
- Match percentage = (3/8) * 100 = **37.5%** (rounded to 38%)

### What Gets Returned:

1. **id** - Recipe ID
2. **name** - Recipe name
3. **servings** - Number of servings
4. **category** - Recipe category (Chicken, Beef, etc.)
5. **total_cost** - Total recipe cost
6. **cost_per_serving** - Cost per serving
7. **total_ingredients** - Total number of ingredients in recipe
8. **pantry_ingredients_used** - How many pantry ingredients the recipe uses
9. **match_percentage** - Percentage match (0-100)
10. **pantry_items_used** - Array of ingredient names you have

---

## Current Calculation Logic

### Step 1: Find Recipes with Any Pantry Match
```sql
-- Only includes recipes that use AT LEAST ONE pantry ingredient
HAVING COUNT(DISTINCT CASE 
  WHEN ri.ingredient_id = ANY(pantry_ids) 
  THEN ri.ingredient_id 
END) > 0
```

### Step 2: Calculate Match Percentage
```sql
-- Count pantry ingredients used
pantry_ingredients_used = COUNT(DISTINCT CASE 
  WHEN ri.ingredient_id = ANY(pantry_ids) 
  THEN ri.ingredient_id 
END)

-- Calculate percentage
match_percentage = (pantry_ingredients_used / total_ingredients) * 100
```

### Step 3: Order Results
```sql
ORDER BY rm.match_percentage DESC, rm.total_cost ASC
```
- **First:** Highest match percentage (best matches first)
- **Then:** Lowest cost (cheaper recipes preferred)

---

## Potential Improvements

### Option 1: Weighted Matching (Better for Common Ingredients)

**Problem:** Common ingredients (salt, pepper, oil) inflate match percentage

**Solution:** Exclude common ingredients from calculation

```sql
-- Add a filter for common ingredients
WHERE ri.ingredient_id NOT IN (
  SELECT id FROM ingredients 
  WHERE category IN ('Pantry', 'Spices') 
  AND item ILIKE ANY(ARRAY['%salt%', '%pepper%', '%oil%', '%water%'])
)
```

### Option 2: Minimum Match Threshold

**Problem:** Recipes with 1/10 ingredients matched show 10% match

**Solution:** Require minimum number of matches

```sql
HAVING COUNT(DISTINCT CASE 
  WHEN ri.ingredient_id = ANY(pantry_ids) 
  THEN ri.ingredient_id 
END) >= 2  -- Require at least 2 matches
```

### Option 3: Cost-Adjusted Scoring

**Problem:** Expensive recipes might be better matches but ranked lower

**Solution:** Factor in cost efficiency

```sql
-- Add a score that balances match % and cost efficiency
score = (match_percentage * 0.7) + ((100 - cost_per_serving) * 0.3)
ORDER BY score DESC
```

### Option 4: Ingredient Quantity Matching

**Problem:** Current function only checks if ingredient exists, not if you have enough

**Solution:** Check quantities (requires pantry quantity data)

```sql
-- Join with user_pantry to check quantities
JOIN user_pantry up ON ri.ingredient_id = up.ingredient_id
WHERE up.quantity >= ri.quantity  -- You have enough
```

---

## Recommended Approach

### For MVP (Current):
✅ **Keep current calculation** - Simple and works well

### For Better Results:
✅ **Add minimum match threshold** - Filter out weak matches
✅ **Exclude common ingredients** - More accurate percentages

### For Advanced:
✅ **Quantity matching** - Check if you have enough
✅ **Cost-adjusted scoring** - Balance match quality and budget

---

## How to Test the RPC Function

### Step 1: Add Test Pantry Items
```sql
-- Add chicken to pantry
INSERT INTO user_pantry (ingredient_id, quantity, unit, source)
SELECT id, 1.0, 'lb', 'test'
FROM ingredients
WHERE item ILIKE '%chicken%'
LIMIT 1;

-- Add onion to pantry
INSERT INTO user_pantry (ingredient_id, quantity, unit, source)
SELECT id, 1.0, 'each', 'test'
FROM ingredients
WHERE item ILIKE '%onion%'
LIMIT 1;
```

### Step 2: Test the Function
```sql
SELECT * FROM find_recipes_with_pantry_items(
  ARRAY(SELECT ingredient_id FROM user_pantry)
);
```

### Step 3: Analyze Results
- Check match percentages
- Verify recipes are ordered correctly
- See which pantry items are used

---

## Example Output

```
id          | name                    | match_percentage | pantry_items_used
------------|-------------------------|------------------|------------------
recipe-123  | Chicken Stir Fry        | 75%              | {chicken, onion, garlic}
recipe-456  | Chicken Fajitas         | 60%              | {chicken, onion}
recipe-789  | Beef Tacos              | 25%              | {onion}
```

---

## Troubleshooting

### Issue: No matches returned
**Cause:** No recipes use your pantry ingredients
**Solution:** Add more pantry items or check ingredient names match

### Issue: Low match percentages
**Cause:** Recipes have many ingredients, you have few
**Solution:** This is normal - prioritize recipes with highest percentages

### Issue: Expensive recipes ranked high
**Cause:** They match well but cost more
**Solution:** Consider cost-adjusted scoring (Option 3)

---

## Quick Reference

**Current Calculation:**
- Match % = (pantry ingredients / total ingredients) × 100
- Orders by: Match % DESC, Cost ASC
- Requires: At least 1 pantry ingredient match

**Best Practices:**
- Use 2-5 pantry items for best results
- Focus on proteins and vegetables (not spices)
- Match % of 40%+ is usually good
- Lower cost recipes preferred when match % is equal

