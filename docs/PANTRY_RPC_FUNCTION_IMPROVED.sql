-- ============================================
-- IMPROVED PANTRY RECIPE MATCHING RPC FUNCTION
-- Enhanced version with better matching logic
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
        (COUNT(DISTINCT CASE WHEN ri.ingredient_id = ANY(pantry_ids) THEN ri.ingredient_id END)::REAL / 
        NULLIF(COUNT(DISTINCT ri.ingredient_id), 0)::REAL) * 100, 
        0
      ) AS match_percentage
    FROM recipes r
    JOIN recipe_ingredients ri ON r.id = ri.recipe_id
    -- Optional: Exclude common ingredients from match calculation
    -- Uncomment if you want more accurate percentages
    -- WHERE ri.ingredient_id NOT IN (
    --   SELECT id FROM ingredients 
    --   WHERE item ILIKE ANY(ARRAY['%salt%', '%pepper%', '%oil%', '%water%', '%butter%'])
    -- )
    GROUP BY r.id, r.name, r.servings, r.category, r.total_cost, r.cost_per_serving
    HAVING COUNT(DISTINCT CASE 
      WHEN ri.ingredient_id = ANY(pantry_ids) 
      THEN ri.ingredient_id 
    END) > 0
    -- Optional: Require minimum 2 matches for better quality
    -- Uncomment if you want to filter out weak matches
    -- AND COUNT(DISTINCT CASE 
    --   WHEN ri.ingredient_id = ANY(pantry_ids) 
    --   THEN ri.ingredient_id 
    -- END) >= 2
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
  -- Order by match percentage first, then by cost (cheaper preferred)
  ORDER BY rm.match_percentage DESC, rm.cost_per_serving ASC;
END;
$$;

-- ============================================
-- ALTERNATIVE: Cost-Adjusted Scoring Version
-- Balances match quality with budget
-- ============================================

CREATE OR REPLACE FUNCTION find_recipes_with_pantry_items_scored(
  pantry_ids TEXT[],
  max_cost_per_serving REAL DEFAULT 10.0
)
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
  cost_score REAL,
  combined_score REAL,
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
    WHERE r.cost_per_serving <= max_cost_per_serving
    GROUP BY r.id, r.name, r.servings, r.category, r.total_cost, r.cost_per_serving
    HAVING COUNT(DISTINCT CASE 
      WHEN ri.ingredient_id = ANY(pantry_ids) 
      THEN ri.ingredient_id 
    END) > 0
  ),
  scored AS (
    SELECT 
      rm.*,
      -- Cost score: Lower cost = higher score (0-100 scale)
      CASE 
        WHEN rm.cost_per_serving <= 0 THEN 0
        ELSE LEAST(100, (10.0 / NULLIF(rm.cost_per_serving, 0)) * 10)
      END AS cost_score,
      -- Combined score: 70% match, 30% cost
      (rm.match_percentage * 0.7) + 
      (CASE 
        WHEN rm.cost_per_serving <= 0 THEN 0
        ELSE LEAST(100, (10.0 / NULLIF(rm.cost_per_serving, 0)) * 10)
      END * 0.3) AS combined_score
    FROM recipe_matches rm
  )
  SELECT 
    s.id,
    s.name,
    s.servings,
    s.category,
    s.total_cost,
    s.cost_per_serving,
    s.total_ingredients,
    s.pantry_ingredients_used,
    s.match_percentage,
    s.cost_score,
    s.combined_score,
    array_agg(DISTINCT i.item) FILTER (WHERE ri.ingredient_id = ANY(pantry_ids)) AS pantry_items_used
  FROM scored s
  JOIN recipe_ingredients ri ON s.id = ri.recipe_id
  JOIN ingredients i ON ri.ingredient_id = i.id
  WHERE ri.ingredient_id = ANY(pantry_ids)
  GROUP BY s.id, s.name, s.servings, s.category, s.total_cost, s.cost_per_serving, 
           s.total_ingredients, s.pantry_ingredients_used, s.match_percentage, 
           s.cost_score, s.combined_score
  ORDER BY s.combined_score DESC, s.match_percentage DESC;
END;
$$;

-- ============================================
-- TESTING
-- ============================================

-- Test basic function
-- SELECT * FROM find_recipes_with_pantry_items(
--   ARRAY(SELECT ingredient_id FROM user_pantry)
-- );

-- Test scored function
-- SELECT * FROM find_recipes_with_pantry_items_scored(
--   ARRAY(SELECT ingredient_id FROM user_pantry),
--   5.0  -- Max $5 per serving
-- );

