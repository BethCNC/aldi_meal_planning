import { supabase } from './client.js';

export async function getUserHistory(userId, daysLookback = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysLookback);

  const { data, error } = await supabase
    .from('user_history')
    .select('recipe_id, last_eaten_date')
    .eq('user_id', userId)
    .gte('last_eaten_date', cutoffDate.toISOString())
    .order('last_eaten_date', { ascending: false });

  if (error) throw error;
  return data;
}

export async function addToHistory(userId, recipeId, date = new Date()) {
  const { data, error } = await supabase
    .from('user_history')
    .insert({
      user_id: userId,
      recipe_id: recipeId,
      last_eaten_date: date.toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getRecentRecipeIds(userId, daysLookback = 28) {
  const history = await getUserHistory(userId, daysLookback);
  return [...new Set(history.map(entry => entry.recipe_id))];
}

