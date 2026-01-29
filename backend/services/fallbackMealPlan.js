import { getRecipes } from '../supabase/recipeClient.js';
import { getRecentRecipeIds } from '../supabase/userHistoryClient.js';

/**
 * Deterministically select recipes when AI fails
 * @param {Object} params
 * @param {string} params.userId
 * @param {number} params.dayCount
 * @returns {Promise<Array<string>>} Array of recipe UUIDs
 */
export async function generateFallbackPlan({ userId, dayCount = 7 }) {
  console.log(`\n⚠️ [Fallback Algo] Generating plan for user ${userId}`);

  // 1. Fetch Data
  const allRecipes = await getRecipes();
  const exclusionList = await getRecentRecipeIds(userId);
  const excludedSet = new Set(exclusionList);

  // 2. Filter & Shuffle
  const candidates = allRecipes.filter(r => !excludedSet.has(r.id));
  
  // Fisher-Yates Shuffle
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  // 3. Select with Constraints
  const selectedIds = [];
  let lastProtein = null;

  for (const recipe of candidates) {
    if (selectedIds.length >= dayCount) break;

    const currentProtein = recipe.proteinCategory || 'other';

    // Constraint: No repeat protein category
    if (currentProtein !== 'other' && currentProtein === lastProtein) {
      continue; 
    }

    selectedIds.push(recipe.id);
    lastProtein = currentProtein;
  }

  // 4. Backfill if strict rules prevented enough selections
  if (selectedIds.length < dayCount) {
    console.warn('   ⚠️ Fallback ran out of recipes due to strict protein rules, backfilling...');
    for (const recipe of candidates) {
      if (selectedIds.length >= dayCount) break;
      if (!selectedIds.includes(recipe.id)) {
        selectedIds.push(recipe.id);
      }
    }
  }

  console.log(`   ✅ Fallback selected ${selectedIds.length} recipes`);
  return selectedIds;
}

