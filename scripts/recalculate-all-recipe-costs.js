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

async function recalculateAllCosts() {
  console.log('\n💰 Recalculating ALL Recipe Costs\n');
  console.log('════════════════════════════════════════════════════════════\n');

  try {
    // Get all recipes
    const { data: recipes, error: recipesError } = await supabase
      .from('recipes')
      .select('*')
      .order('name');

    if (recipesError) throw recipesError;

    console.log(`📋 Found ${recipes.length} recipes to process\n`);

    let updated = 0;
    let skipped = 0;
    const results = [];

    for (const recipe of recipes) {
      // Get all recipe ingredients for this recipe
      const { data: recipeIngredients, error: riError } = await supabase
        .from('recipe_ingredients')
        .select('*, ingredients(*)')
        .eq('recipe_id', recipe.id);

      if (riError) {
        console.log(`   ⚠️  Error fetching ingredients for ${recipe.name}: ${riError.message}`);
        skipped++;
        continue;
      }

      if (!recipeIngredients || recipeIngredients.length === 0) {
        console.log(`   ⚠️  No ingredients found for: ${recipe.name}`);
        results.push({
          name: recipe.name,
          status: 'no_ingredients',
          total_cost: null,
          cost_per_serving: null
        });
        skipped++;
        continue;
      }

      // Calculate total cost from recipe_ingredients
      let totalCost = 0;
      let ingredientsWithCosts = 0;

      for (const ri of recipeIngredients) {
        if (ri.calculated_cost !== null && ri.calculated_cost !== undefined) {
          totalCost += ri.calculated_cost;
          ingredientsWithCosts++;
        } else if (ri.ingredients && ri.ingredients.price_per_base_unit) {
          // Calculate cost if not already calculated
          const ingredient = ri.ingredients;
          const quantity = ri.quantity || 0;
          
          // Simple calculation: quantity * price_per_base_unit
          // (assumes unit matches base_unit - proper conversion would be better)
          if (quantity > 0) {
            const cost = quantity * ingredient.price_per_base_unit;
            totalCost += cost;
            ingredientsWithCosts++;

            // Update the recipe_ingredient with calculated cost
            await supabase
              .from('recipe_ingredients')
              .update({ calculated_cost: Math.round(cost * 100) / 100 })
              .eq('id', ri.id);
          }
        }
      }

      if (totalCost === 0) {
        console.log(`   ⚠️  No costs calculated for: ${recipe.name} (${recipeIngredients.length} ingredients, ${ingredientsWithCosts} with costs)`);
        results.push({
          name: recipe.name,
          status: 'no_costs',
          total_cost: null,
          cost_per_serving: null
        });
        skipped++;
        continue;
      }

      // Calculate cost per serving
      const servings = recipe.servings || 0;
      const costPerServing = servings > 0 
        ? Math.round((totalCost / servings) * 100) / 100
        : 0;

      // Update recipe
      const { error: updateError } = await supabase
        .from('recipes')
        .update({
          total_cost: Math.round(totalCost * 100) / 100,
          cost_per_serving: costPerServing,
          updated_at: new Date().toISOString()
        })
        .eq('id', recipe.id);

      if (updateError) {
        console.log(`   ❌ Error updating ${recipe.name}: ${updateError.message}`);
        skipped++;
      } else {
        console.log(`   ✅ ${recipe.name}: $${totalCost.toFixed(2)} total, $${costPerServing.toFixed(2)}/serving (${ingredientsWithCosts}/${recipeIngredients.length} ingredients)`);
        updated++;
        results.push({
          name: recipe.name,
          status: 'updated',
          total_cost: totalCost,
          cost_per_serving: costPerServing,
          ingredient_count: recipeIngredients.length,
          ingredients_with_costs: ingredientsWithCosts
        });
      }
    }

    // Summary
    console.log('\n════════════════════════════════════════════════════════════');
    console.log('\n📊 Summary:\n');
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ⚠️  Skipped: ${skipped}`);
    console.log(`   📋 Total: ${recipes.length}`);

    const updatedRecipes = results.filter(r => r.status === 'updated');
    if (updatedRecipes.length > 0) {
      const avgCost = updatedRecipes.reduce((sum, r) => sum + r.total_cost, 0) / updatedRecipes.length;
      const avgPerServing = updatedRecipes.reduce((sum, r) => sum + (r.cost_per_serving || 0), 0) / updatedRecipes.length;
      
      console.log(`\n   💵 Average recipe cost: $${avgCost.toFixed(2)}`);
      console.log(`   💵 Average per serving: $${avgPerServing.toFixed(2)}`);
    }

    // List recipes that still need work
    const needsWork = results.filter(r => r.status !== 'updated');
    if (needsWork.length > 0) {
      console.log(`\n⚠️  Recipes needing attention (${needsWork.length}):\n`);
      needsWork.forEach(r => {
        console.log(`   • ${r.name} - ${r.status}`);
      });
    }

    console.log('\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

recalculateAllCosts();
