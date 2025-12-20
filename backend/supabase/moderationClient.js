import { supabase } from './client.js';

/**
 * Get recipes pending moderation
 * @returns {Promise<Array>} List of pending recipes
 */
export async function getPendingRecipes() {
  const { data, error } = await supabase
    .from('recipes')
    .select(`
      *,
      recipe_ingredients(*)
    `)
    .eq('moderation_status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Submit a recipe to the moderation queue
 * @param {Object} recipe - Recipe data
 * @param {string} source - Source of the recipe (scraped, ai_generated)
 * @param {string} sourceUrl - URL if scraped
 * @returns {Promise<Object>} Created recipe
 */
export async function submitForModeration(recipe, source = 'user_submission', sourceUrl = null) {
  // 1. Insert into recipes with pending status
  const recipeData = {
    ...recipe,
    is_verified: false,
    moderation_status: 'pending',
    created_at: new Date().toISOString()
  };
  
  // Remove ingredients from recipe object if present (handled separately)
  const { ingredients, ...recipeFields } = recipeData;
  
  const { data: savedRecipe, error: recipeError } = await supabase
    .from('recipes')
    .insert(recipeFields)
    .select()
    .single();
    
  if (recipeError) throw recipeError;
  
  // 2. Insert ingredients if provided
  if (ingredients && ingredients.length > 0) {
    const ingredientsPayload = ingredients.map(ing => ({
      recipe_id: savedRecipe.id,
      ingredient_id: ing.ingredient_id, // Assumes mapping to existing ingredient
      quantity: ing.quantity,
      unit: ing.unit,
      ingredient_name: ing.name || ing.ingredient_name,
      raw_line: ing.raw_line,
      calculated_cost: ing.calculated_cost
    }));
    
    const { error: ingError } = await supabase
      .from('recipe_ingredients')
      .insert(ingredientsPayload);
      
    if (ingError) {
      console.error('Error saving ingredients:', ingError);
      // Don't throw, just return recipe (can be fixed in moderation)
    }
  }
  
  // 3. Log to moderation_queue table
  const { error: queueError } = await supabase
    .from('moderation_queue')
    .insert({
      recipe_id: savedRecipe.id,
      source,
      source_url: sourceUrl,
      status: 'pending'
    });
    
  if (queueError) console.error('Error logging to moderation queue:', queueError);
  
  return savedRecipe;
}

/**
 * Approve a recipe
 * @param {string} recipeId 
 * @param {string} reviewerId 
 * @returns {Promise<void>}
 */
export async function approveRecipe(recipeId, reviewerId) {
  // Update recipe status
  const { error: recipeError } = await supabase
    .from('recipes')
    .update({ 
      moderation_status: 'approved',
      is_verified: true
    })
    .eq('id', recipeId);
    
  if (recipeError) throw recipeError;
  
  // Update queue log
  await supabase
    .from('moderation_queue')
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewerId
    })
    .eq('recipe_id', recipeId)
    .eq('status', 'pending');
}

/**
 * Reject a recipe
 * @param {string} recipeId 
 * @param {string} reviewerId 
 * @param {string} reason 
 * @returns {Promise<void>}
 */
export async function rejectRecipe(recipeId, reviewerId, reason) {
  // Update recipe status
  const { error: recipeError } = await supabase
    .from('recipes')
    .update({ 
      moderation_status: 'rejected',
      is_verified: false
    })
    .eq('id', recipeId);
    
  if (recipeError) throw recipeError;
  
  // Update queue log
  await supabase
    .from('moderation_queue')
    .update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewerId,
      admin_notes: reason
    })
    .eq('recipe_id', recipeId)
    .eq('status', 'pending');
}

