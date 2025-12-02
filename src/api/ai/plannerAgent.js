import { supabase } from '../../lib/supabase';

/**
 * Advanced AI Meal Planner
 * Calls backend API to securely use GPT-4o for meal planning.
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
    
    const weekPlan = [
      { dayOfWeek: 0, dayName: 'Sunday', recipeId: null, isOrderOutNight: true }, 
      { dayOfWeek: 3, dayName: 'Wednesday', recipeId: null, isLeftoverNight: true }, 
      { dayOfWeek: 5, dayName: 'Friday', recipeId: null, isLeftoverNight: true }, 
    ];

    // Fill in the AI selected days
    aiPlan.forEach(slot => {
      const dayIndex = dayMap[slot.day];
      if (dayIndex !== undefined) {
        weekPlan.push({
          dayOfWeek: dayIndex,
          dayName: slot.day,
          recipeId: slot.recipeId
        });
      }
    });

    // Sort by day index
    weekPlan.sort((a, b) => a.dayOfWeek - b.dayOfWeek);

    // 4. Fetch recipes for cost calculation
    let { data: allRecipes } = await supabase
      .from('recipes')
      .select('*')
      .not('total_cost', 'is', null);

    // 5. Save to Database
    // Get current user ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated to create meal plans');
    }
    
    await supabase
      .from('meal_plans')
      .delete()
      .eq('week_start_date', weekStartDate)
      .eq('user_id', user.id);
    
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

    const { error: insertError } = await supabase.from('meal_plans').insert(entries);
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

