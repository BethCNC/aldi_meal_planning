import { supabase } from '../lib/supabase';

async function getCurrentUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated to manage pantry');
  }
  return user.id;
}

export async function replacePantryItems(items) {
  const userId = await getCurrentUserId();
  
  try {
    // Delete only current user's pantry items
    await supabase
      .from('user_pantry')
      .delete()
      .eq('user_id', userId);
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
    user_id: userId,
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
