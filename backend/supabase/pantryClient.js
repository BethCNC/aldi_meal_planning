import { supabase } from './client.js';

export async function addPantryItem(ingredientId, quantity, unit, options = {}) {
  const { mustUse = false, useByDate = null, source = 'manual_entry', notes = '' } = options;
  
  const { data, error } = await supabase
    .from('user_pantry')
    .insert({
      ingredient_id: ingredientId,
      quantity,
      unit,
      must_use: mustUse,
      use_by_date: useByDate,
      source,
      notes
    })
    .select();
  
  if (error) throw error;
  return data[0];
}

export async function getPantryItems() {
  const { data, error } = await supabase
    .from('user_pantry')
    .select(`
      *,
      ingredient:ingredients(id, item, category, price_per_base_unit)
    `)
    .gt('quantity', 0)
    .order('must_use', { ascending: false })
    .order('use_by_date', { ascending: true });
  
  if (error) throw error;
  return data;
}

export async function findRecipesWithPantry(pantryIngredientIds) {
  const { data, error } = await supabase
    .rpc('find_recipes_with_pantry_items', { pantry_ids: pantryIngredientIds });
  
  if (error) throw error;
  return data;
}

export async function removePantryItem(id) {
  const { error } = await supabase
    .from('user_pantry')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

export async function updatePantryQuantity(id, quantity) {
  const { error } = await supabase
    .from('user_pantry')
    .update({ quantity })
    .eq('id', id);
  
  if (error) throw error;
}
