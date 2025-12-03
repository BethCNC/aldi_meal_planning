import { supabase } from '../../lib/supabase';
import { getBlacklistedRecipeIds } from '../recipePreferences';

/**
 * Gemini Two-Step AI Meal Planner
 * Calls backend API to use Gemini with:
 * - Step A: Context gathering with Google Search (5s timeout)
 * - Step B: Structured generation with strict JSON schema
 * - Respects user recipe preferences (blacklist)
 */
export async function generateGeminiWeeklyPlan(options) {
  const {
    budget = 100,
    peopleCount = 2,
    weekStartDate,
    pantryItems = [],
    salesContext = []
  } = options;

  // Get blacklisted recipes
  let blacklistedIds = [];
  try {
    blacklistedIds = await getBlacklistedRecipeIds();
    console.log(`Excluding ${blacklistedIds.length} blacklisted recipes`);
  } catch (error) {
    console.warn('Could not fetch blacklist:', error);
  }

  // 1. Get auth token
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    throw new Error('User must be authenticated to use AI features');
  }

  // 2. Call backend API
  const apiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_SUPABASE_URL?.replace('/rest/v1', '') || '';
  const backendUrl = apiUrl ? `${apiUrl}/api/ai/gemini/plan` : '/api/ai/gemini/plan';

  try {
    console.log('🚀 Starting Gemini two-step pipeline...');

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        budget,
        peopleCount,
        weekStartDate,
        pantryItems,
        salesContext,
        blacklistedRecipeIds: blacklistedIds
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || `API error: ${response.statusText}`);
    }

    const result = await response.json();

    console.log('✅ Gemini plan generated successfully');
    console.log(`Total Cost: $${result.totalEstimatedCost} / Budget: $${budget}`);

    // 3. Map Gemini Plan to Database Structure
    const dayMap = {
      'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
      'Thursday': 4, 'Friday': 5, 'Saturday': 6
    };

    const weekPlan = [];

    // Process Gemini's weekly plan
    result.weeklyPlan.forEach(slot => {
      const dayIndex = dayMap[slot.day];
      if (dayIndex !== undefined) {
        weekPlan.push({
          dayOfWeek: dayIndex,
          dayName: slot.day,
          recipeId: slot.recipeId || null,
          recipeName: slot.recipeName || null,
          isLeftoverNight: slot.mealType === 'leftover',
          isOrderOutNight: slot.mealType === 'order-out',
          estimatedCost: slot.estimatedCost || 0
        });
      }
    });

    // Sort by day index
    weekPlan.sort((a, b) => a.dayOfWeek - b.dayOfWeek);

    // 4. Fetch recipes for full details if we have recipe IDs
    let { data: allRecipes } = await supabase
      .from('recipes')
      .select('*')
      .not('total_cost', 'is', null);

    // 5. Save to Database
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated to create meal plans');
    }

    // Delete existing plan for this week
    await supabase
      .from('meal_plans')
      .delete()
      .eq('week_start_date', weekStartDate)
      .eq('user_id', user.id);

    // Insert new meal plan
    const entries = weekPlan.map(meal => ({
      user_id: user.id,
      week_start_date: weekStartDate,
      day_of_week: meal.dayOfWeek,
      meal_type: 'dinner',
      recipe_id: meal.recipeId,
      is_leftover_night: meal.isLeftoverNight || false,
      is_order_out_night: meal.isOrderOutNight || false,
      status: 'planned',
      notes: `Gemini AI: ${result.reasoning || ''}`
    }));

    const { error: insertError } = await supabase.from('meal_plans').insert(entries);
    if (insertError) throw insertError;

    // 6. Save grocery list to database
    await supabase
      .from('grocery_lists')
      .delete()
      .eq('week_start_date', weekStartDate)
      .eq('user_id', user.id);

    if (result.groceryList && result.groceryList.length > 0) {
      // First, try to match ingredients with our catalog
      const { data: catalogIngredients } = await supabase
        .from('ingredients')
        .select('*');

      const groceryEntries = result.groceryList.map(item => {
        // Try to find matching ingredient in catalog
        const matchedIngredient = catalogIngredients?.find(
          ing => ing.item.toLowerCase() === item.item.toLowerCase()
        );

        return {
          user_id: user.id,
          week_start_date: weekStartDate,
          ingredient_id: matchedIngredient?.id || null,
          ingredient_name: item.item,
          quantity_needed: item.quantity,
          unit: item.unit,
          estimated_cost: item.estimatedPrice,
          category: item.category,
          is_purchased: false,
          notes: item.usedInRecipes ? `Used in: ${item.usedInRecipes.join(', ')}` : null
        };
      });

      const { error: groceryError } = await supabase
        .from('grocery_lists')
        .insert(groceryEntries);

      if (groceryError) {
        console.warn('Failed to save grocery list:', groceryError);
      }
    }

    // 7. Calculate final cost and return
    let totalCost = result.totalEstimatedCost || 0;
    const finalDays = weekPlan.map(day => {
      const r = allRecipes?.find(rec => rec.id === day.recipeId);
      return { ...day, recipe: r || null };
    });

    return {
      weekStartDate,
      days: finalDays,
      totalCost,
      budget,
      underBudget: totalCost <= budget,
      matchSource: 'gemini-two-step',
      aiReasoning: result.reasoning || '',
      groceryList: result.groceryList || []
    };

  } catch (error) {
    console.error('Gemini Planning Failed:', error);
    throw new Error(`Gemini planning failed: ${error.message}. Please try again or use standard mode.`);
  }
}
