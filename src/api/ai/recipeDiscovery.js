import { supabase } from '../../lib/supabase';

/**
 * Discover new recipes based on a query or current trends.
 * Calls backend API to securely use GPT-4o.
 */
export async function discoverNewRecipes(query, count = 3) {
  // Get auth token
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    throw new Error('User must be authenticated to use AI features');
  }

  // Call backend API
  const apiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_SUPABASE_URL?.replace('/rest/v1', '') || '';
  const backendUrl = apiUrl ? `${apiUrl}/api/ai/discover` : '/api/ai/discover';

  try {
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ query, count })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API error: ${response.statusText}`);
    }

    const { recipes } = await response.json();
    return recipes || [];
  } catch (error) {
    console.error('AI Recipe Discovery Failed:', error);
    throw new Error(error.message || 'Failed to discover recipes. Please try again.');
  }
}

/**
 * Parse raw text (e.g. from a weekly ad) to identify on-sale ingredients.
 */
export async function parseSalesText(rawText) {
  const prompt = `
    Extract a list of grocery ingredients from this raw text (which may be from a weekly ad or flyer).
    Map them to standard ingredient names.
    
    Raw Text:
    "${rawText.substring(0, 1000)}..."
    
    Return JSON:
    {
      "sales": [
        { "item": "Standardized Name", "original_text": "Raw text match", "category": "Produce/Meat/etc" }
      ]
    }
  `;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: prompt }],
      response_format: { type: 'json_object' }
    });

    return JSON.parse(completion.choices[0].message.content).sales || [];
  } catch (error) {
    console.error('Sales Parsing Failed:', error);
    return [];
  }
}

/**
 * Save a discovered recipe to Supabase
 */
export async function saveDiscoveredRecipe(recipe) {
  const { data: savedRecipe, error: recipeError } = await supabase
    .from('recipes')
    .insert({
      name: recipe.name,
      category: recipe.category,
      servings: recipe.servings,
      instructions: recipe.instructions.join('\n'),
      total_cost: recipe.estimated_total_cost,
      cost_per_serving: recipe.estimated_total_cost / recipe.servings,
      source_url: 'AI Generated',
      tags: ['AI Discovered']
    })
    .select()
    .single();

  if (recipeError) throw recipeError;
  return savedRecipe;
}

