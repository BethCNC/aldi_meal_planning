import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.VITE_GOOGLE_API_KEY;

if (!apiKey) {
  console.warn('Missing GEMINI_API_KEY. AI features may not work.');
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export function getModel(modelName = 'gemini-1.5-pro', config = {}) {
  if (!genAI) {
    throw new Error('Gemini API key not found');
  }
  return genAI.getGenerativeModel({ 
    model: modelName,
    ...config
  });
}

/**
 * Suggest recipes from pantry items using Gemini
 * @param {Array} pantryItems - Array of pantry items
 * @param {Array} safeRecipes - Array of safe recipes the user has made before
 * @param {Object} constraints - Budget, servings, etc.
 * @returns {Promise<Array>} Array of suggested recipes
 */
export async function suggestRecipesFromPantry(pantryItems, safeRecipes, constraints) {
  if (!genAI) {
    console.warn('Gemini client not initialized. Returning empty suggestions.');
    return [];
  }

  const model = getModel('gemini-1.5-pro');

  const prompt = `You are a meal planning assistant for a user with ADHD/ARFID who needs familiar, safe recipes.

Pantry items available: ${pantryItems.map(i => i.ingredient?.item || i.item).join(', ')}

Safe recipes the user has made before: ${safeRecipes.map(r => r.name).join(', ')}

Constraints:
- Budget: $${constraints.budget} for the week
- Servings: ${constraints.servings} per meal
- Must use pantry items to reduce waste
- Protein rotation (no same protein 3x in a row)

Suggest 5 dinner recipes that:
1. Use at least 1-2 pantry items
2. Are from the safe recipe list (no new recipes)
3. Stay within budget
4. Rotate protein types

Return ONLY a valid JSON object with a "recipes" array: { "recipes": [{ "recipeName": "...", "pantryItemsUsed": ["..."], "estimatedCost": 0.00, "reasoning": "..." }] }`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from response (handle markdown code blocks if present)
    let jsonText = text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }
    
    const responseData = JSON.parse(jsonText);
    const suggestions = responseData.recipes || [];
    
    // Add verification flags
    return suggestions.map(r => ({
      ...r,
      is_verified: false,
      is_ai_generated: true,
      moderation_status: 'pending'
    }));
  } catch (error) {
    console.error('Gemini Suggestion Error:', error);
    return [];
  }
}
