#!/usr/bin/env node
/**
 * Seed script: Aldi-Style Chocolate Chip Banana Bread
 *
 * Ensures required ingredients exist in Supabase and inserts/updates
 * the recipe with calculated costs and instructions.
 */

import 'dotenv/config';
import { randomUUID } from 'crypto';
import {
  searchIngredientsByName,
  upsertIngredient,
  normalizeIngredientRow
} from '../backend/supabase/ingredientClient.js';
import {
  findRecipeByName,
  upsertRecipe,
  replaceRecipeIngredients
} from '../backend/supabase/recipeClient.js';
import {
  calculateIngredientCost,
  calculatePricePerUnit,
  normalizeUnit
} from '../backend/utils/unitConversions.js';

function roundCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 0;
  }
  return Math.round(value * 100) / 100;
}

function buildPricePerBase({ pricePerPackage, packageSize, packageUnit, baseUnit }) {
  if (!pricePerPackage || !packageSize) {
    return null;
  }
  const resolvedBaseUnit = baseUnit || packageUnit;
  if (!resolvedBaseUnit) return null;

  return roundCurrency(
    calculatePricePerUnit(pricePerPackage, packageSize, packageUnit || resolvedBaseUnit, resolvedBaseUnit)
  );
}

async function ensureIngredient(itemName, spec = null) {
  const matches = await searchIngredientsByName(itemName);
  const normalizedName = itemName.toLowerCase();
  const exact = matches.find((entry) => entry.item.toLowerCase() === normalizedName);

  if (exact) {
    if (spec) {
      const shouldUpdate =
        spec.packageSize && (!exact.packageSize || exact.packageSize !== spec.packageSize) ||
        spec.packageUnit && exact.packageUnit !== spec.packageUnit ||
        spec.pricePerPackage && exact.pricePerPackage !== spec.pricePerPackage ||
        spec.pricePerBaseUnit && exact.pricePerBaseUnit !== spec.pricePerBaseUnit;

      if (shouldUpdate) {
        const record = await upsertIngredient({
          id: exact.id,
          item: itemName,
          pricePerPackage: spec.pricePerPackage ?? exact.pricePerPackage ?? null,
          packageSize: spec.packageSize ?? exact.packageSize ?? null,
          packageUnit: spec.packageUnit ?? exact.packageUnit ?? null,
          baseUnit: spec.baseUnit ?? exact.baseUnit ?? null,
          pricePerBaseUnit: spec.pricePerBaseUnit ?? exact.pricePerBaseUnit ?? null,
          category: spec.category ?? exact.category ?? null,
          notes: spec.notes ?? exact.notes ?? null
        });
        return normalizeIngredientRow(record);
      }
    }
    return exact;
  }

  if (!spec) {
    throw new Error(`No existing ingredient found for "${itemName}" and no spec provided to create it.`);
  }

  const payload = {
    id: randomUUID(),
    item: itemName,
    pricePerPackage: spec.pricePerPackage ?? null,
    packageSize: spec.packageSize ?? null,
    packageUnit: spec.packageUnit ?? null,
    baseUnit: spec.baseUnit ?? spec.packageUnit ?? null,
    pricePerBaseUnit:
      spec.pricePerBaseUnit ??
      buildPricePerBase({
        pricePerPackage: spec.pricePerPackage ?? null,
        packageSize: spec.packageSize ?? null,
        packageUnit: spec.packageUnit ?? null,
        baseUnit: spec.baseUnit ?? spec.packageUnit ?? null
      }),
    category: spec.category ?? null,
    notes: spec.notes ?? null
  };

  const created = await upsertIngredient(payload);
  return normalizeIngredientRow(created);
}

function computeIngredientCost(ingredientRow, quantity, unit, ingredientNameForCalc) {
  if (!ingredientRow) return 0;

  const normalizedUnit = unit ? normalizeUnit(unit) || unit : null;
  const packageUnit = ingredientRow.packageUnit
    ? normalizeUnit(ingredientRow.packageUnit) || ingredientRow.packageUnit
    : null;
  const baseUnit = ingredientRow.baseUnit ? normalizeUnit(ingredientRow.baseUnit) || ingredientRow.baseUnit : null;

  const packageUnitForCalc = packageUnit || baseUnit || normalizedUnit || 'each';
  const quantityUnitForCalc = normalizedUnit || baseUnit || packageUnit || 'each';

  let cost = null;

  if (ingredientRow.pricePerPackage && ingredientRow.packageSize) {
    cost = calculateIngredientCost(
      ingredientRow.pricePerPackage,
      ingredientRow.packageSize,
      packageUnitForCalc,
      quantity ?? 1,
      quantityUnitForCalc,
      ingredientNameForCalc || ingredientRow.item
    );
  }

  if ((!cost || cost === 0) && ingredientRow.pricePerBaseUnit && quantity) {
    if (!normalizedUnit || (baseUnit && baseUnit === normalizedUnit)) {
      cost = ingredientRow.pricePerBaseUnit * quantity;
    }
  }

  if (!cost && ingredientRow.pricePerPackage) {
    cost = ingredientRow.pricePerPackage;
  }

  return roundCurrency(cost ?? 0);
}

async function main() {
  const recipeName = 'Aldi-Style Chocolate Chip Banana Bread (no nuts)';

  const ingredientDefinitions = {
    bananas: {
      pricePerPackage: 0.24,
      packageSize: 1,
      packageUnit: 'each',
      baseUnit: 'each',
      category: 'Produce'
    },
    'granulated sugar': {
      pricePerPackage: 2.09,
      packageSize: 4,
      packageUnit: 'lb',
      baseUnit: 'lb',
      category: 'Pantry'
    },
    'vanilla extract': {
      pricePerPackage: 2.99,
      packageSize: 2,
      packageUnit: 'fl oz',
      baseUnit: 'fl oz',
      category: 'Pantry'
    },
    'all-purpose flour': {
      pricePerPackage: 2.29,
      packageSize: 5,
      packageUnit: 'lb',
      baseUnit: 'lb',
      category: 'Pantry'
    },
    'ground cinnamon': {
      pricePerPackage: 1.19,
      packageSize: 2.37,
      packageUnit: 'oz',
      baseUnit: 'oz',
      category: 'Pantry'
    },
    'old-fashioned oats': {
      pricePerPackage: 3.49,
      packageSize: 42,
      packageUnit: 'oz',
      baseUnit: 'oz',
      category: 'Pantry'
    },
    'chocolate chips': {
      pricePerPackage: 1.89,
      packageSize: 12,
      packageUnit: 'oz',
      baseUnit: 'oz',
      category: 'Snack'
    }
  };

  const ingredientNames = [
    'bananas',
    'eggs',
    'butter',
    'granulated sugar',
    'vanilla extract',
    'all-purpose flour',
    'baking soda',
    'baking powder',
    'salt',
    'ground cinnamon',
    'chocolate chips',
    'old-fashioned oats'
  ];

  const ensuredIngredients = {};

  for (const name of ingredientNames) {
    const spec = ingredientDefinitions[name] ?? null;
    ensuredIngredients[name] = await ensureIngredient(name, spec);
  }

  const ingredientEntries = [
    {
      name: 'bananas',
      rawLine: '5 very ripe bananas, mashed',
      quantity: 5,
      unit: 'each'
    },
    {
      name: 'eggs',
      rawLine: '2 large eggs',
      quantity: 2,
      unit: 'each'
    },
    {
      name: 'butter',
      rawLine: '1/2 cup unsalted butter (melted)',
      quantity: 4,
      unit: 'oz'
    },
    {
      name: 'granulated sugar',
      rawLine: '3/4 cup granulated sugar',
      quantity: 0.75,
      unit: 'cup'
    },
    {
      name: 'vanilla extract',
      rawLine: '1 tsp vanilla extract',
      quantity: 1,
      unit: 'tsp'
    },
    {
      name: 'all-purpose flour',
      rawLine: '1 3/4 cups all-purpose flour',
      quantity: 1.75,
      unit: 'cup'
    },
    {
      name: 'baking soda',
      rawLine: '1 tsp baking soda',
      quantity: 1,
      unit: 'tsp'
    },
    {
      name: 'baking powder',
      rawLine: '1/2 tsp baking powder',
      quantity: 0.5,
      unit: 'tsp'
    },
    {
      name: 'salt',
      rawLine: '1/2 tsp salt',
      quantity: 0.5,
      unit: 'tsp'
    },
    {
      name: 'ground cinnamon',
      rawLine: '1 tsp ground cinnamon (optional)',
      quantity: 1,
      unit: 'tsp'
    },
    {
      name: 'chocolate chips',
      rawLine: '1/2 cup chocolate chips',
      quantity: 3,
      unit: 'oz'
    },
    {
      name: 'old-fashioned oats',
      rawLine: 'Optional topping: sprinkle of oats + cinnamon',
      quantity: 0,
      unit: 'oz',
      optional: true
    }
  ];

  const recipeIngredientsPayload = [];
  let totalCost = 0;

  for (const entry of ingredientEntries) {
    const ingredientRow = ensuredIngredients[entry.name];
    if (!ingredientRow) {
      throw new Error(`Missing ensured ingredient for ${entry.name}`);
    }

    const cost = entry.optional
      ? 0
      : computeIngredientCost(ingredientRow, entry.quantity, entry.unit, ingredientRow.item);

    totalCost += cost;

    recipeIngredientsPayload.push({
      ingredientId: ingredientRow.id,
      ingredientName: ingredientRow.item,
      quantity: entry.quantity,
      unit: entry.unit,
      rawLine: entry.rawLine,
      calculatedCost: cost,
      matchedWithFuzzy: false
    });
  }

  totalCost = roundCurrency(totalCost);
  const servings = 10;
  const costPerServing = servings ? roundCurrency(totalCost / servings) : null;

  const instructions = [
    'Preheat oven to 350°F. Grease a 9×5 loaf pan with butter or cooking spray.',
    'In a large bowl mash bananas until smooth, then stir in melted butter, sugar, eggs, and vanilla until just combined.',
    'In a separate bowl whisk together flour, baking soda, baking powder, salt, and cinnamon.',
    'Gently fold dry ingredients into the wet mixture until just combined. Toss chocolate chips with a teaspoon of flour and fold into batter.',
    'Pour batter into the prepared loaf pan. Sprinkle oats and a pinch of cinnamon on top if desired.',
    'Bake for 55–65 minutes until the center springs back and a toothpick comes out mostly clean (melted chocolate is fine). Tent with foil during the last 10 minutes if the top browns too quickly.',
    'Let bread cool in the pan for 10 minutes, then remove and finish cooling on a rack before slicing.'
  ].join('\n');

  const existingRecipe = await findRecipeByName(recipeName);
  const recipeId = existingRecipe?.id ?? randomUUID();

  const savedRecipe = await upsertRecipe({
    id: recipeId,
    name: recipeName,
    servings,
    category: 'Dessert',
    totalCost,
    costPerServing,
    instructions,
    sourceUrl: null,
    tags: ['Aldi', 'Baking', 'Banana Bread']
  });

  await replaceRecipeIngredients(savedRecipe.id, recipeIngredientsPayload);

  console.log('✅ Recipe upserted:', savedRecipe.name);
  console.log(`   ID: ${savedRecipe.id}`);
  console.log(`   Total cost: $${totalCost.toFixed(2)} (${costPerServing ? `$${costPerServing.toFixed(2)} per serving` : 'N/A'})`);
  console.log(`   Ingredients saved: ${recipeIngredientsPayload.length}`);
}

main().catch((error) => {
  console.error('❌ Failed to seed recipe:', error.message);
  if (error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
});

