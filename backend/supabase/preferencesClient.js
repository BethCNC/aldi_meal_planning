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

/**
 * Get household profiles for a user (both User A and User B profiles)
 * @param {string} userId - Primary user ID
 * @returns {Promise<Object|null>} Object with userA and userB profiles, or null if not found
 */
export async function getHouseholdProfiles(userId) {
  // First, get the household profile record
  const { data: household, error: householdError } = await supabase
    .from('household_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (handleMissingTable(householdError)) {
    console.warn('⚠️  household_profiles table not found. Run the latest SQL migrations.');
    return null;
  }

  if (householdError) throw householdError;
  if (!household) return null;

  // Get User A profile
  const userAProfile = household.user_a_profile_id 
    ? await getUserPreferences(household.user_a_profile_id)
    : null;

  // Get User B profile
  const userBProfile = household.user_b_profile_id
    ? await getUserPreferences(household.user_b_profile_id)
    : null;

  return {
    household,
    userA: userAProfile,
    userB: userBProfile
  };
}

/**
 * Upsert a user profile with specific profile type
 * @param {string} userId - User ID
 * @param {string} profileType - 'user_a', 'user_b', or 'household'
 * @param {Object} profileData - Profile data to save
 * @returns {Promise<Object|null>} Saved profile data
 */
export async function upsertUserProfile(userId, profileType, profileData) {
  const payload = {
    user_id: userId,
    user_profile_type: profileType,
    ...profileData,
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

/**
 * Get safe ingredient list for a profile type
 * Based on documentation: Safe ingredients for both users
 * @param {string} profileType - 'user_a' or 'user_b'
 * @returns {Array<string>} Array of safe ingredient names
 */
export function getSafeIngredientList(profileType) {
  // Safe ingredients that work for BOTH users (intersection of safe lists)
  const safeProteins = [
    'chicken', 'turkey', 'lean beef', 'tilapia', 'cod', 'shrimp',
    'chicken breast', 'ground turkey', 'ground beef'
  ];

  const safeVeggies = [
    'arugula', 'broccoli', 'carrots', 'cauliflower', 'zucchini',
    'asparagus', 'green beans', 'peppers', 'bell peppers', 'romaine'
  ];

  const safeCarbs = [
    'jasmine rice', 'rice', 'quinoa', 'sweet potatoes', 'sourdough'
  ];

  const safeFats = [
    'olive oil', 'butter', 'cream cheese'
  ];

  const safeDairy = [
    'mozzarella', 'cream cheese', 'milk', 'heavy cream'
  ];

  // User A specific (if needed)
  if (profileType === 'user_a') {
    return [
      ...safeProteins,
      ...safeVeggies,
      ...safeCarbs,
      ...safeFats,
      ...safeDairy
    ];
  }

  // User B specific (if needed)
  if (profileType === 'user_b') {
    return [
      ...safeProteins,
      ...safeVeggies,
      ...safeCarbs,
      ...safeFats,
      ...safeDairy,
      'oats', 'oatmeal' // User B can have oats
    ];
  }

  // Default: intersection of both (most restrictive)
  return [
    ...safeProteins,
    ...safeVeggies,
    ...safeCarbs,
    ...safeFats,
    ...safeDairy
  ];
}

/**
 * Get avoid ingredient list for a profile type
 * Based on documentation: Ingredients to avoid for MCAS or Heart Health
 * @param {string} profileType - 'user_a' or 'user_b'
 * @returns {Array<string>} Array of ingredient names to avoid
 */
export function getAvoidIngredientList(profileType) {
  // MCAS triggers (User A)
  const mcasAvoid = [
    'spinach', 'tomatoes', 'eggplant', 'sauerkraut', 'fermented',
    'cured meats', 'bacon', 'salami', 'canned fish', 'aged beef',
    'avocado', 'walnuts', 'aged cheese', 'cheddar', 'parmesan',
    'yogurt', 'leftover meat'
  ];

  // Heart health avoids (User B)
  const heartAvoid = [
    'fatty beef', 'processed meats', 'trans fats', 'excessive saturated fats',
    'full-fat dairy'
  ];

  // User A avoids MCAS triggers
  if (profileType === 'user_a') {
    return mcasAvoid;
  }

  // User B avoids heart health risks
  if (profileType === 'user_b') {
    return heartAvoid;
  }

  // Combined: avoid anything that's a problem for EITHER user
  return [...new Set([...mcasAvoid, ...heartAvoid])];
}


