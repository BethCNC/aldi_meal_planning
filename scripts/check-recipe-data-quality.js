/**
 * Check Recipe Data Quality
 * 
 * Verifies that recipes have costs and ingredient links
 * 
 * Usage: node scripts/check-recipe-data-quality.js
 */

import dotenv from 'dotenv';
import {createClient} from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase environment variables not configured');
  console.error('   Add SUPABASE_URL and SUPABASE_KEY to your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecipeDataQuality() {
  console.log('🔍 Checking Recipe Data Quality...\n');

  try {
    // Get all recipes
    const {data: recipes, error: recipesError} = await supabase
      .from('recipes')
      .select('id, name, total_cost, cost_per_serving, servings');
    
    if (recipesError) {
      throw new Error(`Failed to load recipes: ${recipesError.message}`);
    }
    
    console.log(`📊 Total Recipes: ${recipes.length}\n`);
    
    // Check costs
    const recipesWithCosts = recipes.filter(r => r.total_cost && r.total_cost > 0);
    const recipesWithCostPerServing = recipes.filter(r => r.cost_per_serving && r.cost_per_serving > 0);
    const recipesWithoutCosts = recipes.filter(r => !r.total_cost || r.total_cost === 0);
    
    console.log('💰 Cost Status:');
    console.log(`   ✅ Recipes with total_cost: ${recipesWithCosts.length}`);
    console.log(`   ✅ Recipes with cost_per_serving: ${recipesWithCostPerServing.length}`);
    console.log(`   ❌ Recipes missing costs: ${recipesWithoutCosts.length}`);
    
    if (recipesWithoutCosts.length > 0) {
      console.log('\n   Recipes missing costs:');
      recipesWithoutCosts.forEach(r => {
        console.log(`     - ${r.name} (ID: ${r.id})`);
      });
    }
    
    // Check ingredient links
    console.log('\n🔗 Ingredient Links:');
    
    const recipesWithIngredients = [];
    const recipesWithoutIngredients = [];
    
    for (const recipe of recipes) {
      const {count, error} = await supabase
        .from('recipe_ingredients')
        .select('*', {count: 'exact', head: true})
        .eq('recipe_id', recipe.id);
      
      if (error) {
        console.error(`   Error checking ${recipe.name}:`, error.message);
        continue;
      }
      
      if (count > 0) {
        recipesWithIngredients.push({...recipe, ingredientCount: count});
      } else {
        recipesWithoutIngredients.push(recipe);
      }
    }
    
    console.log(`   ✅ Recipes with ingredients: ${recipesWithIngredients.length}`);
    console.log(`   ❌ Recipes without ingredients: ${recipesWithoutIngredients.length}`);
    
    if (recipesWithoutIngredients.length > 0) {
      console.log('\n   Recipes without ingredients:');
      recipesWithoutIngredients.forEach(r => {
        console.log(`     - ${r.name} (ID: ${r.id})`);
      });
    }
    
    // Summary
    console.log('\n📋 Summary:');
    const readyForPlanning = recipes.filter(r => 
      r.total_cost > 0 && 
      r.cost_per_serving > 0 &&
      recipesWithIngredients.find(ri => ri.id === r.id)
    );
    
    console.log(`   ✅ Recipes ready for meal planning: ${readyForPlanning.length}`);
    console.log(`   ⚠️  Recipes needing attention: ${recipes.length - readyForPlanning.length}`);
    
    if (readyForPlanning.length < 10) {
      console.log('\n   ⚠️  WARNING: Less than 10 recipes are ready for planning!');
      console.log('      Consider running cost calculation and linking ingredients.');
    }
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    if (recipesWithoutCosts.length > 0) {
      console.log(`   - Run: npm run calc:costs:v3 -- --update`);
    }
    if (recipesWithoutIngredients.length > 0) {
      console.log(`   - Link ingredients using: node scripts/create-missing-ingredient-links.js`);
    }
    if (recipesWithoutCosts.length === 0 && recipesWithoutIngredients.length === 0) {
      console.log('   ✅ All recipes are ready! You can generate meal plans.');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

checkRecipeDataQuality();

