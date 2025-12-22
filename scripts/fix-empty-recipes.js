import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function findIngredientId(name) {
  // 1. Exact match
  const { data: exact } = await supabase.from('ingredients').select('id').ilike('item', name).limit(1).maybeSingle();
  if (exact) return exact.id;

  // 2. Simple fuzzy (contains)
  const { data: fuzzy } = await supabase.from('ingredients').select('id').ilike('item', `%${name}%`).limit(1).maybeSingle();
  if (fuzzy) return fuzzy.id;

  // 3. Try removing common descriptors
  const cleanName = name.replace(/^(fresh|frozen|dried|canned|jarred|large|small|medium|cup|lb|oz|tbs|tsp)\s+/i, '').trim();
  if (cleanName !== name) {
      const { data: cleaned } = await supabase.from('ingredients').select('id').ilike('item', `%${cleanName}%`).limit(1).maybeSingle();
      if (cleaned) return cleaned.id;
  }

  return null;
}

async function fixEmptyRecipes() {
  console.log('🔍 Finding recipes with 0 ingredients...');

  const { data: recipes, error } = await supabase
    .from('recipes')
    .select('id, name, instructions')
    .limit(100);

  if (error) throw error;

  const emptyRecipes = [];
  for (const r of recipes) {
    const { count } = await supabase.from('recipe_ingredients').select('*', { count: 'exact', head: true }).eq('recipe_id', r.id);
    if (count === 0) {
      emptyRecipes.push(r);
    }
  }

  console.log(`Found ${emptyRecipes.length} empty recipes.`);

  if (emptyRecipes.length === 0) return;

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  for (const recipe of emptyRecipes) {
    console.log(`
📝 Parsing ingredients for: ${recipe.name}`);
    
    const prompt = `
      Extract the ingredient list from the following recipe text.
      Return ONLY a JSON array of objects with:
      - quantity (number or null)
      - unit (string or null)
      - name (string, just the ingredient name)

      Recipe Text:
      ${recipe.instructions}
    `;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text().trim();
      
      if (text.startsWith('```json')) {
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      }

      const parsedIngredients = JSON.parse(text);
      console.log(`   Found ${parsedIngredients.length} ingredients in text.`);

      for (const ing of parsedIngredients) {
        const ingredientId = await findIngredientId(ing.name);
        
        if (ingredientId) {
          await supabase.from('recipe_ingredients').insert({
            recipe_id: recipe.id,
            ingredient_id: ingredientId,
            quantity: ing.quantity,
            unit: ing.unit,
            ingredient_name: ing.name,
            raw_line: `${ing.quantity || ''} ${ing.unit || ''} ${ing.name}`.trim()
          });
          console.log(`   ✅ Linked: ${ing.name}`);
        } else {
          console.log(`   ❌ Could not match: ${ing.name}`);
        }
      }
    } catch (err) {
      console.error(`   Error processing ${recipe.name}:`, err.message);
    }
  }

  console.log('\n🎉 Finished fixing empty recipes!');
}

fixEmptyRecipes();
