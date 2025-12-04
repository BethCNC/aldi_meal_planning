import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.warn('Missing VITE_GEMINI_API_KEY. AI features may not work.');
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export default genAI;

export async function suggestRecipesFromPantry(pantryItems, safeRecipes, constraints) {
  if (!genAI) {
    console.warn('Gemini client not initialized. Returning empty suggestions.');
    return [];
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

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
    return responseData.recipes || [];
  } catch (error) {
    console.error('Gemini Suggestion Error:', error);
    return [];
  }
}

