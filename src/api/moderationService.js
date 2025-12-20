import { supabase } from '../lib/supabase';

/**
 * Fetch recipes pending moderation
 * @returns {Promise<Array>} List of pending recipes
 */
export async function getPendingRecipes() {
  const { data, error } = await supabase
    .from('recipes')
    .select(`
      *,
      recipe_ingredients(
        *,
        ingredient:ingredients(*)
      )
    `)
    .eq('moderation_status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Approve a recipe
 * @param {string} recipeId 
 * @returns {Promise<void>}
 */
export async function approveRecipe(recipeId) {
  const { data: { user } } = await supabase.auth.getUser();
  
  const { error } = await supabase
    .from('recipes')
    .update({ 
      moderation_status: 'approved',
      is_verified: true
    })
    .eq('id', recipeId);

  if (error) throw error;

  // Log to queue if entry exists
  if (user) {
    await supabase
      .from('moderation_queue')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id
      })
      .eq('recipe_id', recipeId)
      .eq('status', 'pending');
  }
}

/**
 * Reject a recipe
 * @param {string} recipeId 
 * @param {string} reason 
 * @returns {Promise<void>}
 */
export async function rejectRecipe(recipeId, reason) {
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('recipes')
    .update({ 
      moderation_status: 'rejected',
      is_verified: false
    })
    .eq('id', recipeId);

  if (error) throw error;

  // Log to queue if entry exists
  if (user) {
    await supabase
      .from('moderation_queue')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
        admin_notes: reason
      })
      .eq('recipe_id', recipeId)
      .eq('status', 'pending');
  }
}

/**
 * Update recipe details during moderation
 * @param {string} recipeId 
 * @param {Object} updates 
 * @returns {Promise<void>}
 */
export async function updateRecipe(recipeId, updates) {
  const { error } = await supabase
    .from('recipes')
    .update(updates)
    .eq('id', recipeId);

  if (error) throw error;
}

