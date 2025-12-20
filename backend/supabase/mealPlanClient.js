import { supabase } from './client.js';

export async function createMealPlan(weekStartDate, meals, userId) {
  const entries = meals.map(meal => ({
    user_id: userId,
    week_start_date: weekStartDate,
    day_of_week: meal.dayOfWeek,
    meal_type: 'dinner',
    recipe_id: meal.recipeId,
    is_leftover_night: meal.isLeftoverNight || false,
    is_order_out_night: meal.isOrderOutNight || false,
    status: 'planned'
  }));
  
  const { data, error } = await supabase
    .from('meal_plans')
    .insert(entries)
    .select();
  
  if (error) throw error;
  return data;
}

export async function getMealPlan(weekStartDate, userId) {
  let query = supabase
    .from('meal_plans')
    .select(`
      *,
      recipe:recipes(*)
    `)
    .eq('week_start_date', weekStartDate)
    .order('day_of_week');

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching meal plan:', error);
    throw error;
  }

  return data;
}

export async function updateMealPlanDay(id, recipeId) {
  const { error } = await supabase
    .from('meal_plans')
    .update({ recipe_id: recipeId })
    .eq('id', id);
  
  if (error) throw error;
}

export async function deleteMealPlan(weekStartDate) {
  const { error } = await supabase
    .from('meal_plans')
    .delete()
    .eq('week_start_date', weekStartDate);
  
  if (error) throw error;
}
