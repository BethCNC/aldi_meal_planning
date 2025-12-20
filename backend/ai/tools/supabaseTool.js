/**
 * LangChain tools for querying Supabase database
 * These allow AI agents to search recipes, check pantry, etc.
 */

import { DynamicTool } from "@langchain/core/tools";

/**
 * Tool for searching recipes by various criteria
 */
export const recipeSearchTool = new DynamicTool({
  name: "search_recipes",
  description: `Search for recipes by category, max cost, or tags.
  Input should be a JSON string with optional fields:
  - category: string (Chicken, Beef, Pork, Vegetarian, Seafood, Other)
  - maxCostPerServing: number (max cost per serving in USD)
  - limit: number (max results to return, default 20)

  Returns JSON array of recipes with id, name, category, cost, servings, tags.`,

  func: async (input) => {
    try {
      const params = JSON.parse(input);
      const { getRecipes } = await import("../../supabase/recipeClient.js");

      const recipes = await getRecipes({
        category: params.category,
        maxCostPerServing: params.maxCostPerServing,
        limit: params.limit || 20
      });

      return JSON.stringify(
        recipes.map(r => ({
          id: r.id,
          name: r.name,
          category: r.category,
          cost_per_serving: r.cost_per_serving,
          servings: r.servings,
          tags: r.tags
        }))
      );
    } catch (error) {
      return JSON.stringify({ error: `Error searching recipes: ${error.message}` });
    }
  }
});

/**
 * Tool for getting a single recipe by ID with full details
 */
export const recipeDetailTool = new DynamicTool({
  name: "get_recipe_details",
  description: `Get full details for a specific recipe by ID.
  Input should be a JSON string with:
  - recipeId: string (UUID of the recipe)

  Returns JSON with recipe details including ingredients, instructions, cost breakdown.`,

  func: async (input) => {
    try {
      const { recipeId } = JSON.parse(input);
      const { getRecipeById } = await import("../../supabase/recipeClient.js");

      const recipe = await getRecipeById(recipeId);

      if (!recipe) {
        return JSON.stringify({ error: "Recipe not found" });
      }

      return JSON.stringify(recipe);
    } catch (error) {
      return JSON.stringify({ error: `Error getting recipe: ${error.message}` });
    }
  }
});

/**
 * Tool for checking if user has specific ingredients in pantry
 */
export const pantryCheckTool = new DynamicTool({
  name: "check_pantry",
  description: `Check if user has specific ingredients in their pantry.
  Input should be a JSON string with:
  - userId: string
  - ingredientName: string (name of ingredient to check)

  Returns JSON with availability, quantity, unit, and expiration info.`,

  func: async (input) => {
    try {
      const { userId, ingredientName } = JSON.parse(input);

      // Future: Implement actual pantry lookup
      // For now, return mock data
      return JSON.stringify({
        available: false,
        message: "Pantry integration pending"
      });
    } catch (error) {
      return JSON.stringify({ error: `Error checking pantry: ${error.message}` });
    }
  }
});

/**
 * Tool for getting recent meal history to avoid repetition
 */
export const mealHistoryTool = new DynamicTool({
  name: "get_meal_history",
  description: `Get user's recent meal history to avoid repeating recipes.
  Input should be a JSON string with:
  - userId: string
  - weeks: number (how many weeks back to check, default 4)

  Returns JSON array of recipe IDs used in recent weeks.`,

  func: async (input) => {
    try {
      const { userId, weeks = 4 } = JSON.parse(input);
      const { getMealPlan } = await import("../../supabase/mealPlanClient.js");

      const recentRecipeIds = [];
      const today = new Date();

      for (let i = 0; i < weeks; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - (i * 7));
        const dateStr = checkDate.toISOString().split('T')[0];

        const plan = await getMealPlan(dateStr, userId);
        if (plan && Array.isArray(plan)) {
          plan.forEach(meal => {
            if (meal.recipe_id) {
              recentRecipeIds.push(meal.recipe_id);
            }
          });
        }
      }

      return JSON.stringify({
        weeks_checked: weeks,
        recipe_ids: [...new Set(recentRecipeIds)]
      });
    } catch (error) {
      return JSON.stringify({ error: `Error getting meal history: ${error.message}` });
    }
  }
});

/**
 * Export all tools as an array for easy agent setup
 */
export const supabaseTools = [
  recipeSearchTool,
  recipeDetailTool,
  pantryCheckTool,
  mealHistoryTool
];

export default supabaseTools;
