import { supabase } from './client.js';

const DEFAULT_USER_ID = 'default';

function handleMissingTable(error) {
  if (!error) return false;
  // Supabase/PostgREST returns 42P01 when table doesn't exist
  return error.code === '42P01' || error.code === 'PGRST116';
}

export async function getUserPreferences(userId = DEFAULT_USER_ID) {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (handleMissingTable(error)) {
    console.warn('⚠️  user_preferences table not found. Run the latest SQL migrations.');
    return null;
  }

  if (error) throw error;
  return data;
}

export async function upsertUserPreferences(preferences, userId = DEFAULT_USER_ID) {
  const payload = {
    user_id: userId,
    ...preferences,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('user_preferences')
    .upsert(payload, { onConflict: 'user_id' })
    .select()
    .maybeSingle();

  if (handleMissingTable(error)) {
    console.warn('⚠️  user_preferences table not found. Run the latest SQL migrations.');
    return null;
  }

  if (error) throw error;
  return data;
}

export async function markOnboardingComplete(userId = DEFAULT_USER_ID) {
  const now = new Date().toISOString();
  return upsertUserPreferences(
    {
      onboarding_completed: true,
      onboarding_completed_at: now
    },
    userId
  );
}


