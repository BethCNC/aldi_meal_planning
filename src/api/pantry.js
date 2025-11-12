import { supabase } from '../lib/supabase';

export async function replacePantryItems(items) {
  try {
    await supabase.from('user_pantry').delete().gt('quantity', -1);
  } catch (error) {
    // Ignore missing table errors (42P01)
    if (error?.code !== '42P01') {
      throw error;
    }
    console.warn('user_pantry table not found. Skipping pantry reset.');
    return [];
  }

  if (!items || items.length === 0) {
    return [];
  }

  const payload = items.map((item) => ({
    ingredient_id: item.ingredient_id,
    quantity: item.quantity || 1,
    unit: item.unit || 'each',
    must_use: item.must_use || item.mustUse || false,
    source: item.source || 'onboarding',
    notes: item.notes || ''
  }));

  const { data, error } = await supabase
    .from('user_pantry')
    .insert(payload)
    .select();

  if (error) throw error;
  return data;
}
