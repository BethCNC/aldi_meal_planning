import { supabase } from '../../lib/supabase';

/**
 * Advanced AI Meal Planner
 * Calls backend API to securely use Gemini for meal planning.
 */
export async function generateAIWeeklyPlan(options) {
  const {
    budget = 100,
    servings = 4,
    weekStartDate,
    pantryItems = [],
    salesContext = [] // Items on sale
  } = options;

  // 1. Get auth token
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    throw new Error('User must be authenticated to use AI features');
  }

  // 2. Call backend API
  const apiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_SUPABASE_URL?.replace('/rest/v1', '') || '';
  const backendUrl = apiUrl ? `${apiUrl}/api/ai/plan` : '/api/ai/plan';

  try {
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        budget,
        servings,
        weekStartDate,
        pantryItems,
        salesContext
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API error: ${response.statusText}`);
    }

    const { plan: aiPlan, reasoning } = await response.json();

    // 3. Map AI Plan to Database Structure
    const dayMap = { 'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };
    
    // Schedule: Mon/Tue/Thu/Sat = Cook, Wed/Fri/Sun = Leftovers (fixed schedule)
    // Build all 7 days first, set leftover days
    const weekPlan = [
      { dayOfWeek: 0, dayName: 'Sunday', recipeId: null, isLeftoverNight: true },
      { dayOfWeek: 1, dayName: 'Monday', recipeId: null },
      { dayOfWeek: 2, dayName: 'Tuesday', recipeId: null },
      { dayOfWeek: 3, dayName: 'Wednesday', recipeId: null, isLeftoverNight: true },
      { dayOfWeek: 4, dayName: 'Thursday', recipeId: null },
      { dayOfWeek: 5, dayName: 'Friday', recipeId: null, isLeftoverNight: true },
      { dayOfWeek: 6, dayName: 'Saturday', recipeId: null },
    ];

    // Fill in the AI selected recipes for cooking days only (Mon/Tue/Thu/Sat)
    // Filter out Wed/Fri/Sun since those are always leftover days
    const cookingDays = [1, 2, 4, 6]; // Mon, Tue, Thu, Sat
    let recipeIndex = 0;
    
    aiPlan.forEach(slot => {
      const dayIndex = dayMap[slot.day];
      // Only assign recipes to cooking days, skip leftover days
      if (dayIndex !== undefined && cookingDays.includes(dayIndex) && slot.recipeId) {
        const dayPlan = weekPlan.find(d => d.dayOfWeek === dayIndex);
        if (dayPlan && !dayPlan.isLeftoverNight) {
          dayPlan.recipeId = slot.recipeId;
          recipeIndex++;
        }
      }
    });

    // 4. Get Recipe Usage History (for variety tracking)
    // Query meal plans from last 4 weeks to avoid repeats
    const fourWeeksAgo = new Date(weekStartDate);
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    
    const { data: recentMealPlans } = await supabase
      .from('meal_plans')
      .select('recipe_id, week_start_date')
      .eq('user_id', user.id) // Only look at current user's history
      .gte('week_start_date', fourWeeksAgo.toISOString().split('T')[0])
      .lt('week_start_date', weekStartDate)
      .not('recipe_id', 'is', null);
    
    // Build map of recipe usage
    const recipeLastUsed = new Map();
    if (recentMealPlans) {
      recentMealPlans.forEach(plan => {
        const recipeId = plan.recipe_id;
        const currentLastUsed = recipeLastUsed.get(recipeId);
        if (!currentLastUsed || plan.week_start_date > currentLastUsed) {
          recipeLastUsed.set(recipeId, plan.week_start_date);
        }
      });
    }
    
    // Log variety info
    const selectedRecipeIds = weekPlan.filter(d => d.recipeId).map(d => d.recipeId);
    const newRecipesCount = selectedRecipeIds.filter(id => !recipeLastUsed.has(id)).length;
    console.log(`🎯 AI Planner Variety: ${newRecipesCount}/${selectedRecipeIds.length} new recipes this week`);

    // 5. Fetch recipes for cost calculation
    let { data: allRecipes } = await supabase
      .from('recipes')
      .select('*')
      .not('total_cost', 'is', null);

    // 6. Save to Database
    
    // Delete existing meal plans for this week and user first
    // This prevents unique constraint violations when inserting new plans
    const { error: deleteError } = await supabase
      .from('meal_plans')
      .delete()
      .eq('week_start_date', weekStartDate)
      .eq('user_id', user.id);
    
    if (deleteError) {
      console.warn('Warning: Failed to delete existing meal plans:', deleteError.message);
      // Continue anyway - upsert will handle conflicts
    }
    
    const entries = weekPlan.map(meal => ({
      user_id: user.id,
      week_start_date: weekStartDate,
      day_of_week: meal.dayOfWeek,
      meal_type: 'dinner',
      recipe_id: meal.recipeId,
      is_leftover_night: meal.isLeftoverNight || false,
      is_order_out_night: meal.isOrderOutNight || false,
      status: 'planned',
      notes: reasoning || ''
    }));

    // Insert new meal plan entries
    // Using upsert as a fallback in case delete didn't catch everything
    const { error: insertError } = await supabase
      .from('meal_plans')
      .upsert(entries, {
        onConflict: 'week_start_date,day_of_week,meal_type'
      });
    
    if (insertError) throw insertError;

    // Calculate cost for return
    let totalCost = 0;
    const finalDays = weekPlan.map(day => {
      const r = allRecipes?.find(rec => rec.id === day.recipeId);
      if (r) totalCost += r.total_cost;
      return { ...day, recipe: r || null };
    });

    return {
      weekStartDate,
      days: finalDays,
      totalCost,
      budget,
      underBudget: totalCost <= budget,
      matchSource: 'ai-agent',
      aiReasoning: reasoning || ''
    };

  } catch (error) {
    console.error('AI Planning Failed:', error);
    throw new Error('AI planning failed. Please try again or use standard mode.');
  }
}

