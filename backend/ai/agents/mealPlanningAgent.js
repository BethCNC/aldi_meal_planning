import { getModel } from '../geminiClient.js';
import { getRecipes } from '../../supabase/recipeClient.js';
import { getRecentRecipeIds } from '../../supabase/userHistoryClient.js';

/**
 * Generate a meal plan by selecting recipe IDs from the catalog
 * @param {Object} params
 * @param {string} params.userId
 * @param {number} params.dayCount
 * @param {number} params.budget - Optional budget for meal plan
 * @param {Object} params.preferences - User preferences for meal selection
 * @param {Array<Object>} params.allRecipes - Full catalog of all available recipe objects.
 * @returns {Promise<Array<string>>} Array of recipe UUIDs
 */
export async function selectRecipes({ userId, dayCount = 7, budget, preferences = {}, allRecipes }) {
  console.log(`\n🤖 [AI Agent] Selecting ${dayCount} recipes for user ${userId}`);

  // 1. Fetch Context (allRecipes now passed as param)
  // const allRecipes = await getRecipes(); // Removed this line
  const exclusionList = await getRecentRecipeIds(userId);

  // Minify recipes for context window
  const catalog = allRecipes.map(r => ({
    id: r.id,
    t: r.name, // title
    p: r.proteinCategory || 'other', // protein
    x: r.textureProfile || 'mixed', // texture
    c: Math.ceil(r.costPerServing || 0), // cost (rounded)
    r: r.rating || 3, // rating
    tag: r.tags || ''
  }));

  console.log(`   📊 Catalog size: ${catalog.length} recipes`);
  console.log(`   🚫 Excluded IDs: ${exclusionList.length}`);

  // 2. Construct Prompt
  const prompt = `
Role: You are an expert meal planner for neurodivergent individuals.
Task: Select exactly ${dayCount} distinct recipes from the provided 'Available Catalog'.
${budget ? `IMPORTANT: The TOTAL combined cost ('c' field) of the ${dayCount} selected recipes MUST NOT exceed $${budget}. Focus on lower-cost options.` : ''}

Constraints & Preferences:
1. Variety: Never select the same 'p' (protein) two days in a row.
2. Preference: Prefer recipes with a higher 'r' (rating) value.
3. Sensory Balance: Ensure a mix of 'x' (texture).
4. History: DO NOT select any recipes listed in the 'Exclusion List'.
5. Output: Return ONLY a JSON array of ${dayCount} UUID strings.

Available Catalog (JSON):
${JSON.stringify(catalog)}

Exclusion List (IDs):
${JSON.stringify(exclusionList)}

User Preferences:
${JSON.stringify(preferences)}

Output Requirement:
Return ONLY a valid JSON array of UUID strings. 
Example: ["uuid-1", "uuid-2", ...]
`;

  // 3. Call Gemini
  try {
    const model = getModel('gemini-1.5-pro', {
      generationConfig: {
        temperature: 0.4,
        responseMimeType: "application/json"
      }
    });

    console.log('   💭 Asking Gemini...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log('   ✅ Gemini responded');

    // 4. Parse & Validate
    const recipeIds = JSON.parse(text);

    if (!Array.isArray(recipeIds)) {
      throw new Error('AI did not return an array');
    }

    if (recipeIds.length !== dayCount) {
      console.warn(`   ⚠️ AI returned ${recipeIds.length} recipes, expected ${dayCount}`);
    }

    // Validate existence
    const validIds = recipeIds.filter(id => allRecipes.find(r => r.id === id));
    
    if (validIds.length < recipeIds.length) {
      console.warn(`   ⚠️ Filtered out ${recipeIds.length - validIds.length} invalid/hallucinated IDs`);
    }

    return validIds;

  } catch (error) {
    console.error('   ❌ AI Selection Failed:', error.message);
    throw error; // Let controller switch to fallback
  }
}
