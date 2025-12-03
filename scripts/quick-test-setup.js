/**
 * Quick test script to verify database has recipes ready for meal planning
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('   Need: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSetup() {
  console.log('\n🧪 Quick Test Setup Check\n');
  console.log('════════════════════════════════════════════════════════════\n');

  // Check recipes
  const { data: recipes, error: recipesError } = await supabase
    .from('recipes')
    .select('id, name, total_cost, cost_per_serving, category')
    .not('total_cost', 'is', null)
    .not('cost_per_serving', 'is', null)
    .gt('total_cost', 0)
    .gt('cost_per_serving', 0);

  if (recipesError) {
    console.error('❌ Error fetching recipes:', recipesError.message);
    return;
  }

  // Filter out non-dinner categories
  const invalidCategories = ['Dessert', 'Breakfast', 'Snack', 'Side', 'Beverage'];
  const validRecipes = recipes?.filter(r => 
    !invalidCategories.includes(r.category) && r.name !== 'Leftovers'
  ) || [];

  console.log(`📊 Recipes available: ${validRecipes.length}`);
  
  if (validRecipes.length === 0) {
    console.log('\n❌ No recipes found with valid costs!');
    console.log('   Please add recipes with costs before generating meal plans.\n');
    return;
  }

  if (validRecipes.length < 4) {
    console.log(`\n⚠️  Only ${validRecipes.length} recipes available (need at least 4 for meal plan)`);
  } else {
    console.log(`✅ ${validRecipes.length} recipes ready for meal planning\n`);
  }

  // Show sample recipes
  console.log('📋 Sample recipes:');
  validRecipes.slice(0, 5).forEach(r => {
    console.log(`   • ${r.name} (${r.category}) - $${r.total_cost?.toFixed(2)} ($${r.cost_per_serving?.toFixed(2)}/serving)`);
  });
  if (validRecipes.length > 5) {
    console.log(`   ... and ${validRecipes.length - 5} more\n`);
  }

  // Check ingredients
  const { data: ingredients, error: ingredientsError } = await supabase
    .from('ingredients')
    .select('id, name')
    .limit(10);

  if (ingredientsError) {
    console.error('❌ Error fetching ingredients:', ingredientsError.message);
    return;
  }

  console.log(`📦 Ingredients in database: ${ingredients?.length || 0}+`);
  
  // Check recipe-ingredient links
  const { data: recipeIngredients } = await supabase
    .from('recipe_ingredients')
    .select('recipe_id')
    .limit(100);

  const uniqueRecipeIds = new Set(recipeIngredients?.map(ri => ri.recipe_id) || []);
  console.log(`🔗 Recipes with ingredient links: ${uniqueRecipeIds.size}\n`);

  if (validRecipes.length >= 4) {
    console.log('✅ Ready to test meal planning!\n');
    console.log('📝 Next steps:');
    console.log('   1. Open http://localhost:5173/weekly-plan');
    console.log('   2. Click "Generate Meal Plan"');
    console.log('   3. Then go to http://localhost:5173/grocery-list');
    console.log('   4. Click "Generate Grocery List"\n');
  }
}

checkSetup().catch(console.error);

