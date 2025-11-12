import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // For client-side usage
});

export async function suggestRecipesFromPantry(pantryItems, safeRecipes, constraints) {
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

Return as JSON object with a "recipes" array: { "recipes": [{ "recipeName": "...", "pantryItemsUsed": ["..."], "estimatedCost": 0.00, "reasoning": "..." }] }`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.7
  });
  
  const response = JSON.parse(completion.choices[0].message.content);
  return response.recipes || [];
}
