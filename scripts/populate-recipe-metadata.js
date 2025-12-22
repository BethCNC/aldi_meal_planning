import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function categorizeRecipe(name, ingredients) {
  const lowerName = name.toLowerCase();
  const lowerIngs = ingredients.toLowerCase();
  const text = `${lowerName} ${lowerIngs}`;

  let protein = 'Other';
  let texture = 'Mixed';

  // Protein
  if (text.includes('chicken') || text.includes('poultry') || text.includes('turkey')) protein = 'Chicken';
  else if (text.includes('beef') || text.includes('steak') || text.includes('burger') || text.includes('meatball')) protein = 'Beef';
  else if (text.includes('pork') || text.includes('ham') || text.includes('sausage') || text.includes('bacon') || text.includes('chops')) protein = 'Pork';
  else if (text.includes('fish') || text.includes('shrimp') || text.includes('salmon') || text.includes('crab') || text.includes('seafood')) protein = 'Fish';
  else if (text.includes('tofu') || text.includes('bean') || text.includes('lentil') || text.includes('chickpea') || text.includes('vegetable') || text.includes('vegetarian')) protein = 'Vegetarian';

  // Texture
  if (text.includes('soup') || text.includes('stew') || text.includes('curry') || text.includes('mashed')) texture = 'Soft';
  else if (text.includes('salad') || text.includes('crunch') || text.includes('taco') || text.includes('fried') || text.includes('chip')) texture = 'Crunchy';
  else if (text.includes('steak') || text.includes('chop') || text.includes('roast')) texture = 'Chewy';
  
  // Default to Mixed if not distinct
  
  return { protein, texture };
}

async function populateMetadata() {
  console.log('🤖 Populating Recipe Metadata (Heuristic Mode)...');

  const { data: recipes, error } = await supabase
    .from('recipes')
    .select('id, name, ingredients:recipe_ingredients(ingredient_name)')
    .or('protein_category.is.null,texture_profile.is.null');

  if (error) {
    console.error('Error fetching recipes:', error);
    return;
  }

  if (recipes.length === 0) {
    console.log('✅ All recipes have metadata!');
    return;
  }

  console.log(`Found ${recipes.length} recipes to process.`);

  let updatedCount = 0;

  for (const recipe of recipes) {
    const ingredientsText = recipe.ingredients.map(i => i.ingredient_name).join(' ');
    const { protein, texture } = categorizeRecipe(recipe.name, ingredientsText);

    const { error: updateError } = await supabase
      .from('recipes')
      .update({
        protein_category: protein,
        texture_profile: texture,
        updated_at: new Date().toISOString()
      })
      .eq('id', recipe.id);

    if (updateError) {
      console.error(`❌ Failed to update ${recipe.name}:`, updateError);
    } else {
      console.log(`✅ ${recipe.name}: ${protein} | ${texture}`);
      updatedCount++;
    }
  }

  console.log(`\n🎉 Metadata population complete! Updated ${updatedCount} recipes.`);
}

populateMetadata();