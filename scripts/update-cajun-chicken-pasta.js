import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

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
  normalizeUnit,
  calculateIngredientCost
} from '../backend/utils/unitConversions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config();

const RECIPE_NAME = 'Easy One Pot Cajun Chicken Pasta Recipe - Savvy Bites';

const INSTRUCTIONS = [
  'Prepare the chicken: Cut into 2.5 cm cubes and toss with 2 tablespoons Cajun spice.',
  'Sear: Heat olive oil in a high-sided skillet over medium-high. Sear chicken until golden and cooked through. Remove and set aside.',
  'Aromatics: In the same pan, sauté garlic and onion until fragrant and translucent. Deglaze with a splash of water if needed.',
  'Sauce base: Add chopped tomatoes and remaining 1 tablespoon Cajun spice. Simmer 5 minutes.',
  'Cream + lemon: Stir in cream and half the lemon juice. Taste and add more lemon if you prefer brighter sauce. Return chicken to warm through.',
  'Pasta: Cook pasta per package. Drain and add to sauce, tossing to coat. Mix in chopped coriander.',
  'Serve: Plate and top with grated parmesan.'
].join('\n');

const INGREDIENT_CONFIGS = [
  {
    rawLine: '2 tablespoons olive oil',
    quantity: 2,
    unit: 'tbsp',
    searchTerm: 'olive oil'
  },
  {
    rawLine: '3 tablespoons Cajun seasoning',
    quantity: 3,
    unit: 'tbsp',
    searchTerm: 'cajun seasoning',
    fallback: {
      item: 'cajun seasoning',
      pricePerPackage: 1.95,
      packageSize: 2.12,
      packageUnit: 'oz',
      baseUnit: 'oz',
      category: 'Pantry'
    }
  },
  {
    rawLine: '300 g chicken breast',
    quantity: 300,
    unit: 'g',
    searchTerm: 'chicken breasts'
  },
  {
    rawLine: '3 cloves garlic, minced',
    quantity: 3,
    unit: 'each',
    searchTerm: 'garlic'
  },
  {
    rawLine: '1 brown onion, diced',
    quantity: 1,
    unit: 'each',
    searchTerm: 'onions'
  },
  {
    rawLine: '400 g chopped tomatoes',
    quantity: 400,
    unit: 'g',
    searchTerm: 'tomato sauce',
    fallback: {
      item: 'tomatoes, diced canned',
      pricePerPackage: 0.72,
      packageSize: 14.5,
      packageUnit: 'oz',
      baseUnit: 'oz',
      category: 'Pantry'
    }
  },
  {
    rawLine: '200 ml heavy cream',
    quantity: 200,
    unit: 'ml',
    searchTerm: 'heavy cream'
  },
  {
    rawLine: 'Juice of 1 lemon',
    quantity: 1,
    unit: 'each',
    searchTerm: 'lemons'
  },
  {
    rawLine: '300 g penne pasta',
    quantity: 300,
    unit: 'g',
    searchTerm: 'pasta'
  },
  {
    rawLine: '1/2 bunch cilantro, chopped',
    quantity: 0.5,
    unit: 'each',
    searchTerm: 'cilantro',
    fallback: {
      item: 'cilantro',
      pricePerPackage: 0.89,
      packageSize: 1,
      packageUnit: 'each',
      baseUnit: 'each',
      category: 'Produce (Fruit/Vegetable)'
    }
  },
  {
    rawLine: '25 g parmesan cheese, grated',
    quantity: 25,
    unit: 'g',
    searchTerm: 'parmesan cheese (grated)'
  }
];

function formatCurrency(value) {
  return `$${(value || 0).toFixed(2)}`;
}

async function ensureIngredient(config) {
  const results = await searchIngredientsByName(config.searchTerm, { limit: 2 });
  if (results.length > 0) {
    return normalizeIngredientRow(results[0]);
  }

  if (!config.fallback) {
    throw new Error(`Ingredient "${config.searchTerm}" not found and no fallback data provided.`);
  }

  const unit = normalizeUnit(config.fallback.packageUnit) || config.fallback.packageUnit;
  const base = normalizeUnit(config.fallback.baseUnit) || unit || null;

  const created = await upsertIngredient({
    item: config.fallback.item,
    pricePerPackage: config.fallback.pricePerPackage,
    packageSize: config.fallback.packageSize,
    packageUnit: unit,
    baseUnit: base,
    pricePerBaseUnit: config.fallback.pricePerPackage && config.fallback.packageSize
      ? config.fallback.pricePerPackage / config.fallback.packageSize
      : null,
    category: config.fallback.category
  });

  console.log(`➕ Created ingredient "${created.item}" at ${formatCurrency(created.pricePerPackage)}.`);
  return created;
}

function computeCost(ingredient, quantity, unit) {
  if (!ingredient) return 0;
  const normalizedUnit = unit ? normalizeUnit(unit) || unit : null;
  const packageUnit = ingredient.packageUnit ? normalizeUnit(ingredient.packageUnit) || ingredient.packageUnit : null;
  const baseUnit = ingredient.baseUnit ? normalizeUnit(ingredient.baseUnit) || ingredient.baseUnit : null;

  const packagesCost = ingredient.pricePerPackage && ingredient.packageSize
    ? calculateIngredientCost(
        ingredient.pricePerPackage,
        ingredient.packageSize,
        packageUnit || baseUnit || normalizedUnit || 'each',
        quantity ?? 1,
        normalizedUnit || baseUnit || packageUnit || 'each',
        ingredient.item
      )
    : null;

  if (packagesCost && packagesCost > 0) return Math.round(packagesCost * 100) / 100;

  if (ingredient.pricePerBaseUnit && quantity && (!normalizedUnit || (baseUnit && baseUnit === normalizedUnit))) {
    return Math.round(ingredient.pricePerBaseUnit * quantity * 100) / 100;
  }

  return Math.round((ingredient.pricePerPackage || 0) * 100) / 100;
}

async function run() {
  const recipe = await findRecipeByName(RECIPE_NAME);
  if (!recipe) {
    throw new Error(`Recipe "${RECIPE_NAME}" not found in Supabase.`);
  }

  const servings = recipe.servings || 4;

  const ingredientEntries = [];
  let totalCost = 0;

  for (const config of INGREDIENT_CONFIGS) {
    const ingredient = await ensureIngredient(config);
    const normalized = normalizeIngredientRow(ingredient);
    const cost = computeCost(
      normalized,
      config.quantity,
      config.unit
    );

    totalCost += cost || 0;

    ingredientEntries.push({
      ingredientId: normalized.id,
      ingredientName: normalized.item,
      quantity: config.quantity,
      unit: config.unit ? normalizeUnit(config.unit) || config.unit : null,
      rawLine: config.rawLine,
      calculatedCost: cost,
      matchedWithFuzzy: false
    });
  }

  totalCost = Math.round(totalCost * 100) / 100;
  const costPerServing = Math.round((totalCost / servings) * 100) / 100;

  console.log('\n📋 Ingredient summary:');
  ingredientEntries.forEach((entry) => {
    console.log(`  - ${entry.rawLine} → ${entry.ingredientName} (${formatCurrency(entry.calculatedCost)})`);
  });

  console.log(`\n💰 Total cost: ${formatCurrency(totalCost)} (≈ ${formatCurrency(costPerServing)} per serving)`);

  await replaceRecipeIngredients(recipe.id, ingredientEntries);

  await upsertRecipe({
    id: recipe.id,
    name: RECIPE_NAME,
    servings,
    category: recipe.category || 'Chicken',
    totalCost,
    costPerServing,
    instructions: INSTRUCTIONS,
    sourceUrl: recipe.source_url || recipe.sourceUrl || null,
    imageUrl: recipe.image_url || recipe.imageUrl || null,
    tags: recipe.tags
  });

  console.log('\n✅ Recipe updated with calculated costs and detailed instructions.');
}

run().catch((error) => {
  console.error('❌ Failed to update recipe:', error.message);
  process.exit(1);
});



