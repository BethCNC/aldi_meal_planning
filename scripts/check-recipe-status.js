import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecipeStatus() {
  console.log('\n📊 Recipe Status Report\n');
  console.log('════════════════════════════════════════════════════════════\n');

  // Get all recipes
  const { data: recipes } = await supabase
    .from('recipes')
    .select('id, name, servings, total_cost, cost_per_serving')
    .order('name');

  // Find recipes needing attention
  const needsWork = recipes.filter(r => {
    // Skip Leftovers
    if (r.name === 'Leftovers') return false;
    
    // Missing costs
    if (!r.total_cost || r.total_cost === 0 || !r.cost_per_serving || r.cost_per_serving === 0) {
      return true;
    }
    return false;
  });

  console.log(`Total recipes: ${recipes.length}`);
  console.log(`Recipes with costs: ${recipes.length - needsWork.length}`);
  console.log(`Recipes needing attention: ${needsWork.length}\n`);

  if (needsWork.length === 0) {
    console.log('✅ All recipes have costs!\n');
    return;
  }

  console.log('📋 Recipes Needing Attention:\n');

  for (const recipe of needsWork) {
    // Check ingredient links
    const { data: ingredients } = await supabase
      .from('recipe_ingredients')
      .select('id, calculated_cost')
      .eq('recipe_id', recipe.id);

    const ingredientCount = ingredients?.length || 0;
    const ingredientsWithCosts = ingredients?.filter(i => i.calculated_cost && i.calculated_cost > 0).length || 0;

    console.log(`📝 ${recipe.name}`);
    console.log(`   Servings: ${recipe.servings || 'MISSING'}`);
    console.log(`   Total Cost: ${recipe.total_cost || 'MISSING'}`);
    console.log(`   Cost per Serving: ${recipe.cost_per_serving || 'MISSING'}`);
    console.log(`   Ingredient Links: ${ingredientCount} (${ingredientsWithCosts} with costs)`);

    if (!recipe.servings || recipe.servings === 0) {
      console.log(`   ⚠️  ISSUE: Missing or zero servings - cannot calculate cost per serving`);
    } else if (ingredientCount === 0) {
      console.log(`   ⚠️  ISSUE: No ingredient links - need to add ingredients from Notion`);
    } else if (ingredientsWithCosts === 0) {
      console.log(`   ⚠️  ISSUE: Ingredients exist but have no costs - need to recalculate`);
    } else if (!recipe.total_cost || recipe.total_cost === 0) {
      console.log(`   ⚠️  ISSUE: Has ingredients with costs but total_cost not calculated - run recalculate script`);
    }

    console.log('');
  }

  console.log('\n💡 Summary:\n');
  
  const missingServings = needsWork.filter(r => !r.servings || r.servings === 0).length;
  
  // Count recipes with no ingredient links
  let missingIngredients = 0;
  for (const recipe of needsWork) {
    const { data } = await supabase
      .from('recipe_ingredients')
      .select('id')
      .eq('recipe_id', recipe.id)
      .limit(1);
    if (!data || data.length === 0) {
      missingIngredients++;
    }
  }

  console.log(`   Recipes missing servings: ${missingServings}`);
  console.log(`   Recipes missing ingredient links: ${missingIngredients}`);
  console.log('\n');
}

checkRecipeStatus();
