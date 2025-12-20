import { findRecipesWithPantry } from '../supabase/pantryClient.js';
import { getRecipes } from '../supabase/recipeClient.js';
import { suggestRecipesFromPantry } from '../ai/geminiClient.js';
import { getUserRatings } from '../supabase/ratingClient.js';

export async function findBestRecipes(pantryItems, options = {}) {
  const { budget = 100, servings = 4, minMatches = 3, userId } = options;
  
  // Step 1: Rule-based matching (fast)
  const pantryIngredientIds = pantryItems.map(item => item.ingredient_id || item.id);
  const ruleBasedMatches = await findRecipesWithPantry(pantryIngredientIds);
  
  // Step 2: Check if we have enough good matches
  const strongMatches = ruleBasedMatches.filter(r => r.match_percentage >= 40);
  
  if (strongMatches.length >= minMatches) {
    console.log(`Found ${strongMatches.length} rule-based matches`);
    return { matches: strongMatches, source: 'rule-based' };
  }
  
  // Step 3: Gemini fallback
  console.log(`Only ${strongMatches.length} matches found, using Gemini fallback...`);
  
  const allRecipes = await getRecipes({ maxCostPerServing: budget / 7 / servings });
  
  // Identify "safe" recipes (rated 4+) if user is known
  let safeRecipes = allRecipes;
  if (userId) {
    try {
      const ratings = await getUserRatings(userId);
      const safeIds = new Set(ratings.filter(r => r.rating >= 4).map(r => r.recipe_id));
      const filtered = allRecipes.filter(r => safeIds.has(r.id));
      if (filtered.length > 0) {
        safeRecipes = filtered;
      }
    } catch (e) {
      console.warn('Failed to fetch ratings for AI context:', e);
    }
  }

  const aiSuggestions = await suggestRecipesFromPantry(pantryItems, safeRecipes, {
    budget,
    servings
  });
  
  // Match AI suggestions back to actual recipe objects
  const aiMatches = aiSuggestions.map(suggestion => {
    const recipe = allRecipes.find(r => r.name.toLowerCase() === suggestion.recipeName.toLowerCase());
    if (recipe) {
      return {
        ...recipe,
        pantry_items_used: suggestion.pantryItemsUsed,
        match_percentage: Math.round((suggestion.pantryItemsUsed.length / pantryItems.length) * 100),
        ai_reasoning: suggestion.reasoning
      };
    }
    return null;
  }).filter(Boolean);
  
  return { matches: aiMatches, source: 'ai-assisted' };
}
