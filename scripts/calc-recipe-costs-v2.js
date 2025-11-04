/**
 * Recipe Cost Calculator V2
 * 
 * Improved version that:
 * 1. Uses 'Aldi Ingredients' relation (not 'Database Ingredients ')
 * 2. Uses 'Price per Package ($)' field
 * 3. Parses quantities from Recipe Ingredients text
 * 4. Calculates costs based on actual quantities used
 * 
 * Usage:
 *   node scripts/calc-recipe-costs-v2.js              # All recipes
 *   node scripts/calc-recipe-costs-v2.js --recipe "Taco Pasta"  # Single recipe
 */

import {queryRecipes, updateRecipeCost} from '../src/notion/notionClient.js';
import notion from '../src/notion/notionClient.js';

/**
 * Parse ingredient line to extract quantity and name
 * Examples: "1 lb ground beef", "2 cups rice", "1 onion"
 */
function parseIngredientLine(line) {
  const cleaned = line.trim().toLowerCase();
  
  // Pattern: quantity unit name or just quantity name or just name
  const patterns = [
    /^(\d+\.?\d*)\s*(lb|lbs|oz|cup|cups|tbsp|tsp|can|cans|packet|packets|bag|bags|each|piece|pieces|clove|cloves)\s+(.+)$/,
    /^(\d+\.?\d*)\s+(.+)$/, // Just quantity and name
    /^(.+)$/ // Just name
  ];
  
  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      return {
        quantity: match[1] ? parseFloat(match[1]) : 1,
        unit: match[2] || null,
        name: (match[3] || match[2] || match[1]).trim()
      };
    }
  }
  
  return {quantity: 1, unit: null, name: cleaned};
}

/**
 * Match parsed ingredient to database ingredient (fuzzy matching)
 */
function matchIngredientName(parsedName, dbName) {
  const normalize = (str) => str.toLowerCase()
    .replace(/^(fresh|dried|frozen|canned|jarred|bottled|ground|sliced|diced|chopped)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  const parsedNorm = normalize(parsedName);
  const dbNorm = normalize(dbName);
  
  // Exact match
  if (parsedNorm === dbNorm) return true;
  
  // Contains match
  if (parsedNorm.includes(dbNorm) || dbNorm.includes(parsedNorm)) return true;
  
  // Word match (if key words match)
  const parsedWords = parsedNorm.split(/\s+/);
  const dbWords = dbNorm.split(/\s+/);
  const matchingWords = parsedWords.filter(w => dbWords.includes(w));
  
  return matchingWords.length >= Math.min(parsedWords.length, dbWords.length) * 0.6;
}

/**
 * Convert units to base unit for comparison
 * Simple conversions - can be expanded
 */
function convertToBaseUnit(quantity, unit, targetUnit) {
  if (!unit || !targetUnit) return quantity;
  
  const unitLower = unit.toLowerCase();
  const targetLower = targetUnit.toLowerCase();
  
  // If same base, return quantity
  if (unitLower === targetLower) return quantity;
  
  // Conversions (simplified)
  const conversions = {
    'lb': {'oz': 16, 'lbs': 1},
    'lbs': {'oz': 16, 'lb': 1},
    'oz': {'lb': 0.0625, 'lbs': 0.0625},
    'cup': {'oz': 8, 'tbsp': 16, 'tsp': 48},
    'cups': {'oz': 8, 'tbsp': 16, 'tsp': 48},
    'tbsp': {'cup': 0.0625, 'tsp': 3},
    'tsp': {'cup': 0.0208, 'tbsp': 0.333}
  };
  
  if (conversions[unitLower] && conversions[unitLower][targetLower]) {
    return quantity * conversions[unitLower][targetLower];
  }
  
  // If can't convert, assume 1:1 (not perfect but better than nothing)
  return quantity;
}

/**
 * Get ingredient cost and package info
 */
async function getIngredientInfo(ingredientId) {
  try {
    const ingredient = await notion.pages.retrieve({page_id: ingredientId});
    const name = ingredient.properties['Item']?.title?.[0]?.plain_text || 'Unknown';
    const pricePerPackage = ingredient.properties['Price per Package ($)']?.number;
    const packageSize = ingredient.properties['Package Size']?.number;
    const packageUnit = ingredient.properties['Package Unit']?.select?.name;
    const baseUnit = ingredient.properties['Base Unit']?.select?.name;
    
    return {
      id: ingredientId,
      name,
      pricePerPackage: pricePerPackage || 0,
      packageSize: packageSize || 1,
      packageUnit: packageUnit || 'each',
      baseUnit: baseUnit || 'each'
    };
  } catch (error) {
    console.error(`  ⚠️  Error fetching ingredient ${ingredientId}:`, error.message);
    return null;
  }
}

/**
 * Calculate cost for a single ingredient based on quantity needed
 */
function calculateIngredientCost(ingredientInfo, quantityNeeded, unitNeeded) {
  if (!ingredientInfo || !ingredientInfo.pricePerPackage) {
    return 0;
  }
  
  const {pricePerPackage, packageSize, packageUnit} = ingredientInfo;
  
  // If no quantity specified, assume 1 package
  if (!quantityNeeded || quantityNeeded === 1 && !unitNeeded) {
    return pricePerPackage;
  }
  
  // Try to match units and calculate
  // Convert both to common unit if possible
  const convertedNeeded = convertToBaseUnit(quantityNeeded, unitNeeded, packageUnit);
  
  // Calculate how many packages needed
  const packagesNeeded = convertedNeeded / packageSize;
  
  // Round up (can't buy partial packages)
  const packagesToBuy = Math.ceil(packagesNeeded);
  
  // Cost is price per package × packages needed
  return pricePerPackage * packagesToBuy;
}

/**
 * Parse Recipe Ingredients text and match to linked ingredients
 */
async function parseAndMatchIngredients(recipeIngredientsText, linkedIngredientIds) {
  if (!recipeIngredientsText || !linkedIngredientIds.length) {
    return [];
  }
  
  // Parse ingredient lines
  const lines = recipeIngredientsText.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  const matched = [];
  
  // Get all linked ingredients
  const linkedIngredients = [];
  for (const id of linkedIngredientIds) {
    const info = await getIngredientInfo(id);
    if (info) linkedIngredients.push(info);
  }
  
  // Match each parsed line to a linked ingredient
  for (const line of lines) {
    const parsed = parseIngredientLine(line);
    
    // Find best matching ingredient
    let bestMatch = null;
    let bestScore = 0;
    
    for (const linked of linkedIngredients) {
      if (matchIngredientName(parsed.name, linked.name)) {
        const score = parsed.name.split(/\s+/).filter(w => 
          linked.name.toLowerCase().includes(w)
        ).length;
        
        if (score > bestScore) {
          bestScore = score;
          bestMatch = linked;
        }
      }
    }
    
    if (bestMatch) {
      matched.push({
        parsed,
        ingredient: bestMatch,
        cost: calculateIngredientCost(bestMatch, parsed.quantity, parsed.unit)
      });
    } else {
      // No match found - will need manual entry
      matched.push({
        parsed,
        ingredient: null,
        cost: 0
      });
    }
  }
  
  return matched;
}

/**
 * Calculate recipe cost from ingredients
 */
async function calculateRecipeCostV2(recipe) {
  // Get linked ingredients (using correct property name)
  const ingredientRelations = recipe.properties['Aldi Ingredients']?.relation || [];
  
  if (ingredientRelations.length === 0) {
    return {totalCost: null, costPerServing: null, ingredientCount: 0, details: []};
  }
  
  const linkedIngredientIds = ingredientRelations.map(rel => rel.id);
  
  // Get Recipe Ingredients text
  const recipeIngredientsText = recipe.properties['Recipe Ingredients']?.rich_text
    ?.map(rt => rt.plain_text).join('\n') || '';
  
  // Parse and match
  const matched = await parseAndMatchIngredients(recipeIngredientsText, linkedIngredientIds);
  
  // Calculate total cost
  let totalCost = 0;
  const details = [];
  
  for (const match of matched) {
    if (match.ingredient) {
      totalCost += match.cost;
      details.push({
        name: match.ingredient.name,
        quantity: match.parsed.quantity,
        unit: match.parsed.unit,
        cost: match.cost
      });
    }
  }
  
  const servings = recipe.properties['Servings']?.number || null;
  const costPerServing = servings ? totalCost / servings : null;
  
  return {
    totalCost,
    costPerServing,
    ingredientCount: matched.filter(m => m.ingredient).length,
    details
  };
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    recipeName: null,
    dryRun: false,
    verbose: false
  };
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--recipe' && args[i + 1]) {
      options.recipeName = args[i + 1];
      i++;
    } else if (args[i] === '--dry-run') {
      options.dryRun = true;
    } else if (args[i] === '--verbose' || args[i] === '-v') {
      options.verbose = true;
    }
  }
  
  return options;
}

/**
 * Main function
 */
async function main() {
  const options = parseArgs();
  
  console.log('💰 Recipe Cost Calculator V2 (Improved)\n');
  
  if (options.dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }
  
  try {
    let recipes;
    
    if (options.recipeName) {
      const {findRecipe} = await import('../src/notion/notionClient.js');
      const recipe = await findRecipe(options.recipeName);
      
      if (!recipe) {
        console.log(`❌ Recipe "${options.recipeName}" not found`);
        process.exit(1);
      }
      
      recipes = [recipe];
      console.log(`📝 Calculating cost for: ${options.recipeName}\n`);
    } else {
      recipes = await queryRecipes();
      console.log(`📝 Found ${recipes.length} recipes to process\n`);
    }
    
    const results = {
      updated: 0,
      skipped: 0,
      errors: 0,
      noIngredients: 0,
      totalCost: 0
    };
    
    for (const recipe of recipes) {
      const recipeName = recipe.properties['Recipe Name']?.title?.[0]?.plain_text || 'Unknown';
      const servings = recipe.properties['Servings']?.number || null;
      const currentCost = recipe.properties['Recipe Cost']?.number || 
                         recipe.properties['Cost ($)']?.number;
      
      console.log(`🔍 ${recipeName}`);
      if (options.verbose) {
        console.log(`   Servings: ${servings || 'N/A'}`);
      }
      
      // Calculate new cost
      const costs = await calculateRecipeCostV2(recipe);
      
      if (costs.totalCost === null || costs.ingredientCount === 0) {
        console.log(`   ⚠️  No ingredients linked - skipping`);
        results.noIngredients++;
        continue;
      }
      
      if (options.verbose && costs.details.length > 0) {
        console.log(`   Ingredients:`);
        costs.details.forEach(detail => {
          console.log(`     - ${detail.quantity || '1'} ${detail.unit || ''} ${detail.name}: $${detail.cost.toFixed(2)}`);
        });
      }
      
      const currentCostPerServing = currentCost && servings ? (currentCost / servings).toFixed(2) : 'N/A';
      console.log(`   Current: $${currentCost?.toFixed(2) || 'N/A'} total, $${currentCostPerServing}/serving`);
      console.log(`   Calculated: $${costs.totalCost.toFixed(2)} total, $${costs.costPerServing?.toFixed(2) || 'N/A'}/serving (${costs.ingredientCount} ingredients)`);
      
      // Check if update needed
      const needsUpdate = !currentCost || Math.abs(currentCost - costs.totalCost) > 0.01;
      
      if (needsUpdate) {
        if (!options.dryRun) {
          const updated = await updateRecipeCost(recipe.id, costs.totalCost, costs.costPerServing);
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
    console.log(`   No Ingredients: ${results.noIngredients}`);
    console.log(`   Errors: ${results.errors}`);
    
    if (results.updated > 0 && !options.recipeName) {
      const avgCost = results.updated > 0 ? results.totalCost / results.updated : 0;
      console.log(`   Average recipe cost: $${avgCost.toFixed(2)}`);
    }
    
    console.log('\n✅ Done!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
