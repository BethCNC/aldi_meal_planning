import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StructuredOutputParser } from "langchain/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";

// Define strict output schema with Zod
const mealSchema = z.object({
  day: z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]),
  recipe_id: z.string().describe("UUID of the recipe from the available recipes list"),
  recipe_name: z.string(),
  estimated_cost: z.number().positive(),
  category: z.string(),
  reasoning: z.string().min(20).describe("Detailed explanation for why this recipe was chosen")
});

const mealPlanSchema = z.object({
  meals: z.array(mealSchema).length(7).describe("Exactly 7 meals, one per day"),
  total_cost: z.number().positive().describe("Sum of all meal costs"),
  budget_remaining: z.number().describe("Budget minus total cost"),
  variety_analysis: z.string().min(50).describe("Summary of protein/category distribution across the week")
});

// Create output parser
const outputParser = StructuredOutputParser.fromZodSchema(mealPlanSchema);

// Define prompt template
const MEAL_PLANNING_PROMPT = `You are an expert meal planner specializing in budget-friendly, healthy dinners using Aldi ingredients.

MISSION: Create a 7-day meal plan that maximizes variety, nutrition, and value while staying within budget.

HARD CONSTRAINTS (MUST FOLLOW):
- Weekly budget: {budget} USD (ABSOLUTELY MUST NOT EXCEED)
- Must select exactly 7 recipes (one per day: Monday-Sunday)
- Avoid repeating the same protein category 2 days in a row
- DO NOT use ANY of these recipe IDs from the past 4 weeks: {recent_recipe_ids}
- Each recipe MUST have a recipe_id that exists in the available recipes list below

USER PREFERENCES:
{preferences}

AVAILABLE RECIPES (you MUST choose from this list):
{recipes}

PANTRY ITEMS EXPIRING SOON (prioritize if possible):
{must_use_items}

THINKING PROCESS - Follow these steps:

1. ANALYZE available recipes:
   - Group by cost (cheap: <$8, moderate: $8-$12, expensive: >$12)
   - Group by category (Chicken, Beef, Pork, Vegetarian, Seafood, Other)
   - Identify which recipes use must-use pantry items

2. BUDGET ALLOCATION:
   - Total budget: ${"{budget}"}
   - Target per meal: ~${"{budget}"}/7 = ${"{budget_per_meal}"}
   - Allow 1-2 slightly expensive meals if balanced by cheaper ones

3. VARIETY REQUIREMENTS:
   - Don't repeat same category 2 days in a row
   - Aim for at least 4 different categories across the week
   - Mix preparation styles (quick, slow-cook, etc.)

4. SELECTION STRATEGY:
   - Start with Monday, select a recipe that fits budget and preferences
   - For each subsequent day, select a recipe that:
     * Has a different category than the previous day
     * Fits within remaining budget
     * Matches user preferences
     * Uses must-use items if available
   - Explain your reasoning for EACH choice

5. VALIDATION:
   - Sum total cost - MUST be <= ${"{budget}"}
   - Count categories - should have variety
   - Check no recent recipes are included

CRITICAL RULES:
- Every recipe_id MUST exist in the available recipes list
- Total cost MUST NOT exceed {budget}
- Do NOT make up recipe names or IDs
- If you can't find 7 recipes under budget, choose the best 7 and explain why budget can't be met

{format_instructions}

Generate the meal plan now:`;

const promptTemplate = PromptTemplate.fromTemplate(MEAL_PLANNING_PROMPT);

/**
 * Generate an AI-powered weekly meal plan using LangChain and Gemini
 *
 * @param {Object} params
 * @param {string} params.userId - User ID for personalization
 * @param {string} params.weekStart - ISO date string for week start (e.g., "2025-01-06")
 * @param {number} params.budget - Weekly budget in USD
 * @returns {Promise<Object>} Generated meal plan with AI analysis
 */
export async function generateMealPlan({ userId, weekStart, budget }) {
  console.log(`\n🤖 [AI Meal Planner] Starting generation for user ${userId}`);
  console.log(`   Week: ${weekStart}, Budget: $${budget}`);

  // Import database clients dynamically
  const { getRecipes } = await import('../../supabase/recipeClient.js');
  const { getMealPlan, createMealPlan } = await import('../../supabase/mealPlanClient.js');

  try {
    // 1. Fetch available recipes (limit to reasonable cost range)
    console.log(`\n📊 Fetching available recipes...`);
    const allRecipes = await getRecipes({
      maxCostPerServing: budget / 3  // Don't show recipes >1/3 of weekly budget
    });

    // Filter to recipes with complete data
    const recipes = allRecipes.filter(r =>
      r.id &&
      r.name &&
      r.category &&
      r.cost_per_serving &&
      r.cost_per_serving > 0
    ).slice(0, 50); // Limit to top 50 to reduce token usage

    console.log(`   ✅ Found ${recipes.length} suitable recipes`);

    if (recipes.length < 7) {
      throw new Error(`Not enough recipes available. Found ${recipes.length}, need at least 7.`);
    }

    // 2. Get recent meal plans to avoid repetition
    console.log(`\n📅 Checking recent meal plans...`);
    const fourWeeksAgo = new Date(weekStart);
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    const recentPlans = [];
    for (let i = 0; i < 4; i++) {
      const checkDate = new Date(fourWeeksAgo);
      checkDate.setDate(checkDate.getDate() + (i * 7));
      const dateStr = checkDate.toISOString().split('T')[0];

      const plan = await getMealPlan(dateStr, userId);
      if (plan && Array.isArray(plan)) {
        recentPlans.push(...plan);
      }
    }

    const recentRecipeIds = [...new Set(
      recentPlans
        .filter(meal => meal?.recipe_id)
        .map(meal => meal.recipe_id)
    )];

    console.log(`   ℹ️  Found ${recentRecipeIds.length} recipes to avoid from past 4 weeks`);

    // 3. Get user preferences (future enhancement - for now use defaults)
    const preferences = {
      likes: "Variety of meals, quick prep times",
      dislikes: "None specified",
      dietary_restrictions: "None"
    };

    // 4. Must-use pantry items (future enhancement - mock for now)
    const mustUseItems = [
      // Future: Query actual pantry items with expiration dates
    ];

    // 5. Format recipes for prompt
    const recipesFormatted = recipes.map(r => ({
      id: r.id,
      name: r.name,
      category: r.category,
      cost: parseFloat(r.cost_per_serving || 0).toFixed(2),
      servings: r.servings || 4,
      tags: r.tags || ''
    }));

    // 6. Initialize Gemini LLM
    console.log(`\n🚀 Initializing Gemini AI...`);
    const model = new ChatGoogleGenerativeAI({
      modelName: "gemini-1.5-pro",
      temperature: 0.8, // Allow creativity while staying structured
      maxOutputTokens: 4096,
      apiKey: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.VITE_GOOGLE_API_KEY
    });

    // 7. Format the prompt
    const budgetPerMeal = (budget / 7).toFixed(2);
    const formattedPrompt = await promptTemplate.format({
      budget: budget,
      budget_per_meal: budgetPerMeal,
      recipes: JSON.stringify(recipesFormatted, null, 2),
      recent_recipe_ids: recentRecipeIds.length > 0 ? recentRecipeIds.join(", ") : "none",
      preferences: JSON.stringify(preferences, null, 2),
      must_use_items: mustUseItems.length > 0 ? JSON.stringify(mustUseItems, null, 2) : "none",
      format_instructions: outputParser.getFormatInstructions()
    });

    console.log(`   📝 Prompt length: ${formattedPrompt.length} characters`);
    console.log(`   💭 Calling Gemini API...`);

    // 8. Invoke the LLM
    const response = await model.invoke(formattedPrompt);

    console.log(`   ✅ Gemini response received (${response.content.length} chars)`);

    // 9. Parse structured output
    let plan;
    try {
      plan = await outputParser.parse(response.content);
    } catch (parseError) {
      console.error(`   ❌ Failed to parse LLM output:`, parseError.message);
      console.error(`   Raw output:`, response.content.substring(0, 500));
      throw new Error(`AI produced invalid output format: ${parseError.message}`);
    }

    console.log(`\n✨ Parsed meal plan:`);
    console.log(`   - ${plan.meals.length} meals`);
    console.log(`   - Total cost: $${plan.total_cost.toFixed(2)}`);
    console.log(`   - Budget remaining: $${plan.budget_remaining.toFixed(2)}`);

    // 10. Validate budget constraint (critical!)
    if (plan.total_cost > budget * 1.05) { // Allow 5% buffer for rounding
      console.warn(`\n⚠️  Plan exceeds budget: $${plan.total_cost} > $${budget}`);
      throw new Error(`Generated plan exceeds budget: $${plan.total_cost.toFixed(2)} > $${budget}`);
    }

    // 11. Validate recipe IDs exist
    const validRecipeIds = new Set(recipes.map(r => r.id));
    const invalidMeals = plan.meals.filter(m => !validRecipeIds.has(m.recipe_id));

    if (invalidMeals.length > 0) {
      console.error(`\n❌ AI suggested invalid recipe IDs:`, invalidMeals.map(m => m.recipe_id));
      throw new Error(`AI suggested recipes not in database: ${invalidMeals.map(m => m.recipe_name).join(', ')}`);
    }

    // 12. Save to database
    console.log(`\n💾 Saving meal plan to database...`);

    const mealsToSave = plan.meals.map((meal, index) => ({
      dayOfWeek: index, // 0 = Monday, 6 = Sunday
      recipeId: meal.recipe_id,
      isLeftoverNight: false,
      isOrderOutNight: false
    }));

    const savedPlan = await createMealPlan(weekStart, mealsToSave, userId);

    console.log(`   ✅ Saved ${savedPlan.length} meals to database`);

    // 13. Return structured response
    return {
      success: true,
      plan: {
        id: savedPlan[0]?.id || null,
        weekStart,
        meals: plan.meals,
        totalCost: plan.total_cost,
        budgetRemaining: plan.budget_remaining
      },
      aiAnalysis: {
        variety_analysis: plan.variety_analysis,
        model: 'gemini-1.5-pro',
        generated_at: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error(`\n❌ [AI Meal Planner] Error:`, error.message);
    console.error(error.stack);

    throw new Error(`Failed to generate meal plan: ${error.message}`);
  }
}

// Export for testing
export { mealPlanSchema, outputParser };
