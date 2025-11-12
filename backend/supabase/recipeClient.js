import { supabase } from './client.js';

export async function getRecipes(filters = {}) {
  let query = supabase
    .from('recipes')
    .select(`
      *,
      recipe_ingredients(
        *,
        ingredient:ingredients(*)
      )
    `);
  
  if (filters.category) query = query.eq('category', filters.category);
  if (filters.maxCostPerServing) query = query.lte('cost_per_serving', filters.maxCostPerServing);
  
  const { data, error } = await query.order('name');
  if (error) throw error;
  return data;
}

export async function getRecipeById(id) {
  const { data, error } = await supabase
    .from('recipes')
    .select(`
      *,
      recipe_ingredients(
        *,
        ingredient:ingredients(*)
      )
    `)
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

export async function getRecipeIngredients(recipeId) {
  const { data, error } = await supabase
    .from('recipe_ingredients')
    .select(`
      *,
      ingredient:ingredients(*)
    `)
    .eq('recipe_id', recipeId);
  
  if (error) throw error;
  return data;
}
