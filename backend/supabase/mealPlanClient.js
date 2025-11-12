import { supabase } from './client.js';

export async function createMealPlan(weekStartDate, meals) {
  const entries = meals.map(meal => ({
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

export async function getMealPlan(weekStartDate) {
  const { data, error } = await supabase
    .from('meal_plans')
    .select(`
      *,
      recipe:recipes(*)
    `)
    .eq('week_start_date', weekStartDate)
    .order('day_of_week');
  
  if (error) throw error;
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
