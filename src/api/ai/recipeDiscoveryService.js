import { supabase } from '../../lib/supabase';

/**
 * Automated Recipe Discovery Service
 * Uses Gemini to continuously discover and integrate new budget-friendly recipes
 */

/**
 * Discover new recipes using Gemini AI
 * @param {Object} options - Discovery options
 * @returns {Promise<Array>} - Array of discovered recipes
 */
export async function discoverNewRecipes(options = {}) {
  const {
    count = 5,
    maxBudget = 15,
    category = null,
    searchQuery = 'budget-friendly Aldi dinner recipes'
  } = options;

  // Get auth token
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    throw new Error('User must be authenticated to discover recipes');
  }

  // Call backend API for recipe discovery
  const apiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_SUPABASE_URL?.replace('/rest/v1', '') || '';
  const backendUrl = apiUrl ? `${apiUrl}/api/ai/gemini/discover` : '/api/ai/gemini/discover';

  try {
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        query: searchQuery,
        count,
        maxBudget,
        category
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || 'Failed to discover recipes');
    }

    const result = await response.json();
    return result.recipes || [];
  } catch (error) {
    console.error('Recipe discovery failed:', error);
    throw error;
  }
}

/**
 * Save discovered recipe to database
 */
export async function saveDiscoveredRecipe(recipe) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Check if recipe already exists (by name)
  const { data: existing } = await supabase
    .from('recipes')
    .select('id')
    .ilike('name', recipe.name)
    .single();

  if (existing) {
    console.log(`Recipe "${recipe.name}" already exists`);
    return existing;
  }

  // Insert recipe
  const { data: newRecipe, error: recipeError } = await supabase
    .from('recipes')
    .insert({
      name: recipe.name,
      category: recipe.category || 'Other',
      servings: recipe.servings || 4,
      total_cost: recipe.estimated_total_cost || recipe.totalCost || 0,
      cost_per_serving: (recipe.estimated_total_cost || recipe.totalCost || 0) / (recipe.servings || 4),
      instructions: Array.isArray(recipe.instructions)
        ? recipe.instructions.join('\n')
        : recipe.instructions,
      tags: recipe.tags || [],
      user_id: user.id // Mark as user-discovered
    })
    .select()
    .single();

  if (recipeError) throw recipeError;

  // Insert ingredients
  if (recipe.ingredients && recipe.ingredients.length > 0) {
    const ingredientInserts = recipe.ingredients.map(ing => ({
      recipe_id: newRecipe.id,
      ingredient_name: ing.item || ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
      raw_line: `${ing.quantity} ${ing.unit} ${ing.item || ing.name}`,
      calculated_cost: ing.estimatedPrice || ing.price || 0
    }));

    const { error: ingredientError } = await supabase
      .from('recipe_ingredients')
      .insert(ingredientInserts);

    if (ingredientError) {
      console.error('Failed to insert ingredients:', ingredientError);
    }
  }

  return newRecipe;
}

/**
 * Batch discover and save recipes
 */
export async function batchDiscoverRecipes(categories = [], recipesPerCategory = 3) {
  const defaultCategories = ['Chicken', 'Beef', 'Pork', 'Vegetarian', 'Seafood'];
  const targetCategories = categories.length > 0 ? categories : defaultCategories;

  const results = {
    discovered: [],
    saved: [],
    errors: []
  };

  for (const category of targetCategories) {
    try {
      console.log(`Discovering ${recipesPerCategory} ${category} recipes...`);

      const recipes = await discoverNewRecipes({
        count: recipesPerCategory,
        searchQuery: `budget-friendly ${category} Aldi dinner recipes under $15`,
        category
      });

      results.discovered.push(...recipes);

      // Save each recipe
      for (const recipe of recipes) {
        try {
          const saved = await saveDiscoveredRecipe(recipe);
          results.saved.push(saved);
          console.log(`✓ Saved: ${recipe.name}`);
        } catch (error) {
          console.error(`✗ Failed to save ${recipe.name}:`, error.message);
          results.errors.push({ recipe: recipe.name, error: error.message });
        }
      }
    } catch (error) {
      console.error(`Failed to discover ${category} recipes:`, error);
      results.errors.push({ category, error: error.message });
    }
  }

  return results;
}

/**
 * Get recipe discovery statistics
 */
export async function getDiscoveryStats() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Count user-discovered recipes
  const { count: userRecipes } = await supabase
    .from('recipes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  // Count all recipes
  const { count: totalRecipes } = await supabase
    .from('recipes')
    .select('*', { count: 'exact', head: true });

  // Get recent discoveries
  const { data: recentRecipes } = await supabase
    .from('recipes')
    .select('id, name, category, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  return {
    userDiscovered: userRecipes || 0,
    totalRecipes: totalRecipes || 0,
    recentDiscoveries: recentRecipes || []
  };
}
