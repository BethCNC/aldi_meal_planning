-- ============================================
-- PANTRY RECIPE MATCHING RPC FUNCTION
-- Finds recipes that use ingredients currently in pantry
-- ============================================

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
        ((COUNT(DISTINCT CASE WHEN ri.ingredient_id = ANY(pantry_ids) THEN ri.ingredient_id END)::REAL / 
        NULLIF(COUNT(DISTINCT ri.ingredient_id), 0)::REAL) * 100)::NUMERIC, 
        0
      )::REAL AS match_percentage
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

-- ============================================
-- TEST THE FUNCTION
-- ============================================
-- First, add some items to pantry:
-- INSERT INTO user_pantry (ingredient_id, quantity, unit, source)
-- SELECT id, 1.0, 'lb', 'test'
-- FROM ingredients
-- WHERE item ILIKE '%chicken%'
-- LIMIT 2;
--
-- Then test:
-- SELECT * FROM find_recipes_with_pantry_items(
--   ARRAY(SELECT ingredient_id FROM user_pantry)
-- );
