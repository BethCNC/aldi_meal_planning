import dotenv from 'dotenv';
import {createClient} from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testGroceryList() {
  console.log('🧪 Testing Grocery List Generation\n');
  
  // Get week start date
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day;
  const sunday = new Date(today.setDate(diff));
  sunday.setHours(0, 0, 0, 0);
  const weekStartDate = sunday.toISOString().split('T')[0];
  
  console.log(`📅 Week Start Date: ${weekStartDate}\n`);
  
  // Check meal plan exists
  console.log('1. Checking meal plan...');
  const {data: mealPlan, error: mealPlanError} = await supabase
    .from('meal_plans')
    .select('recipe_id')
    .eq('week_start_date', weekStartDate)
    .not('recipe_id', 'is', null);
  
  if (mealPlanError) {
    console.error(`❌ Error: ${mealPlanError.message}`);
    return;
  }
  
  if (!mealPlan || mealPlan.length === 0) {
    console.log('❌ No meal plan found for this week');
    console.log('   Run: node scripts/generate-first-week-meal-plan.js');
    return;
  }
  
  console.log(`   ✅ Found ${mealPlan.length} meals\n`);
  
  // Get recipe IDs
  const recipeIds = mealPlan.map(day => day.recipe_id).filter(Boolean);
  console.log(`2. Recipe IDs: ${recipeIds.join(', ')}\n`);
  
  // Get ingredients
  console.log('3. Loading recipe ingredients...');
  const {data: allIngredients, error: ingredientsError} = await supabase
    .from('recipe_ingredients')
    .select(`
      *,
      ingredient:ingredients(*)
    `)
    .in('recipe_id', recipeIds);
  
  if (ingredientsError) {
    console.error(`❌ Error: ${ingredientsError.message}`);
    return;
  }
  
  if (!allIngredients || allIngredients.length === 0) {
    console.log('❌ No ingredients found');
    return;
  }
  
  console.log(`   ✅ Found ${allIngredients.length} ingredient entries\n`);
  
  // Check categories
  console.log('4. Checking ingredient categories...');
  const categories = [...new Set(allIngredients.map(i => i.ingredient?.category).filter(Boolean))];
  console.log(`   Categories found: ${categories.join(', ')}\n`);
  
  // Check for missing fields
  console.log('5. Checking ingredient fields...');
  const sampleIngredient = allIngredients[0]?.ingredient;
  if (sampleIngredient) {
    console.log('   Sample ingredient fields:');
    console.log(`     - category: ${sampleIngredient.category || 'MISSING'}`);
    console.log(`     - package_size: ${sampleIngredient.package_size || 'MISSING'}`);
    console.log(`     - price_per_package: ${sampleIngredient.price_per_package || 'MISSING'}`);
    console.log(`     - price_per_base_unit: ${sampleIngredient.price_per_base_unit || 'MISSING'}`);
  }
  
  console.log('\n✅ Test complete!');
}

testGroceryList().catch(console.error);

