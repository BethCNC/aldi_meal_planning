import { findRecipesWithPantry } from '../supabase/pantryClient.js';
import { getRecipes } from '../supabase/recipeClient.js';
import { suggestRecipesFromPantry } from '../ai/openaiClient.js';

export async function findBestRecipes(pantryItems, options = {}) {
  const { budget = 100, servings = 4, minMatches = 3 } = options;
  
  // Step 1: Rule-based matching (fast)
  const pantryIngredientIds = pantryItems.map(item => item.ingredient_id || item.id);
  const ruleBasedMatches = await findRecipesWithPantry(pantryIngredientIds);
  
  // Step 2: Check if we have enough good matches
  const strongMatches = ruleBasedMatches.filter(r => r.match_percentage >= 40);
  
  if (strongMatches.length >= minMatches) {
    console.log(`Found ${strongMatches.length} rule-based matches`);
    return { matches: strongMatches, source: 'rule-based' };
  }
  
  // Step 3: OpenAI fallback
  console.log(`Only ${strongMatches.length} matches found, using OpenAI fallback...`);
  
  const allRecipes = await getRecipes({ maxCostPerServing: budget / 7 / servings });
  const aiSuggestions = await suggestRecipesFromPantry(pantryItems, allRecipes, {
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
