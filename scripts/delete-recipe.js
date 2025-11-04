import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteRecipe() {
  console.log('\n🗑️  Deleting Recipe from Supabase\n');
  console.log('════════════════════════════════════════════════════════════\n');

  const recipeName = 'Spaghetti & Meatless Meatballs';

  // First, find the recipe
  const { data: recipe, error: findError } = await supabase
    .from('recipes')
    .select('id, name')
    .eq('name', recipeName)
    .single();

  if (findError || !recipe) {
    console.log(`❌ Recipe "${recipeName}" not found`);
    console.log(`   Error: ${findError?.message || 'Not found'}\n`);
    return;
  }

  console.log(`✅ Found recipe: ${recipe.name} (ID: ${recipe.id})\n`);

  // Delete recipe_ingredients first (if any exist - they shouldn't but good to be safe)
  console.log('🗑️  Deleting recipe_ingredients...');
  const { error: deleteIngredientsError } = await supabase
    .from('recipe_ingredients')
    .delete()
    .eq('recipe_id', recipe.id);

  if (deleteIngredientsError) {
    console.log(`   ⚠️  Note: ${deleteIngredientsError.message}`);
  } else {
    console.log('   ✅ Recipe ingredients deleted\n');
  }

  // Delete the recipe
  console.log('🗑️  Deleting recipe...');
  const { error: deleteError } = await supabase
    .from('recipes')
    .delete()
    .eq('id', recipe.id);

  if (deleteError) {
    console.log(`❌ Error deleting recipe: ${deleteError.message}\n`);
    return;
  }

  console.log(`✅ Successfully deleted "${recipeName}"\n`);
  console.log('════════════════════════════════════════════════════════════\n');
  console.log('✅ Recipe deletion complete!\n');
}

deleteRecipe();
