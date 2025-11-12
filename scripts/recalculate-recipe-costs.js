#!/usr/bin/env node

/**
 * Recipe Cost Recalculator
 *
 * Pulls recipes from Notion, sums linked ingredient costs,
 * updates recipe totals when values drift, and reports variances.
 *
 * Usage:
 *   node scripts/recalculate-recipe-costs.js
 *   node scripts/recalculate-recipe-costs.js --threshold 12 --dry-run
 */

import path from 'path';
import {writeFile, mkdir} from 'fs/promises';
import notionClient, {
  queryRecipes,
  updateRecipeCost
} from '../backend/notion/notionClient.js';

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: false,
    threshold: null,
    tolerance: 0.05 // dollars
  };

  for (let i = 0; i < args.length; i++) {
    const token = args[i];
    if (token === '--dry-run' || token === '--preview') {
      options.dryRun = true;
    } else if (token === '--threshold' && args[i + 1]) {
      options.threshold = Number(args[++i]);
    } else if (token === '--tolerance' && args[i + 1]) {
      options.tolerance = Number(args[++i]);
    }
  }

  return options;
}

function formatCurrency(value) {
  return `$${(value ?? 0).toFixed(2)}`;
}

async function fetchIngredientPrice(ingredientId, cache) {
  if (cache.has(ingredientId)) return cache.get(ingredientId);
  const page = await notionClient.pages.retrieve({page_id: ingredientId});
  const price = page.properties['Price per Package ($)']?.number ?? 0;
  cache.set(ingredientId, price);
  return price;
}

async function recalculateRecipe(recipePage, ingredientPriceCache) {
  const recipeName = recipePage.properties['Recipe Name']?.title?.[0]?.plain_text || 'Recipe';
  const ingredientRelations = recipePage.properties['Aldi Ingredients']?.relation || [];
  const servings = recipePage.properties['Servings']?.number || null;

  let totalCost = 0;
  for (const relation of ingredientRelations) {
    const price = await fetchIngredientPrice(relation.id, ingredientPriceCache);
    totalCost += price;
  }

  const costPerServing = servings ? totalCost / servings : null;

  const storedTotal = recipePage.properties['Cost ($)']?.number ?? recipePage.properties['Recipe Cost']?.number ?? null;
  const storedPerServing = recipePage.properties['Cost per Serving ($)']?.number ?? null;

  return {
    id: recipePage.id,
    name: recipeName,
    totalCost,
    costPerServing,
    storedTotal,
    storedPerServing,
    servings,
    ingredientCount: ingredientRelations.length
  };
}

async function main() {
  const options = parseArgs();

  console.log('🧮 Recipe Cost Recalculation');
  if (options.dryRun) console.log('   Mode: Preview (no updates applied)');
  if (options.threshold) console.log(`   Alert threshold: ${formatCurrency(options.threshold)}`);
  console.log('');

  try {
    const recipePages = await queryRecipes();
    if (recipePages.length === 0) {
      console.log('⚠️  No recipes found in Notion.');
      return;
    }

    const ingredientPriceCache = new Map();
    const recalculated = [];

    for (const page of recipePages) {
      const result = await recalculateRecipe(page, ingredientPriceCache);
      recalculated.push(result);
    }

    const updates = [];
    const skipped = [];
    const alerts = [];

    for (const recipe of recalculated) {
      const {totalCost, storedTotal, costPerServing, storedPerServing} = recipe;
      const totalDelta = storedTotal != null ? Math.abs(totalCost - storedTotal) : totalCost;
      const perServingDelta = storedPerServing != null && costPerServing != null
        ? Math.abs(costPerServing - storedPerServing)
        : null;

      const needsUpdate = storedTotal == null || totalDelta > options.tolerance;

      if (needsUpdate) {
        if (!options.dryRun) {
          await updateRecipeCost(recipe.id, Number(totalCost.toFixed(2)), costPerServing != null ? Number(costPerServing.toFixed(2)) : null);
        }
        updates.push({...recipe, totalDelta, perServingDelta});
      } else {
        skipped.push({...recipe, totalDelta, perServingDelta});
      }

      if (options.threshold != null && totalCost > options.threshold) {
        alerts.push(recipe);
      }
    }

    console.log(`✅ Recalculated ${recalculated.length} recipes.`);
    console.log(`   Updated: ${updates.length}${options.dryRun ? ' (preview)' : ''}`);
    console.log(`   Unchanged: ${skipped.length}`);

    if (updates.length > 0) {
      console.log('\n🔄 Updated Values:');
      for (const update of updates) {
        console.log(`   • ${update.name}: ${formatCurrency(update.storedTotal)} → ${formatCurrency(update.totalCost)}`);
      }
    }

    if (alerts.length > 0) {
      console.log('\n⚠️  Over-budget recipes:');
      alerts.forEach((recipe) => {
        console.log(`   • ${recipe.name}: ${formatCurrency(recipe.totalCost)} (${recipe.ingredientCount} ingredients)`);
      });
    }

    const summary = {
      runAt: new Date().toISOString(),
      options,
      totals: {
        processed: recalculated.length,
        updated: updates.length,
        unchanged: skipped.length,
        alerts: alerts.length
      },
      updates: updates.map((item) => ({
        name: item.name,
        newTotal: Number(item.totalCost.toFixed(2)),
        oldTotal: item.storedTotal,
        newPerServing: item.costPerServing != null ? Number(item.costPerServing.toFixed(2)) : null,
        oldPerServing: item.storedPerServing,
        servings: item.servings
      })),
      alerts: alerts.map((item) => ({
        name: item.name,
        totalCost: Number(item.totalCost.toFixed(2)),
        servings: item.servings
      }))
    };

    const logPath = path.join('logs', `recipe-costs-${Date.now()}.json`);
    await mkdir('logs', {recursive: true});
    await writeFile(logPath, JSON.stringify(summary, null, 2), 'utf-8');
    console.log(`\n📝 Log saved to ${logPath}`);
  } catch (error) {
    console.error('\n❌ Error recalculating recipe costs:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
