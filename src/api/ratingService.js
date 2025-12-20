import { supabase } from '../lib/supabase';

export async function submitRating({ recipeId, mealPlanId, rating, comment }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('user_ratings')
    .upsert({
      user_id: user.id,
      recipe_id: recipeId,
      meal_plan_id: mealPlanId,
      rating,
      comment,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id, recipe_id, meal_plan_id'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getRecipeRating(recipeId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('user_ratings')
    .select('*')
    .eq('user_id', user.id)
    .eq('recipe_id', recipeId)
    .maybeSingle(); // Use maybeSingle to avoid error if not found

  if (error) throw error;
  return data;
}

