/**
 * Calculate Recipe Costs from Linked Ingredients
 * 
 * This script:
 * 1. Fetches all recipes and ingredients from Notion
 * 2. For each recipe, parses the Recipe Ingredients text field
 * 3. Matches parsed ingredients to linked ingredients in the database
 * 4. Calculates cost using package prices and unit conversions
 * 5. Updates Notion with calculated costs
 * 
 * Usage:
 *   node scripts/calculate-recipe-costs.js --dry-run    # Preview only
 *   node scripts/calculate-recipe-costs.js --update     # Update Notion
 *   node scripts/calculate-recipe-costs.js --recipe "Taco Pasta"  # Single recipe
 */

import {fetchIngredients, fetchRecipes, getPropertyValue} from './fetch-notion-databases.js';
import {calculateIngredientCost} from '../src/utils/unitConversions.js';
import {updateRecipeCost} from '../src/notion/notionClient.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Parse ingredient line (e.g., "1 lb ground beef" or "2 cups rice")
 */
function parseIngredientLine(line) {
  const cleaned = line.trim();
  if (!cleaned) return null;
  
  // Pattern: quantity + unit + name
  let match = cleaned.match(/^(\d+\/\d+|\d+\.?\d*)\s*(lb|lbs|oz|cup|cups|tbsp|tsp|can|cans|packet|packets|bag|bags|each|piece|pieces|clove|cloves|head|heads|bunch|bunches|tsp|tbsp|teaspoon|teaspoons|tablespoon|tablespoons|fl oz|pint|pints|quart|quarts|gal|gallon|g|kg|gram|grams|ml|l|liter|liters)\s+(.+)$/i);
  
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
      unit: match[2].toLowerCase(),
      name: match[3].trim(),
      raw: cleaned
    };
  }
  
  // Pattern: quantity + name (no unit)
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
  
  // Pattern: just name (assume quantity 1)
  return {
    quantity: 1,
    unit: null,
    name: cleaned,
    raw: cleaned
  };
}

/**
 * Normalize ingredient name for matching
 */
function normalizeName(name) {
  return name.toLowerCase()
    .replace(/^(fresh|dried|frozen|canned|jarred|bottled|ground|sliced|diced|chopped|minced|grated|shredded|crushed|whole|halved|quartered)\s+/i, '')
    .replace(/\s+/g, ' ')
    .replace(/[.,;:]$/g, '')
    .trim();
}

/**
 * Match parsed ingredient to database ingredient
 */
function matchIngredient(parsedIngredient, dbIngredients) {
  const parsedNorm = normalizeName(parsedIngredient.name);
  
  // Try exact match first
  for (const dbIng of dbIngredients) {
    const dbNorm = normalizeName(dbIng.item);
    if (parsedNorm === dbNorm) {
      return {matched: true, ingredient: dbIng, score: 100};
    }
  }
  
  // Try contains match
  for (const dbIng of dbIngredients) {
    const dbNorm = normalizeName(dbIng.item);
    if (parsedNorm.includes(dbNorm) || dbNorm.includes(parsedNorm)) {
      return {matched: true, ingredient: dbIng, score: 80};
    }
  }
  
  // Try partial word match
  const parsedWords = parsedNorm.split(' ');
  for (const dbIng of dbIngredients) {
    const dbNorm = normalizeName(dbIng.item);
    const dbWords = dbNorm.split(' ');
    
    // Check if key words match
    const keyWords = parsedWords.filter(w => w.length > 3);
    const matches = keyWords.filter(w => dbWords.some(dbw => dbw.includes(w) || w.includes(dbw)));
    
    if (matches.length >= Math.min(2, keyWords.length)) {
      return {matched: true, ingredient: dbIng, score: 60};
    }
  }
  
  return {matched: false};
}

/**
 * Calculate cost for a single recipe
 */
function calculateRecipeCost(recipe, allIngredients) {
  if (!recipe.recipeIngredients) {
    return {
      success: false,
      error: 'No Recipe Ingredients text found',
      totalCost: 0,
      costPerServing: 0,
      breakdown: []
    };
  }
  
  // Parse ingredient lines
  const lines = recipe.recipeIngredients.split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);
  
  const parsedIngredients = lines
    .map(parseIngredientLine)
    .filter(Boolean);
  
  if (parsedIngredients.length === 0) {
    return {
      success: false,
      error: 'Could not parse any ingredients',
      totalCost: 0,
      costPerServing: 0,
      breakdown: []
    };
  }
  
  // Match each parsed ingredient to database ingredient
  const breakdown = [];
  let totalCost = 0;
  const unmatched = [];
  
  for (const parsed of parsedIngredients) {
    // First, try to match to linked ingredients
    let matched = false;
    if (recipe.linkedIngredientIds?.length > 0) {
      const linkedIngredients = allIngredients.filter(ing => 
        recipe.linkedIngredientIds.includes(ing.id)
      );
      const match = matchIngredient(parsed, linkedIngredients);
      if (match.matched) {
        matched = true;
        // Calculate cost using unit conversions
        const cost = calculateIngredientCost(
          match.ingredient.pricePerPackage,
          match.ingredient.packageSize,
          match.ingredient.packageUnit,
          parsed.quantity,
          parsed.unit || match.ingredient.baseUnit || 'each',
          match.ingredient.item
        );
        
        totalCost += cost;
        breakdown.push({
          parsed: parsed.raw,
          matchedTo: match.ingredient.item,
          quantity: parsed.quantity,
          unit: parsed.unit || match.ingredient.baseUnit || 'each',
          cost: cost,
          ppu: match.ingredient.pricePerBaseUnit
        });
      }
    }
    
    // If not matched to linked, try all ingredients
    if (!matched) {
      const match = matchIngredient(parsed, allIngredients);
      if (match.matched) {
        const cost = calculateIngredientCost(
          match.ingredient.pricePerPackage,
          match.ingredient.packageSize,
          match.ingredient.packageUnit,
          parsed.quantity,
          parsed.unit || match.ingredient.baseUnit || 'each',
          match.ingredient.item
        );
        
        totalCost += cost;
        breakdown.push({
          parsed: parsed.raw,
          matchedTo: match.ingredient.item,
          quantity: parsed.quantity,
          unit: parsed.unit || match.ingredient.baseUnit || 'each',
          cost: cost,
          ppu: match.ingredient.pricePerBaseUnit,
          note: 'Matched from all ingredients (not linked)'
        });
      } else {
        unmatched.push(parsed.raw);
      }
    }
  }
  
  const costPerServing = recipe.servings > 0 ? totalCost / recipe.servings : 0;
  
  return {
    success: unmatched.length === 0,
    totalCost: Math.round(totalCost * 100) / 100,
    costPerServing: Math.round(costPerServing * 100) / 100,
    breakdown,
    unmatched,
    warnings: unmatched.length > 0 ? [`${unmatched.length} ingredients could not be matched`] : []
  };
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const updateNotion = args.includes('--update');
  const recipeFilter = args.find(arg => arg.startsWith('--recipe='))?.split('=')[1];
  
  console.log('💰 Calculating Recipe Costs\n');
  console.log('═'.repeat(60) + '\n');
  
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made to Notion\n');
  } else if (updateNotion) {
    console.log('✨ UPDATE MODE - Will update Notion with calculated costs\n');
  } else {
    console.log('💡 Running in preview mode. Use --update to save changes to Notion\n');
  }
  
  // Fetch data
  console.log('📦 Fetching ingredients...');
  const ingredients = await fetchIngredients();
  
  console.log('🍳 Fetching recipes...');
  const recipes = await fetchRecipes();
  
  // Filter recipes if specified
  let recipesToProcess = recipes;
  if (recipeFilter) {
    recipesToProcess = recipes.filter(r => 
      r.recipeName.toLowerCase().includes(recipeFilter.toLowerCase())
    );
    console.log(`\n🎯 Filtering to recipes matching "${recipeFilter}": ${recipesToProcess.length} found\n`);
  }
  
  console.log('\n' + '═'.repeat(60) + '\n');
  
  // Calculate costs
  const results = [];
  
  for (const recipe of recipesToProcess) {
    console.log(`\n📝 ${recipe.recipeName}`);
    console.log(`   Category: ${recipe.category || 'N/A'} | Servings: ${recipe.servings || 'N/A'}`);
    
    const calculation = calculateRecipeCost(recipe, ingredients);
    
    console.log(`   ✅ Total Cost: $${calculation.totalCost.toFixed(2)}`);
    console.log(`   ✅ Cost per Serving: $${calculation.costPerServing.toFixed(2)}`);
    
    if (calculation.breakdown.length > 0) {
      console.log(`\n   📊 Breakdown:`);
      calculation.breakdown.slice(0, 5).forEach(item => {
        console.log(`      • ${item.parsed}`);
        console.log(`        → ${item.matchedTo}: $${item.cost.toFixed(2)}`);
      });
      if (calculation.breakdown.length > 5) {
        console.log(`      ... and ${calculation.breakdown.length - 5} more`);
      }
    }
    
    if (calculation.unmatched.length > 0) {
      console.log(`\n   ⚠️  Unmatched ingredients:`);
      calculation.unmatched.forEach(item => {
        console.log(`      • ${item}`);
      });
    }
    
    if (updateNotion && !dryRun) {
      try {
        await updateRecipeCost(recipe.id, calculation.totalCost, calculation.costPerServing);
        console.log(`   ✨ Updated in Notion`);
        await new Promise(resolve => setTimeout(resolve, 350)); // Rate limit
      } catch (error) {
        console.log(`   ❌ Failed to update: ${error.message}`);
      }
    }
    
    results.push({
      recipe: recipe.recipeName,
      ...calculation
    });
  }
  
  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('\n📊 Summary\n');
  console.log(`   Recipes processed: ${results.length}`);
  console.log(`   Successful calculations: ${results.filter(r => r.success).length}`);
  console.log(`   With unmatched ingredients: ${results.filter(r => r.unmatched.length > 0).length}`);
  console.log(`   Average cost: $${(results.reduce((sum, r) => sum + r.totalCost, 0) / results.length).toFixed(2)}`);
  console.log(`   Average cost per serving: $${(results.reduce((sum, r) => sum + r.costPerServing, 0) / results.length).toFixed(2)}\n`);
  
  if (dryRun || !updateNotion) {
    console.log('💡 To update Notion, run with --update flag\n');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { calculateRecipeCost, parseIngredientLine, matchIngredient };
