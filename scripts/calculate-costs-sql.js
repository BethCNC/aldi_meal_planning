import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('   Need: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function calculateRecipeCosts() {
  console.log('\n💰 Calculating Recipe Costs\n');
  console.log('════════════════════════════════════════════════════════════\n');

  try {
    // Get all recipes with their ingredient costs
    const { data: recipes, error: fetchError } = await supabase
      .from('recipe_ingredients')
      .select(`
        recipe_id,
        calculated_cost,
        recipes!inner (
          id,
          name,
          servings
        )
      `);

    if (fetchError) {
      throw fetchError;
    }

    if (!recipes || recipes.length === 0) {
      console.log('⚠️  No recipe ingredients found with costs');
      return;
    }

    // Group by recipe and sum costs
    const recipeCosts = {};
    
    recipes.forEach((row) => {
      const recipeId = row.recipe_id;
      const cost = row.calculated_cost || 0;
      
      if (!recipeCosts[recipeId]) {
        recipeCosts[recipeId] = {
          id: recipeId,
          name: row.recipes.name,
          servings: row.recipes.servings,
          totalCost: 0,
          ingredientCount: 0
        };
      }
      
      recipeCosts[recipeId].totalCost += cost;
      recipeCosts[recipeId].ingredientCount++;
    });

    // Calculate cost per serving and update recipes
    console.log('📊 Calculated Costs:\n');
    
    const updates = [];
    
    for (const recipeId in recipeCosts) {
      const recipe = recipeCosts[recipeId];
      const costPerServing = recipe.servings > 0 
        ? recipe.totalCost / recipe.servings 
        : 0;

      updates.push({
        id: recipeId,
        total_cost: Math.round(recipe.totalCost * 100) / 100,
        cost_per_serving: Math.round(costPerServing * 100) / 100
      });

      console.log(`   ${recipe.name}`);
      console.log(`      Total: $${recipe.totalCost.toFixed(2)}`);
      console.log(`      Per Serving: $${costPerServing.toFixed(2)}`);
      console.log(`      Ingredients: ${recipe.ingredientCount}\n`);
    }

    // Update recipes in batches
    console.log('💾 Updating recipes in Supabase...\n');
    
    let updated = 0;
    const batchSize = 10;
    
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      
      for (const update of batch) {
        const { error } = await supabase
          .from('recipes')
          .update({
            total_cost: update.total_cost,
            cost_per_serving: update.cost_per_serving,
            updated_at: new Date().toISOString()
          })
          .eq('id', update.id);

        if (error) {
          console.error(`   ❌ Error updating ${update.id}:`, error.message);
        } else {
          updated++;
          process.stdout.write(`   ✅ Updated ${updated}/${updates.length}\r`);
        }
      }
    }
    
    console.log(`\n\n✅ Updated ${updated} recipes with calculated costs`);
    
    // Show summary
    const totalRecipes = Object.keys(recipeCosts).length;
    const totalCost = Object.values(recipeCosts).reduce((sum, r) => sum + r.totalCost, 0);
    const avgCost = totalCost / totalRecipes;
    
    console.log('\n📈 Summary:');
    console.log(`   Recipes calculated: ${totalRecipes}`);
    console.log(`   Average cost per recipe: $${avgCost.toFixed(2)}`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

calculateRecipeCosts();
