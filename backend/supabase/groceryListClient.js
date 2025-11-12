import { supabase } from './client.js';

export async function getGroceryList(weekStartDate) {
  const { data, error } = await supabase
    .from('grocery_lists')
    .select(`
      *,
      ingredient:ingredients(*)
    `)
    .eq('week_start_date', weekStartDate)
    .order('category');
  
  if (error) throw error;
  return data;
}

export async function markItemPurchased(id, purchased) {
  const { error } = await supabase
    .from('grocery_lists')
    .update({ is_purchased: purchased })
    .eq('id', id);
  
  if (error) throw error;
}

export async function addCustomItem(weekStartDate, item, quantity, unit) {
  const { data, error } = await supabase
    .from('grocery_lists')
    .insert({
      week_start_date: weekStartDate,
      ingredient_id: null,
      quantity_needed: quantity,
      unit,
      category: 'Other',
      notes: item
    })
    .select();
  
  if (error) throw error;
  return data[0];
}
