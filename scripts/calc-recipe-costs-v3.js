/**
 * Recipe Cost Calculator V3 - Advanced
 * 
 * Powerful version that:
 * 1. Parses quantities from Recipe Ingredients text
 * 2. Matches to linked ingredients with fuzzy matching
 * 3. Uses proper unit conversions
 * 4. Calculates costs based on package prices and quantities
 * 5. Handles partial packages correctly
 * 6. Shows detailed breakdown
 * 
 * Usage:
 *   node scripts/calc-recipe-costs-v3.js --dry-run
 *   node scripts/calc-recipe-costs-v3.js --recipe "Recipe Name" --verbose
 *   node scripts/calc-recipe-costs-v3.js --update  # Actually update Notion
 */

import {queryRecipes, updateRecipeCost} from '../src/notion/notionClient.js';
import {calculateIngredientCost} from '../src/utils/unitConversions.js';
import notion from '../src/notion/notionClient.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Parse ingredient line with improved regex
 * Handles: "1 lb ground beef", "2 cups rice", "1/2 cup milk", "1 onion"
 */
function parseIngredientLine(line) {
  const cleaned = line.trim();
  
  // Pattern 1: Fraction quantity + unit + name (e.g., "1/2 cup milk")
  let match = cleaned.match(/^(\d+\/\d+|\d+\.?\d*)\s*(lb|lbs|oz|cup|cups|tbsp|tsp|can|cans|packet|packets|bag|bags|each|piece|pieces|clove|cloves|head|heads|bunch|bunches|tsp|tbsp|teaspoon|teaspoons|tablespoon|tablespoons)\s+(.+)$/i);
  
  if (match) {
    let qty = match[1];
    // Handle fractions
    if (qty.includes('/')) {
      const [num, den] = qty.split('/');
      qty = parseFloat(num) / parseFloat(den);
    } else {
      qty = parseFloat(qty);
    }
    
    return {
      quantity: qty,
      unit: match[2],
      name: match[3].trim(),
      raw: cleaned
    };
  }
  
  // Pattern 2: Just quantity + name (e.g., "2 onions")
  match = cleaned.match(/^(\d+\/\d+|\d+\.?\d*)\s+(.+)$/);
  if (match) {
    let qty = match[1];
    if (qty.includes('/')) {
      const [num, den] = qty.split('/');
      qty = parseFloat(num) / parseFloat(den);
    } else {
      qty = parseFloat(qty);
    }
    
    return {
      quantity: qty,
      unit: null,
      name: match[2].trim(),
      raw: cleaned
    };
  }
  
  // Pattern 3: Just name (assume 1)
  return {
    quantity: 1,
    unit: null,
    name: cleaned,
    raw: cleaned
  };
}

/**
 * Enhanced fuzzy matching with scoring
 */
function matchIngredientName(parsedName, dbName, parsedUnit = null, dbUnit = null) {
  const normalize = (str) => str.toLowerCase()
    .replace(/^(fresh|dried|frozen|canned|jarred|bottled|ground|sliced|diced|chopped|minced|grated|shredded|crushed|whole|halved|quartered)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  const parsedNorm = normalize(parsedName);
  const dbNorm = normalize(dbName);
  
  // Exact match
  if (parsedNorm === dbNorm) {
    return {matched: true, score: 100, name: dbName};
  }
  
  // Contains match
  if (parsedNorm.includes(dbNorm) || dbNorm.includes(parsedNorm)) {
    return {matched: true, score: 80, name: dbName};
  }
  
  // Word matching
  const parsedWords = parsedNorm.split(/\s+/);
  const dbWords = dbNorm.split(/\s+/);
  const matchingWords = parsedWords.filter(w => dbWords.includes(w));
  const wordScore = (matchingWords.length / Math.max(parsedWords.length, dbWords.length)) * 100;
  
  if (wordScore >= 60) {
    return {matched: true, score: wordScore, name: dbName};
  }
  
  return {matched: false, score: 0, name: null};
}

/**
 * Get ingredient info with all package details
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
      pricePerPackage: pricePerPackage || null,
      packageSize: packageSize || null,
      packageUnit: packageUnit || null,
      baseUnit: baseUnit || null,
      hasCompleteData: !!(pricePerPackage && packageSize && packageUnit)
    };
  } catch (error) {
    console.error(`  ⚠️  Error fetching ingredient: ${error.message}`);
    return null;
  }
}

/**
 * Parse and match recipe ingredients to database ingredients
 */
async function parseAndMatchIngredients(recipeIngredientsText, linkedIngredientIds) {
  if (!recipeIngredientsText || !linkedIngredientIds.length) {
    return [];
  }
  
  // Parse lines
  const lines = recipeIngredientsText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.match(/^(ingredients?|shopping list)/i));
  
  // Get all linked ingredients
  const linkedIngredients = [];
  for (const id of linkedIngredientIds) {
    const info = await getIngredientInfo(id);
    if (info) linkedIngredients.push(info);
  }
  
  const matched = [];
  
  // Match each parsed line
  for (const line of lines) {
    const parsed = parseIngredientLine(line);
    
    // Find best match
    let bestMatch = null;
    let bestScore = 0;
    
    for (const linked of linkedIngredients) {
      const match = matchIngredientName(parsed.name, linked.name, parsed.unit, linked.packageUnit);
      if (match.matched && match.score > bestScore) {
        bestScore = match.score;
        bestMatch = {ingredient: linked, score: match.score};
      }
    }
    
    if (bestMatch && bestScore >= 40) { // Minimum confidence threshold
      // Calculate cost
      const cost = calculateIngredientCost(
        bestMatch.ingredient.pricePerPackage,
        bestMatch.ingredient.packageSize,
        bestMatch.ingredient.packageUnit,
        parsed.quantity,
        parsed.unit,
        parsed.name
      );
      
      matched.push({
        parsed,
        ingredient: bestMatch.ingredient,
        cost,
        matchScore: bestScore,
        matched: true
      });
    } else {
      // No match or low confidence
      matched.push({
        parsed,
        ingredient: null,
        cost: 0,
        matchScore: bestScore,
        matched: false
      });
    }
  }
  
  return matched;
}

/**
 * Calculate recipe cost with detailed breakdown
 */
async function calculateRecipeCostV3(recipe) {
  // Get linked ingredients
  const ingredientRelations = recipe.properties['Aldi Ingredients']?.relation || [];
  
  if (ingredientRelations.length === 0) {
    return {
      totalCost: null,
      costPerServing: null,
      ingredientCount: 0,
      details: [],
      matched: 0,
      unmatched: 0,
      warnings: []
    };
  }
  
  const linkedIngredientIds = ingredientRelations.map(rel => rel.id);
  
  // Get Recipe Ingredients text
  const recipeIngredientsText = recipe.properties['Recipe Ingredients']?.rich_text
    ?.map(rt => rt.plain_text).join('\n') || '';
  
  // Parse and match
  const matched = await parseAndMatchIngredients(recipeIngredientsText, linkedIngredientIds);
  
  // Calculate totals
  let totalCost = 0;
  const details = [];
  const warnings = [];
  let matchedCount = 0;
  let unmatchedCount = 0;
  
  for (const match of matched) {
    if (match.matched && match.ingredient) {
      totalCost += match.cost;
      matchedCount++;
      
      details.push({
        name: match.ingredient.name,
        quantity: match.parsed.quantity,
        unit: match.parsed.unit || 'each',
        cost: match.cost,
        pricePerPackage: match.ingredient.pricePerPackage,
        packageSize: match.ingredient.packageSize,
        packageUnit: match.ingredient.packageUnit,
        matchScore: match.matchScore
      });
      
      // Check for low confidence matches
      if (match.matchScore < 70) {
        warnings.push(`Low confidence match (${match.matchScore.toFixed(0)}%): "${match.parsed.name}" → "${match.ingredient.name}"`);
      }
      
      // Check for missing data
      if (!match.ingredient.hasCompleteData) {
        warnings.push(`Incomplete data for "${match.ingredient.name}": missing package info`);
      }
    } else {
      unmatchedCount++;
      warnings.push(`No match found for: "${match.parsed.raw}"`);
    }
  }
  
  const servings = recipe.properties['Servings']?.number || null;
  const costPerServing = servings ? totalCost / servings : null;
  
  return {
    totalCost,
    costPerServing,
    ingredientCount: matched.length,
    details,
    matched: matchedCount,
    unmatched: unmatchedCount,
    warnings
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
    verbose: false,
    update: false
  };
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--recipe' && args[i + 1]) {
      options.recipeName = args[i + 1];
      i++;
    } else if (args[i] === '--dry-run') {
      options.dryRun = true;
    } else if (args[i] === '--update') {
      options.update = true;
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
  
  console.log('💰 Recipe Cost Calculator V3 (Advanced)\n');
  
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
      totalCost: 0,
      warnings: []
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
      
      // Calculate
      const costs = await calculateRecipeCostV3(recipe);
      
      if (costs.totalCost === null || costs.ingredientCount === 0) {
        console.log(`   ⚠️  No ingredients linked - skipping`);
        results.noIngredients++;
        continue;
      }
      
      // Show details
      if (options.verbose && costs.details.length > 0) {
        console.log(`\n   📋 Ingredient Breakdown:`);
        for (const detail of costs.details) {
          const qtyStr = detail.quantity ? `${detail.quantity} ${detail.unit || ''}`.trim() : '1';
          const packageStr = detail.packageSize ? `${detail.packageSize} ${detail.packageUnit || ''}` : 'N/A';
          console.log(`     ${qtyStr} ${detail.name}:`);
          console.log(`       Cost: $${detail.cost.toFixed(2)}`);
          console.log(`       Package: $${detail.pricePerPackage?.toFixed(2) || 'N/A'} for ${packageStr}`);
          if (detail.matchScore < 70) {
            console.log(`       ⚠️  Low match confidence: ${detail.matchScore.toFixed(0)}%`);
          }
        }
      }
      
      // Show warnings
      if (costs.warnings.length > 0) {
        console.log(`\n   ⚠️  Warnings:`);
        costs.warnings.forEach(w => console.log(`     - ${w}`));
      }
      
      const currentCostPerServing = currentCost && servings ? (currentCost / servings).toFixed(2) : 'N/A';
      console.log(`\n   💰 Current: $${currentCost?.toFixed(2) || 'N/A'} total, $${currentCostPerServing}/serving`);
      console.log(`   💰 Calculated: $${costs.totalCost.toFixed(2)} total, $${costs.costPerServing?.toFixed(2) || 'N/A'}/serving`);
      console.log(`   📊 Matched: ${costs.matched}/${costs.ingredientCount} ingredients`);
      
      if (costs.unmatched > 0) {
        console.log(`   ⚠️  Unmatched: ${costs.unmatched} ingredients (see warnings above)`);
      }
      
      // Check if update needed
      const needsUpdate = !currentCost || Math.abs(currentCost - costs.totalCost) > 0.50;
      
      if (needsUpdate) {
        if (!options.dryRun && options.update) {
          try {
            await updateRecipeCost(recipe.id, costs.totalCost, costs.costPerServing);
            console.log(`   ✅ Updated in Notion`);
            results.updated++;
            results.totalCost += costs.totalCost;
          } catch (error) {
            console.log(`   ❌ Failed to update: ${error.message}`);
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
      
      results.warnings.push(...costs.warnings.map(w => `${recipeName}: ${w}`));
      
      console.log('');
    }
    
    console.log('='.repeat(70));
    console.log('\n📊 Summary:');
    console.log(`   Updated: ${results.updated}`);
    console.log(`   Skipped: ${results.skipped}`);
    console.log(`   No Ingredients: ${results.noIngredients}`);
    console.log(`   Errors: ${results.errors}`);
    
    if (results.updated > 0 && !options.recipeName) {
      const avgCost = results.totalCost / results.updated;
      console.log(`   Average recipe cost: $${avgCost.toFixed(2)}`);
    }
    
    if (results.warnings.length > 0 && !options.verbose) {
      console.log(`\n⚠️  ${results.warnings.length} warnings (use --verbose to see details)`);
    }
    
    console.log('\n✅ Done!');
    
    if (results.warnings.length > 0) {
      console.log('\n💡 Tips:');
      console.log('   - Review unmatched ingredients and improve naming');
      console.log('   - Fill in missing package data for better accuracy');
      console.log('   - Low confidence matches may need manual verification');
    }
    
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
