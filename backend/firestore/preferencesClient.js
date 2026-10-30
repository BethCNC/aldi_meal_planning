// backend/firestore/preferencesClient.js
import { db } from './firestoreClient.js';

const DEFAULT_USER_ID = 'default';

function toDataWithId(doc) {
  if (!doc || !doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

export async function getUserPreferences(userId = DEFAULT_USER_ID) {
  try {
    const ref = db.collection('user_preferences').doc(userId);
    const snap = await ref.get();
    return toDataWithId(snap);
  } catch (e) {
    console.error('Firestore getUserPreferences error:', e.message || e);
    throw e;
  }
}

export async function upsertUserPreferences(preferences, userId = DEFAULT_USER_ID) {
  try {
    const payload = { user_id: userId, ...preferences, updated_at: new Date().toISOString() };
    const ref = db.collection('user_preferences').doc(userId);
    await ref.set(payload, { merge: true });
    const snap = await ref.get();
    return toDataWithId(snap);
  } catch (e) {
    console.error('Firestore upsertUserPreferences error:', e.message || e);
    throw e;
  }
}

export async function markOnboardingComplete(userId = DEFAULT_USER_ID) {
  const now = new Date().toISOString();
  return upsertUserPreferences({ onboarding_completed: true, onboarding_completed_at: now }, userId);
}

export async function getHouseholdProfiles(userId) {
  try {
    const q = db.collection('household_profiles').where('user_id', '==', userId).limit(1);
    const snap = await q.get();
    if (snap.empty) return null;
    const householdDoc = snap.docs[0];
    const household = { id: householdDoc.id, ...householdDoc.data() };

    const userA = household.user_a_profile_id ? await getUserPreferences(household.user_a_profile_id) : null;
    const userB = household.user_b_profile_id ? await getUserPreferences(household.user_b_profile_id) : null;

    return { household, userA, userB };
  } catch (e) {
    console.error('Firestore getHouseholdProfiles error:', e.message || e);
    throw e;
  }
}

export async function upsertUserProfile(userId, profileType, profileData) {
  const payload = { user_id: userId, user_profile_type: profileType, ...profileData, updated_at: new Date().toISOString() };
  const ref = db.collection('user_preferences').doc(userId);
  await ref.set(payload, { merge: true });
  const snap = await ref.get();
  return toDataWithId(snap);
}

export function getSafeIngredientList(profileType) {
  // same as supabase implementation
  const safeProteins = [
    'chicken', 'turkey', 'lean beef', 'tilapia', 'cod', 'shrimp',
    'chicken breast', 'ground turkey', 'ground beef'
  ];

  const safeVeggies = [
    'arugula', 'broccoli', 'carrots', 'cauliflower', 'zucchini',
    'asparagus', 'green beans', 'peppers', 'bell peppers', 'romaine'
  ];

  const safeCarbs = ['jasmine rice', 'rice', 'quinoa', 'sweet potatoes', 'sourdough'];
  const safeFats = ['olive oil', 'butter', 'cream cheese'];
  const safeDairy = ['mozzarella', 'cream cheese', 'milk', 'heavy cream'];

  if (profileType === 'user_a') {
    return [...safeProteins, ...safeVeggies, ...safeCarbs, ...safeFats, ...safeDairy];
  }
  if (profileType === 'user_b') {
    return [...safeProteins, ...safeVeggies, ...safeCarbs, ...safeFats, ...safeDairy, 'oats', 'oatmeal'];
  }
  return [...safeProteins, ...safeVeggies, ...safeCarbs, ...safeFats, ...safeDairy];
}

export function getAvoidIngredientList(profileType) {
  const mcasAvoid = [
    'spinach', 'tomatoes', 'eggplant', 'sauerkraut', 'fermented',
    'cured meats', 'bacon', 'salami', 'canned fish', 'aged beef',
    'avocado', 'walnuts', 'aged cheese', 'cheddar', 'parmesan',
    'yogurt', 'leftover meat'
  ];

  const heartAvoid = [
    'fatty beef', 'processed meats', 'trans fats', 'excessive saturated fats',
    'full-fat dairy'
  ];

  if (profileType === 'user_a') return mcasAvoid;
  if (profileType === 'user_b') return heartAvoid;
  return [...new Set([...mcasAvoid, ...heartAvoid])];
}
