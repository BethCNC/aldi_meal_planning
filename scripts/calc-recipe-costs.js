/**
 * Recipe Cost Calculator
 * 
 * Automatically calculates recipe costs from linked ingredients
 * Updates Cost ($) and Cost per Serving ($) in Notion
 * 
 * Usage:
 *   node scripts/calc-recipe-costs.js              # All recipes
 *   node scripts/calc-recipe-costs.js --recipe "Taco Pasta"  # Single recipe
 */

import {queryRecipes, updateRecipeCost, linkRecipeToIngredients} from '../src/notion/notionClient.js';
import notion from '../src/notion/notionClient.js';

/**
 * Get ingredient cost from Notion page
 */
async function getIngredientCost(ingredientId) {
  try {
    const ingredient = await notion.pages.retrieve({page_id: ingredientId});
    // Your database uses 'Price per Package ($)' not 'Cost'
    return ingredient.properties['Price per Package ($)']?.number || 0;
  } catch (error) {
    console.error(`  ⚠️  Error fetching ingredient ${ingredientId}:`, error.message);
    return 0;
  }
}

/**
 * Calculate recipe cost from linked ingredients
 */
async function calculateRecipeCost(recipe) {
  // Your database uses 'Aldi Ingredients' relation
  const ingredientRelations = recipe.properties['Aldi Ingredients']?.relation || [];
  
  if (ingredientRelations.length === 0) {
    return {totalCost: null, costPerServing: null, ingredientCount: 0};
  }
  
  let totalCost = 0;
  
  for (const rel of ingredientRelations) {
    const cost = await getIngredientCost(rel.id);
    totalCost += cost;
  }
  
  const servings = recipe.properties['Servings']?.number || null;
  const costPerServing = servings ? totalCost / servings : null;
  
  return {
    totalCost,
    costPerServing,
    ingredientCount: ingredientRelations.length
  };
}

/**
 * Update recipe cost in Notion
 */
async function updateRecipe(recipe, costs) {
  try {
    await updateRecipeCost(recipe.id, costs.totalCost, costs.costPerServing);
    return true;
  } catch (error) {
    console.error(`  ❌ Failed to update:`, error.message);
    return false;
  }
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    recipeName: null,
    dryRun: false
  };
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--recipe' && args[i + 1]) {
      options.recipeName = args[i + 1];
      i++;
    } else if (args[i] === '--dry-run') {
      options.dryRun = true;
    }
  }
  
  return options;
}

/**
 * Main function
 */
async function main() {
  const options = parseArgs();
  
  console.log('💰 Recipe Cost Calculator\n');
  
  if (options.dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }
  
  try {
    let recipes;
    
    if (options.recipeName) {
      // Find specific recipe
      const {findRecipe} = await import('../src/notion/notionClient.js');
      const recipe = await findRecipe(options.recipeName);
      
      if (!recipe) {
        console.log(`❌ Recipe "${options.recipeName}" not found`);
        process.exit(1);
      }
      
      recipes = [recipe];
      console.log(`📝 Calculating cost for: ${options.recipeName}\n`);
    } else {
      // Get all recipes
      recipes = await queryRecipes();
      console.log(`📝 Found ${recipes.length} recipes to process\n`);
    }
    
    const results = {
      updated: 0,
      skipped: 0,
      errors: 0,
      totalCost: 0
    };
    
    for (const recipe of recipes) {
      const recipeName = recipe.properties['Recipe Name']?.title?.[0]?.plain_text || 'Unknown';
      const servings = recipe.properties['Servings']?.number || null;
      // Your database uses 'Recipe Cost' field
      const currentCost = recipe.properties['Recipe Cost']?.number || 
                         recipe.properties['Cost ($)']?.number;
      const currentCostPerServing = recipe.properties['Cost per Serving ($)']?.number;
      
      console.log(`🔍 ${recipeName}`);
      console.log(`   Servings: ${servings || 'N/A'}`);
      
      // Calculate new cost
      const costs = await calculateRecipeCost(recipe);
      
      if (costs.totalCost === null) {
        console.log(`   ⚠️  No ingredients linked - skipping`);
        results.skipped++;
        continue;
      }
      
      console.log(`   Current: $${currentCost?.toFixed(2) || 'N/A'} total, $${currentCostPerServing?.toFixed(2) || 'N/A'}/serving`);
      console.log(`   Calculated: $${costs.totalCost.toFixed(2)} total, $${costs.costPerServing?.toFixed(2) || 'N/A'}/serving (${costs.ingredientCount} ingredients)`);
      
      // Check if update needed
      const needsUpdate = (
        currentCost !== costs.totalCost ||
        (costs.costPerServing && currentCostPerServing !== costs.costPerServing)
      );
      
      if (needsUpdate) {
        if (!options.dryRun) {
          const updated = await updateRecipe(recipe, costs);
          if (updated) {
            console.log(`   ✅ Updated in Notion`);
            results.updated++;
            results.totalCost += costs.totalCost;
          } else {
            results.errors++;
          }
        } else {
          console.log(`   🔍 Would update (dry run)`);
          results.updated++;
          results.totalCost += costs.totalCost;
        }
      } else {
        console.log(`   ✓ Already up to date`);
        results.skipped++;
      }
      
      console.log('');
    }
    
    console.log('='.repeat(50));
    console.log('\n📊 Summary:');
    console.log(`   Updated: ${results.updated}`);
    console.log(`   Skipped: ${results.skipped}`);
    console.log(`   Errors: ${results.errors}`);
    
    if (results.updated > 0 && !options.recipeName) {
      const avgCost = results.updated > 0 ? results.totalCost / results.updated : 0;
      console.log(`   Average recipe cost: $${avgCost.toFixed(2)}`);
    }
    
    console.log('\n✅ Done!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
