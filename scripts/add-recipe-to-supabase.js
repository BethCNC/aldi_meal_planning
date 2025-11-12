#!/usr/bin/env node
/**
 * Interactive Supabase Recipe Import Tool
 *
 * Prompts for recipe metadata, resolves ingredients, calculates costs,
 * and saves everything into Supabase (`recipes` + `recipe_ingredients` tables).
 *
 * Usage:
 *   node scripts/add-recipe-to-supabase.js
 */

import readline from 'readline';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';
import {
  calculateIngredientCost,
  normalizeUnit,
  calculatePricePerUnit
} from '../backend/utils/unitConversions.js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('\n❌ Supabase credentials missing.');
  console.error('   Please set SUPABASE_URL and SUPABASE_KEY (or VITE equivalents) in your environment.');
  process.exit(1);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let searchIngredientsByName;
let upsertIngredient;
let normalizeIngredientRow;
let findRecipeByName;
let upsertRecipe;
let replaceRecipeIngredients;

function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

async function promptNumber(question, defaultValue = null, { allowEmpty = true, min = null } = {}) {
  while (true) {
    const answer = await prompt(question);

    if (answer === '') {
      if (allowEmpty) {
        return defaultValue;
      }
      if (defaultValue !== null) {
        return defaultValue;
      }
      console.log('   Please enter a value.');
      continue;
    }

    const value = Number(answer);
    if (Number.isNaN(value)) {
      console.log('   Please enter a numeric value.');
      continue;
    }

    if (min !== null && value < min) {
      console.log(`   Please enter a value ≥ ${min}.`);
      continue;
    }

    return value;
  }
}

async function promptBoolean(question, defaultValue = true) {
  const answer = (await prompt(question)).toLowerCase();
  if (!answer) return defaultValue;
  return ['y', 'yes'].includes(answer);
}

function formatCurrency(amount) {
  const value = Number.isFinite(amount) ? amount : 0;
  return `$${value.toFixed(2)}`;
}

function normalizeCategory(input) {
  if (!input) return 'Other';
  const trimmed = input.trim();
  if (!trimmed) return 'Other';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

function parseIngredientLine(line) {
  const cleaned = line.trim();
  if (!cleaned) {
    return null;
  }

  let match = cleaned.match(/^(\d+\/\d+|\d+\.?\d*)\s*(lb|lbs|oz|cup|cups|tbsp|tablespoon|tsp|teaspoon|can|cans|packet|packets|bag|bags|each|clove|cloves|pint|pints|quart|quarts|g|kg|ml|l|gram|grams|liter|liters|ounce|ounces|head|heads|bunch|bunches|slice|slices)\s+(.+)$/i);
  if (match) {
    const quantity = parseQuantity(match[1]);
    const unit = normalizeUnit(match[2]) || match[2];
    return { quantity, unit, name: match[3].trim(), raw: cleaned };
  }

  match = cleaned.match(/^(\d+\/\d+|\d+\.?\d*)\s+(.+)$/);
  if (match) {
    const quantity = parseQuantity(match[1]);
    return { quantity, unit: null, name: match[2].trim(), raw: cleaned };
  }

  return { quantity: null, unit: null, name: cleaned, raw: cleaned };
}

function parseQuantity(value) {
  if (!value) return null;
  if (value.includes('/')) {
    const [numerator, denominator] = value.split('/').map(Number);
    if (!Number.isNaN(numerator) && !Number.isNaN(denominator) && denominator !== 0) {
      return numerator / denominator;
    }
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function extractSearchTerm(parsed) {
  return parsed.name.toLowerCase()
    .replace(/^(fresh|dried|frozen|canned|jarred|bottled|low-sodium|reduced-fat|organic)\s+/i, '')
    .replace(/^(\d+\.?\d*\s*)?(lb|lbs|oz|cup|cups|tbsp|tsp|can|cans|packet|packets|bag|bags|each|clove|cloves|pint|pints|quart|quarts|g|kg|ml|l)\s+/i, '')
    .trim();
}

function roundCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 0;
  }
  return Math.round(value * 100) / 100;
}

function derivePricePerBaseUnit(pricePerPackage, packageSize, packageUnit, baseUnit) {
  if (!pricePerPackage || !packageSize) {
    return null;
  }

  const normalizedPackageUnit = packageUnit ? normalizeUnit(packageUnit) || packageUnit : null;
  const normalizedBaseUnit = baseUnit ? normalizeUnit(baseUnit) || baseUnit : normalizedPackageUnit;
  if (!normalizedBaseUnit) {
    return pricePerPackage / packageSize;
  }

  return calculatePricePerUnit(
    pricePerPackage,
    packageSize,
    normalizedPackageUnit || normalizedBaseUnit,
    normalizedBaseUnit
  );
}

function computeIngredientCost(ingredient, quantity, unit) {
  if (!ingredient) return 0;

  const normalizedUnit = unit ? normalizeUnit(unit) || unit : null;
  const normalizedPackageUnit = ingredient.packageUnit
    ? normalizeUnit(ingredient.packageUnit) || ingredient.packageUnit
    : null;
  const normalizedBaseUnit = ingredient.baseUnit
    ? normalizeUnit(ingredient.baseUnit) || ingredient.baseUnit
    : null;

  const packageUnitForCalc = normalizedPackageUnit || normalizedBaseUnit || normalizedUnit || 'each';
  const quantityUnitForCalc = normalizedUnit || normalizedBaseUnit || normalizedPackageUnit || 'each';

  let cost = null;

  if (ingredient.pricePerPackage && ingredient.packageSize) {
    cost = calculateIngredientCost(
      ingredient.pricePerPackage,
      ingredient.packageSize,
      packageUnitForCalc,
      quantity ?? 1,
      quantityUnitForCalc,
      ingredient.item
    );
  }

  if ((!cost || cost === 0) && ingredient.pricePerBaseUnit && quantity) {
    if (
      !normalizedUnit ||
      (normalizedBaseUnit && normalizedBaseUnit === normalizedUnit)
    ) {
      cost = ingredient.pricePerBaseUnit * quantity;
    }
  }

  if (!cost && ingredient.pricePerPackage) {
    cost = ingredient.pricePerPackage;
  }

  return roundCurrency(cost ?? 0);
}

async function resolveIngredient(parsed) {
  const searchTerm = extractSearchTerm(parsed);
  let currentSearchTerm = searchTerm;

  while (true) {
    const matches = currentSearchTerm
      ? await searchIngredientsByName(currentSearchTerm, { limit: 6 })
      : [];

    if (matches.length > 0) {
      console.log('\n🔍 Possible ingredient matches:');
      matches.forEach((match, index) => {
        const price = match.pricePerPackage
          ? `${formatCurrency(match.pricePerPackage)}`
          : match.pricePerBaseUnit
            ? `${formatCurrency(match.pricePerBaseUnit)}/${match.baseUnit || 'unit'}`
            : 'No price';
        console.log(`   ${index + 1}. ${match.item} (${price})`);
      });

      const selection = await prompt(`Select ingredient [1-${matches.length}] (Enter for 1, N to create new, R to refine search): `);
      if (!selection) {
        return matches[0];
      }

      if (selection.toLowerCase() === 'n') {
        break;
      }

      if (selection.toLowerCase() === 'r') {
        currentSearchTerm = await prompt('   New search term: ');
        continue;
      }

      const index = Number(selection);
      if (Number.isInteger(index) && index >= 1 && index <= matches.length) {
        return matches[index - 1];
      }

      console.log('   Invalid selection. Try again.');
    } else {
      console.log(`\n⚠️  No ingredients found matching "${currentSearchTerm || parsed.name}".`);
      const action = await prompt('Enter a new search term, or press Enter to create a new ingredient: ');
      if (!action) {
        break;
      }
      currentSearchTerm = action;
    }
  }

  return null;
}

async function createIngredientFlow(defaultName) {
  console.log('\n➕ Creating new ingredient');

  const item = (await prompt(`   Ingredient name [${defaultName}]: `)) || defaultName;
  const pricePerPackage = await promptNumber('   Price per package ($): ', null, { allowEmpty: false, min: 0 });
  const packageSize = await promptNumber('   Package size (numeric, optional): ', null, { allowEmpty: true, min: 0 });
  const packageUnitInput = await prompt('   Package unit (oz, lb, each, etc) [optional]: ');
  const baseUnitInput = await prompt('   Base unit (optional, e.g., oz, g): ');
  const categoryInput = await prompt('   Category (Produce/Meat/Dairy/Pantry/Frozen/Other): ');
  const notes = await prompt('   Notes (optional): ');

  const packageUnit = packageUnitInput ? normalizeUnit(packageUnitInput) || packageUnitInput : null;
  const baseUnit = baseUnitInput
    ? normalizeUnit(baseUnitInput) || baseUnitInput
    : packageUnit || null;

  let pricePerBaseUnit = null;
  if (pricePerPackage && packageSize) {
    pricePerBaseUnit = derivePricePerBaseUnit(pricePerPackage, packageSize, packageUnit, baseUnit);
  }

  const ingredientRecord = await upsertIngredient({
    item,
    pricePerPackage,
    packageSize,
    packageUnit,
    baseUnit,
    pricePerBaseUnit,
    category: normalizeCategory(categoryInput),
    notes: notes || null
  });

  console.log(`   ✨ Created ingredient "${ingredientRecord.item}" (${formatCurrency(ingredientRecord.pricePerPackage) || 'N/A'})`);
  return ingredientRecord;
}

async function collectIngredients(recipeName) {
  console.log('\n📝 Enter ingredients (one per line, press Enter twice when done):');

  const entries = [];
  const rawLines = [];
  let emptyCount = 0;

  while (true) {
    const line = await prompt('> ');
    if (!line) {
      emptyCount += 1;
      if (emptyCount >= 2) {
        break;
      }
      continue;
    }

    emptyCount = 0;
    rawLines.push(line);
  }

  for (const rawLine of rawLines) {
    const parsed = parseIngredientLine(rawLine);
    if (!parsed) {
      console.log(`⚠️  Could not parse "${rawLine}". Skipping.`);
      continue;
    }

    let ingredient = await resolveIngredient(parsed);
    if (!ingredient) {
      ingredient = await createIngredientFlow(parsed.name);
    }

    let quantity = parsed.quantity;
    if (quantity === null) {
      quantity = await promptNumber(`   Quantity for "${rawLine}": `, null, { allowEmpty: false, min: 0 });
    } else {
      const response = await prompt(`   Use quantity ${quantity}? (Enter to confirm, or type new value): `);
      if (response) {
        const override = Number(response);
        quantity = Number.isNaN(override) ? quantity : override;
      }
    }

    let unit = parsed.unit;
    const unitPrompt = unit
      ? `   Use unit "${unit}"? (Enter to confirm, or type new unit): `
      : '   Specify unit (oz, lb, cup, each, etc): ';
    const unitResponse = await prompt(unitPrompt);
    if (unitResponse) {
      unit = normalizeUnit(unitResponse) || unitResponse;
    }

    const normalizedIngredient = normalizeIngredientRow(ingredient);
    const calculatedCost = computeIngredientCost(normalizedIngredient, quantity, unit);

    console.log(`   → ${normalizedIngredient.item}: ${formatCurrency(calculatedCost)}`);

    entries.push({
      ingredientId: normalizedIngredient.id,
      ingredientName: normalizedIngredient.item,
      quantity,
      unit,
      rawLine,
      calculatedCost,
      matchedWithFuzzy: false
    });
  }

  return entries;
}

async function collectInstructions() {
  console.log('\n📖 Instructions (optional, press Enter twice when done or Enter to skip):');
  const instructions = [];
  let emptyCount = 0;

  while (true) {
    const line = await prompt('> ');
    if (!line) {
      emptyCount += 1;
      if (emptyCount >= 2 || (instructions.length === 0 && emptyCount >= 1)) {
        break;
      }
    } else {
      emptyCount = 0;
      instructions.push(line);
    }
  }

  return instructions;
}

async function main() {
  console.log('\n🍳 Add New Recipe to Supabase\n');

  try {
    const recipeName = await prompt('Recipe name: ');
    if (!recipeName) {
      console.log('❌ Recipe name is required.');
      rl.close();
      return;
    }

    const ingredientModule = await import('../backend/supabase/ingredientClient.js');
    ({ searchIngredientsByName, upsertIngredient, normalizeIngredientRow } = ingredientModule);
    const recipeModule = await import('../backend/supabase/recipeClient.js');
    ({ findRecipeByName, upsertRecipe, replaceRecipeIngredients } = recipeModule);

    const existingRecipe = await findRecipeByName(recipeName);
    let recipeId = existingRecipe?.id || randomUUID();
    if (existingRecipe) {
      console.log(`⚠️  Recipe "${existingRecipe.name}" already exists in Supabase.`);
      const overwrite = await promptBoolean('   Overwrite existing entry? (y/N): ', false);
      if (!overwrite) {
        console.log('Cancelled.');
        rl.close();
        return;
      }
      recipeId = existingRecipe.id;
    }

    const servingsInput = await prompt('Servings (default 4): ');
    const servings = servingsInput ? Number(servingsInput) : 4;
    const category = normalizeCategory(await prompt('Category (Beef/Chicken/Pork/Vegetarian/Seafood/Other): '));
    const sourceUrl = await prompt('Source URL (optional): ');
    const imageUrl = await prompt('Image URL (optional): ');
    const tagsInput = await prompt('Tags (comma separated, optional): ');
    const tags = tagsInput
      ? tagsInput.split(',').map((tag) => tag.trim()).filter(Boolean)
      : ['Aldi'];

    const ingredientEntries = await collectIngredients(recipeName);
    if (ingredientEntries.length === 0) {
      console.log('❌ No ingredients entered. Cancelling.');
      rl.close();
      return;
    }

    const totalCost = roundCurrency(
      ingredientEntries.reduce((sum, entry) => sum + (entry.calculatedCost || 0), 0)
    );
    const costPerServing = servings ? roundCurrency(totalCost / servings) : null;

    const instructions = await collectInstructions();
    const instructionsText = instructions.length > 0 ? instructions.join('\n') : null;

    console.log('\n📋 Recipe Summary:');
    console.log(`   Name: ${recipeName}`);
    console.log(`   Servings: ${servings || 'N/A'}`);
    console.log(`   Category: ${category || 'N/A'}`);
    console.log(`   Total Cost: ${formatCurrency(totalCost)}`);
    console.log(`   Cost per Serving: ${costPerServing !== null ? formatCurrency(costPerServing) : 'N/A'}`);
    console.log('\n💰 Ingredient Breakdown:');
    ingredientEntries.forEach((entry) => {
      console.log(`   • ${entry.rawLine} → ${entry.ingredientName}: ${formatCurrency(entry.calculatedCost)}`);
    });

    const confirm = await promptBoolean('\n✨ Save recipe to Supabase? (Y/n): ', true);
    if (!confirm) {
      console.log('Cancelled.');
      rl.close();
      return;
    }

    console.log('\n💾 Saving recipe to Supabase...');

    const savedRecipe = await upsertRecipe({
      id: recipeId,
      name: recipeName,
      servings,
      category,
      totalCost,
      costPerServing,
      instructions: instructionsText,
      sourceUrl: sourceUrl || null,
      imageUrl: imageUrl || null,
      tags
    });

    await replaceRecipeIngredients(savedRecipe.id, ingredientEntries);

    console.log('\n✅ Recipe saved successfully!');
    console.log(`   Recipe ID: ${savedRecipe.id}`);
  } catch (error) {
    console.error('\n❌ Error while adding recipe:');
    console.error(`   ${error.message}`);
    if (error.details) {
      console.error(`   Details: ${error.details}`);
    }
  } finally {
    rl.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

