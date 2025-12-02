import { supabase } from '../lib/supabase';

const TABLE = 'user_preferences';

const missingTable = (error) => error && (error.code === '42P01' || error.code === 'PGRST116');

async function getCurrentUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated to access preferences');
  }
  return user.id;
}

export async function fetchPreferences() {
  const userId = await getCurrentUserId();
  
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (missingTable(error)) {
    console.warn('Schedule preferences table missing. Run latest SQL migrations.');
    return null;
  }

  if (error) throw error;
  return data;
}

export async function savePreferences(preferences) {
  const userId = await getCurrentUserId();
  
  const payload = {
    user_id: userId,
    ...preferences,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from(TABLE)
    .upsert(payload, { onConflict: 'user_id' })
    .select()
    .maybeSingle();

  if (missingTable(error)) {
    console.warn('Schedule preferences table missing. Run latest SQL migrations.');
    return null;
  }

  if (error) throw error;
  return data;
}

export async function completeOnboarding() {
  const timestamp = new Date().toISOString();
  return savePreferences({
    onboarding_completed: true,
    onboarding_completed_at: timestamp
  });
}


