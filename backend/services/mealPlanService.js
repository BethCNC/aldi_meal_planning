// backend/services/mealPlanService.js
import { selectRecipes } from '../ai/agents/mealPlanningAgent.js';
import { generateFallbackPlan } from './fallbackMealPlan.js';
import { calculatePlanCost } from './priceCalculator.js';
import { generateGroceryList } from './groceryListAggregator.js';
import { getRecipeById, getRecipes } from '../supabase/recipeClient.js';
import { enforceBudget } from './budgetEnforcer.js';

/**
 * Creates a meal plan based on user input, leveraging AI, fallback logic, and budget enforcement.
 * @param {Object} params - Parameters for meal plan generation.
 * @param {number} params.day_count - Number of days for the meal plan.
 * @param {string} params.user_id - User ID for personalized selections.
 * @param {number} [params.budget] - Optional budget for the meal plan.
 * @param {Object} [params.sensory_preferences] - User's sensory preferences.
 * @returns {Promise<Object>} The generated meal plan, grocery list, and metadata.
 */
export async function createMealPlan({ day_count, user_id, budget, sensory_preferences }) {
  console.log('\n🚀 [MealPlanService] Starting meal plan generation...');
  console.log(`   - Parameters: days=${day_count}, budget=${budget}, user=${user_id}`);

  // Fetch all recipes once for use by AI and budget enforcer
  const allRecipes = await getRecipes();
  console.log(`   - Fetched ${allRecipes.length} total recipes from database.`);

  // 1. Select Recipes (AI with Fallback)
  let selectedRecipeIds = [];
  let method = 'gemini-2.5-pro';

  try {
    // 30s Timeout for AI
    selectedRecipeIds = await Promise.race([
      selectRecipes({ userId: user_id, dayCount: day_count, budget: budget, preferences: sensory_preferences, allRecipes: allRecipes }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('AI Timeout')), 30000))
    ]);
    console.log(`   - AI agent returned ${selectedRecipeIds.length} recipe IDs:`, selectedRecipeIds);
  } catch (error) {
    console.warn(`⚠️ AI Generation failed: ${error.message}. Switching to fallback.`);
    selectedRecipeIds = await generateFallbackPlan({ userId: user_id, dayCount: day_count });
    method = 'fallback-algo';
    console.log(`   - Fallback returned ${selectedRecipeIds.length} recipe IDs:`, selectedRecipeIds);
  }

  // 2. Fetch Full Details for AI/Fallback selected IDs
  let recipesToProcess = await Promise.all(selectedRecipeIds.map(id => getRecipeById(id)));
  console.log(`   - Fetched full details for ${recipesToProcess.length} recipes.`);

  // 3. Apply Budget Enforcement if a budget is provided
  if (budget) {
    console.log(`   - Applying budget enforcement with budget: $${budget}`);
    recipesToProcess = enforceBudget(recipesToProcess, allRecipes, budget);
    console.log(`   - After budget enforcement, ${recipesToProcess.length} recipes selected.`);
  }
  
  // 4. Calculate Costs
  const finalRecipeIds = recipesToProcess.map(r => r.id);
  const costData = await calculatePlanCost(finalRecipeIds);
  console.log(`   - Calculated total cost: $${costData.totalCost}`);

  // 5. Generate Grocery List
  const groceryList = generateGroceryList(costData.groceryList);
  console.log(`   - Generated grocery list with ${groceryList.length} items.`);

  // 6. Construct Response
  const plan = recipesToProcess.map((recipe, index) => ({
    day: index + 1,
    recipe: {
      id: recipe.id,
      title: recipe.name,
      description: recipe.description || '',
      image_url: recipe.imageUrl,
      protein_category: recipe.proteinCategory,
      texture_profile: recipe.textureProfile,
      prep_effort_level: recipe.prepEffortLevel
    }
  }));

  const finalResponse = {
    status: 'success',
    meta: {
      generated_by: method,
      total_cost_usd: costData.totalCost
    },
    plan,
    grocery_list: groceryList
  };

  console.log('✅ [MealPlanService] Meal plan generation complete. Sending final response.');
  return finalResponse;
}
