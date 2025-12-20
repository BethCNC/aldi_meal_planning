import { supabase } from './client.js';

/**
 * Get ratings for a user
 * @param {string} userId
 * @returns {Promise<Array>} List of ratings
 */
export async function getUserRatings(userId) {
  const { data, error } = await supabase
    .from('user_ratings')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  return data;
}

/**
 * Submit a rating
 * @param {Object} rating - Rating object
 * @returns {Promise<Object>} Created rating
 */
export async function submitRating(rating) {
  const { data, error } = await supabase
    .from('user_ratings')
    .upsert({
      user_id: rating.userId,
      recipe_id: rating.recipeId,
      meal_plan_id: rating.mealPlanId,
      rating: rating.rating,
      comment: rating.comment,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id, recipe_id, meal_plan_id'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get average rating for a recipe
 * @param {string} recipeId
 * @returns {Promise<number>} Average rating
 */
export async function getRecipeAverageRating(recipeId) {
  const { data, error } = await supabase
    .from('user_ratings')
    .select('rating')
    .eq('recipe_id', recipeId);

  if (error) throw error;
  if (!data.length) return 0;

  const sum = data.reduce((acc, curr) => acc + curr.rating, 0);
  return sum / data.length;
}

