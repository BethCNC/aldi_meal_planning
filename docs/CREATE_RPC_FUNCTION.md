# 🚀 Create RPC Function - Step by Step

**Status:** RPC function not created yet  
**Time Required:** 2 minutes

---

## Quick Steps

### 1. Open Supabase SQL Editor

**Option A:** Click this link (if it opens):
```
https://supabase.com/dashboard/project/_/sql/new
```

**Option B:** Manual navigation:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **"SQL Editor"** in left sidebar
4. Click **"New query"** button

---

### 2. Copy This SQL

```sql
CREATE OR REPLACE FUNCTION find_recipes_with_pantry_items(pantry_ids TEXT[])
RETURNS TABLE (
  id TEXT,
  name TEXT,
  servings INTEGER,
  category TEXT,
  total_cost REAL,
  cost_per_serving REAL,
  total_ingredients BIGINT,
  pantry_ingredients_used BIGINT,
  match_percentage REAL,
  pantry_items_used TEXT[]
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH recipe_matches AS (
    SELECT 
      r.id,
      r.name,
      r.servings,
      r.category,
      r.total_cost,
      r.cost_per_serving,
      COUNT(DISTINCT ri.ingredient_id) AS total_ingredients,
      COUNT(DISTINCT CASE 
        WHEN ri.ingredient_id = ANY(pantry_ids) 
        THEN ri.ingredient_id 
      END) AS pantry_ingredients_used,
      ROUND(
        (COUNT(DISTINCT CASE WHEN ri.ingredient_id = ANY(pantry_ids) THEN ri.ingredient_id END)::REAL / 
        NULLIF(COUNT(DISTINCT ri.ingredient_id), 0)::REAL) * 100, 
        0
      ) AS match_percentage
    FROM recipes r
    JOIN recipe_ingredients ri ON r.id = ri.recipe_id
    GROUP BY r.id, r.name, r.servings, r.category, r.total_cost, r.cost_per_serving
    HAVING COUNT(DISTINCT CASE 
      WHEN ri.ingredient_id = ANY(pantry_ids) 
      THEN ri.ingredient_id 
    END) > 0
  )
  SELECT 
    rm.id,
    rm.name,
    rm.servings,
    rm.category,
    rm.total_cost,
    rm.cost_per_serving,
    rm.total_ingredients,
    rm.pantry_ingredients_used,
    rm.match_percentage,
    array_agg(DISTINCT i.item) FILTER (WHERE ri.ingredient_id = ANY(pantry_ids)) AS pantry_items_used
  FROM recipe_matches rm
  JOIN recipe_ingredients ri ON rm.id = ri.recipe_id
  JOIN ingredients i ON ri.ingredient_id = i.id
  WHERE ri.ingredient_id = ANY(pantry_ids)
  GROUP BY rm.id, rm.name, rm.servings, rm.category, rm.total_cost, rm.cost_per_serving, rm.total_ingredients, rm.pantry_ingredients_used, rm.match_percentage
  ORDER BY rm.match_percentage DESC, rm.total_cost ASC;
END;
$$;
```

---

### 3. Paste and Run

1. **Paste** the SQL above into the SQL Editor
2. **Click "Run"** button (or press `Cmd/Ctrl + Enter`)
3. **Expected result:** "Success. No rows returned"

---

### 4. Verify It Worked

Run this command in your terminal:

```bash
npm run test:rpc
```

**Expected output:**
```
✅ RPC function exists
✅ Found X matching recipes
```

---

## What This Function Does

The RPC function `find_recipes_with_pantry_items`:
- Takes an array of pantry ingredient IDs
- Finds recipes that use those ingredients
- Calculates match percentage (how many recipe ingredients you already have)
- Returns recipes sorted by match percentage and cost
- Enables "pantry-first" meal planning

---

## Troubleshooting

### "Function does NOT exist" after running SQL
- Check for SQL syntax errors in Supabase dashboard
- Make sure you copied the entire function (including `$$;` at the end)
- Try running the SQL again

### "Permission denied" error
- Make sure you're logged into Supabase
- Check that you're in the correct project
- Verify your account has SQL Editor access

### Function exists but test fails
- Run `npm run verify:supabase` to check database state
- Check that recipes have linked ingredients
- Verify pantry items exist

---

## Next Steps After Creation

Once the function is created:

1. **Test with pantry items:**
   ```bash
   npm run test:rpc
   ```

2. **Add pantry items** (via frontend or SQL):
   - Use the `/pantry-input` page in the app
   - Or add via SQL Editor

3. **Generate pantry-based meal plans:**
   - The app will automatically use this function
   - Recipes will be prioritized by pantry match percentage

---

**Need help?** The function is also saved in `docs/PANTRY_RPC_FUNCTION.sql`

