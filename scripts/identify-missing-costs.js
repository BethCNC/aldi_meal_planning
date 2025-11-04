import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function identifyMissingCosts() {
  console.log('\n🔍 Identifying Recipes Missing Costs\n');
  console.log('════════════════════════════════════════════════════════════\n');

  try {
    // Get all recipes missing costs
    const { data: recipes, error } = await supabase
      .from('recipes')
      .select('id, name, servings, total_cost, cost_per_serving')
      .or('total_cost.is.null,cost_per_serving.is.null')
      .order('name');

    if (error) throw error;

    console.log(`📋 Found ${recipes.length} recipes missing costs:\n`);

    for (const recipe of recipes) {
      // Check if recipe has ingredient links
      const { data: ingredients, error: riError } = await supabase
        .from('recipe_ingredients')
        .select('id, ingredient_name, quantity, unit, calculated_cost, ingredient_id')
        .eq('recipe_id', recipe.id);

      if (riError) {
        console.log(`   ⚠️  ${recipe.name}`);
        console.log(`      Error checking ingredients: ${riError.message}\n`);
        continue;
      }

      const ingredientCount = ingredients?.length || 0;
      const ingredientsWithCosts = ingredients?.filter(ri => ri.calculated_cost !== null && ri.calculated_cost !== undefined).length || 0;
      const ingredientsWithoutCosts = ingredientCount - ingredientsWithCosts;

      if (ingredientCount === 0) {
        console.log(`   ❌ ${recipe.name}`);
        console.log(`      Issue: NO INGREDIENT LINKS`);
        console.log(`      Servings: ${recipe.servings || 'missing'}`);
        console.log(`      Action needed: Create recipe_ingredient links from ingredient text\n`);
      } else if (ingredientsWithoutCosts > 0) {
        console.log(`   ⚠️  ${recipe.name}`);
        console.log(`      Issue: ${ingredientsWithoutCosts}/${ingredientCount} ingredients missing calculated_cost`);
        console.log(`      Servings: ${recipe.servings || 'missing'}`);
        console.log(`      Action needed: Calculate costs for recipe_ingredients\n`);
        
        // Show which ingredients are missing costs
        const missing = ingredients.filter(ri => !ri.calculated_cost);
        if (missing.length <= 5) {
          missing.forEach(ri => {
            console.log(`         - ${ri.ingredient_name} (${ri.quantity} ${ri.unit || ''})`);
          });
        } else {
          missing.slice(0, 3).forEach(ri => {
            console.log(`         - ${ri.ingredient_name} (${ri.quantity} ${ri.unit || ''})`);
          });
          console.log(`         ... and ${missing.length - 3} more`);
        }
        console.log('');
      } else {
        console.log(`   ✅ ${recipe.name}`);
        console.log(`      Has ${ingredientCount} ingredients, all with costs`);
        console.log(`      But total_cost is ${recipe.total_cost || 'missing'}`);
        console.log(`      Action needed: Recalculate recipe cost (should work automatically)\n`);
      }
    }

    // Summary
    const noLinks = recipes.filter(r => {
      // This is simplified - we'd need to check each one
      return true; // Will be refined below
    }).length;

    console.log('\n════════════════════════════════════════════════════════════\n');
    console.log('💡 Quick Fix SQL:\n');
    console.log('Copy and run this in Supabase SQL Editor:\n');
    console.log('```sql');
    console.log('-- Find recipes missing costs');
    console.log('SELECT ');
    console.log('    r.id,');
    console.log('    r.name,');
    console.log('    r.servings,');
    console.log('    r.total_cost,');
    console.log('    COUNT(ri.id) as ingredient_count,');
    console.log('    COUNT(ri.id) FILTER (WHERE ri.calculated_cost IS NOT NULL) as ingredients_with_costs');
    console.log('FROM recipes r');
    console.log('LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id');
    console.log('WHERE r.total_cost IS NULL OR r.cost_per_serving IS NULL');
    console.log('GROUP BY r.id, r.name, r.servings, r.total_cost');
    console.log('ORDER BY r.name;');
    console.log('```\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

identifyMissingCosts();
