import { z } from 'zod';
import { selectRecipes } from '../ai/agents/mealPlanningAgent.js';
import { generateFallbackPlan } from '../services/fallbackMealPlan.js';
import { calculatePlanCost } from '../services/priceCalculator.js';
import { generateGroceryList } from '../services/groceryListAggregator.js';
import { getRecipeById } from '../supabase/recipeClient.js';

// Request Schema
const generateSchema = z.object({
  day_count: z.number().int().min(1).max(14).default(7),
  user_id: z.string().uuid().optional(),
  sensory_preferences: z.object({
    avoid_texture: z.string().optional()
  }).optional()
});

export async function generatePlan(req, res) {
  try {
    // 1. Validate Request
    const validated = generateSchema.parse(req.body);
    const { day_count, user_id, sensory_preferences } = validated;

    // 2. Select Recipes (AI with Fallback)
    let recipeIds = [];
    let method = 'gemini-1.5-pro';

    try {
      // 10s Timeout for AI
      recipeIds = await Promise.race([
        selectRecipes({ userId: user_id, dayCount: day_count, preferences: sensory_preferences }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('AI Timeout')), 10000))
      ]);
    } catch (error) {
      console.warn(`⚠️ AI Generation failed: ${error.message}. Switching to fallback.`);
      recipeIds = await generateFallbackPlan({ userId: user_id, dayCount: day_count });
      method = 'fallback-algo';
    }

    // 3. Fetch Full Details
    const recipes = await Promise.all(recipeIds.map(id => getRecipeById(id)));

    // 4. Calculate Costs
    const costData = await calculatePlanCost(recipeIds);

    // 5. Generate Grocery List
    const groceryList = generateGroceryList(costData.groceryList);

    // 6. Construct Response
    const plan = recipes.map((recipe, index) => ({
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

    res.json({
      status: 'success',
      meta: {
        generated_by: method,
        total_cost_usd: costData.totalCost
      },
      plan,
      grocery_list: groceryList
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ status: 'error', message: 'Invalid input', details: error.errors });
    }
    console.error('Plan Generation Error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
}

