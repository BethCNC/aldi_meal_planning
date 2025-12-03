import { supabase } from '../lib/supabase';

/**
 * Recipe Preferences API
 * Manages user likes/dislikes for recipes
 */

/**
 * Get user's preference for a specific recipe
 */
export async function getRecipePreference(recipeId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('user_recipe_preferences')
    .select('*')
    .eq('user_id', user.id)
    .eq('recipe_id', recipeId)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
  return data;
}

/**
 * Get all user preferences (for filtering)
 */
export async function getAllRecipePreferences() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('user_recipe_preferences')
    .select('*')
    .eq('user_id', user.id);

  if (error) throw error;
  return data || [];
}

/**
 * Get blacklisted recipe IDs
 */
export async function getBlacklistedRecipeIds() {
  const prefs = await getAllRecipePreferences();
  return prefs
    .filter(p => p.preference === 'dislike')
    .map(p => p.recipe_id);
}

/**
 * Get liked recipe IDs
 */
export async function getLikedRecipeIds() {
  const prefs = await getAllRecipePreferences();
  return prefs
    .filter(p => p.preference === 'like')
    .map(p => p.recipe_id);
}

/**
 * Set recipe preference (like, dislike, neutral)
 */
export async function setRecipePreference(recipeId, preference, notes = null) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Validate preference
  if (!['like', 'dislike', 'neutral'].includes(preference)) {
    throw new Error('Invalid preference. Must be: like, dislike, or neutral');
  }

  // Upsert preference
  const { data, error } = await supabase
    .from('user_recipe_preferences')
    .upsert({
      user_id: user.id,
      recipe_id: recipeId,
      preference,
      notes,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,recipe_id'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Mark recipe as disliked (blacklist)
 */
export async function dislikeRecipe(recipeId, reason = null) {
  return setRecipePreference(recipeId, 'dislike', reason);
}

/**
 * Mark recipe as liked
 */
export async function likeRecipe(recipeId, notes = null) {
  return setRecipePreference(recipeId, 'like', notes);
}

/**
 * Remove preference (set to neutral)
 */
export async function removeRecipePreference(recipeId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('user_recipe_preferences')
    .delete()
    .eq('user_id', user.id)
    .eq('recipe_id', recipeId);

  if (error) throw error;
}

/**
 * Get alternative recipe suggestions (excludes blacklisted)
 * Used for recipe swapping
 */
export async function getAlternativeRecipes(currentRecipeId, options = {}) {
  const {
    budget = 100,
    category = null,
    maxCost = 20
  } = options;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Get blacklisted IDs
  const blacklistedIds = await getBlacklistedRecipeIds();

  // Build query
  let query = supabase
    .from('recipes')
    .select('*')
    .not('id', 'in', `(${[currentRecipeId, ...blacklistedIds].join(',')})`)
    .not('total_cost', 'is', null)
    .lte('total_cost', maxCost)
    .order('total_cost', { ascending: true })
    .limit(10);

  // Filter by category if specified
  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}
