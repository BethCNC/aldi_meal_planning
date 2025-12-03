import { supabase } from '../lib/supabase';
import { calculateIngredientCost, normalizeUnit } from '../utils/unitConversions.js';

const roundCurrency = (value) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 0;
  }
  return Math.round(value * 100) / 100;
};

const buildIngredientCost = (ingredientRow) => {
  if (!ingredientRow) {
    return null;
  }

  const {
    price_per_package: pricePerPackage,
    package_size: packageSize,
    package_unit: packageUnit,
    price_per_base_unit: pricePerBaseUnit,
    base_unit: baseUnit,
    item: ingredientName,
  } = ingredientRow;

  // Derive missing package data when possible
  const resolvedPackageSize = packageSize || (pricePerPackage && pricePerBaseUnit
    ? pricePerPackage / pricePerBaseUnit
    : null);

  const resolvedPricePerPackage = pricePerPackage || (pricePerBaseUnit && resolvedPackageSize
    ? pricePerBaseUnit * resolvedPackageSize
    : null);

  const resolvedPackageUnit = packageUnit || baseUnit || null;

  return {
    pricePerPackage: resolvedPricePerPackage,
    packageSize: resolvedPackageSize,
    packageUnit: resolvedPackageUnit,
    pricePerBaseUnit,
    baseUnit,
    ingredientName,
  };
};

export async function fetchRecipeWithIngredients(recipeId) {
  const [{ data: recipe, error: recipeError }, { data: ingredients, error: ingredientsError }] = await Promise.all([
    supabase
      .from('recipes')
      .select('*')
      .eq('id', recipeId)
      .single(),
    supabase
      .from('recipe_ingredients')
      .select(`
        id,
        ingredient_id,
        quantity,
        unit,
        ingredient_name,
        calculated_cost,
        ingredient:ingredients (
          id,
          item,
          price_per_package,
          package_size,
          package_unit,
          price_per_base_unit,
          base_unit
        )
      `)
      .eq('recipe_id', recipeId),
  ]);

  if (recipeError) throw recipeError;
  if (ingredientsError) throw ingredientsError;

  return { recipe, ingredients: ingredients || [] };
}

export function computeRecipeCost(recipe, ingredientRows) {
  if (!recipe) {
    throw new Error('Recipe data is required to calculate cost');
  }

  const servings = recipe.servings || null;
  let runningTotal = 0;

  const breakdown = (ingredientRows || []).map((row) => {
    const quantityNeeded = row.quantity || 0;
    const quantityUnit = row.unit || null;
    const parsedUnit = normalizeUnit(quantityUnit) || quantityUnit || null;
    const existingCost = row.calculated_cost;

    let cost = existingCost;

    if ((cost === null || cost === undefined) && row.ingredient) {
      const pricing = buildIngredientCost(row.ingredient);

      if (pricing?.pricePerPackage && pricing.packageSize) {
        const packageUnit = pricing.packageUnit || parsedUnit || 'each';
        const needUnit = parsedUnit || pricing.packageUnit || 'each';

        cost = calculateIngredientCost(
          pricing.pricePerPackage,
          pricing.packageSize,
          packageUnit,
          quantityNeeded,
          needUnit,
          pricing.ingredientName
        );
      } else if (pricing?.pricePerBaseUnit && quantityNeeded) {
        // Fallback: use price per base unit when package data is missing but quantity matches base unit
        const baseUnitNormalized = pricing.baseUnit ? normalizeUnit(pricing.baseUnit) : null;
        if (!parsedUnit || (baseUnitNormalized && baseUnitNormalized === parsedUnit)) {
          cost = pricing.pricePerBaseUnit * quantityNeeded;
        }
      } else if (pricing?.pricePerPackage) {
        // Without package size we fall back to full package price when quantity is specified
        cost = quantityNeeded > 0 ? pricing.pricePerPackage : 0;
      }
    }

    const resolvedCost = roundCurrency(cost || 0);
    runningTotal += resolvedCost;

    return {
      id: row.id,
      ingredientId: row.ingredient_id,
      ingredientName: row.ingredient_name || row.ingredient?.item,
      quantity: quantityNeeded,
      unit: quantityUnit,
      cost: resolvedCost,
    };
  });

  const totalCost = roundCurrency(runningTotal);
  const costPerServing = servings ? roundCurrency(runningTotal / servings) : null;

  return {
    totalCost,
    costPerServing,
    servings,
    breakdown,
  };
}

export async function calculateRecipeCost(recipeId, { persist = false } = {}) {
  const { recipe, ingredients } = await fetchRecipeWithIngredients(recipeId);
  const calculation = computeRecipeCost(recipe, ingredients);

  if (persist) {
    await supabase
      .from('recipes')
      .update({
        total_cost: calculation.totalCost,
        cost_per_serving: calculation.costPerServing,
        updated_at: new Date().toISOString(),
      })
      .eq('id', recipeId);
  }

  return {
    recipe: {
      ...recipe,
      total_cost: calculation.totalCost,
      cost_per_serving: calculation.costPerServing,
    },
    breakdown: calculation.breakdown,
  };
}

export async function calculateRecipeCostsBulk({ persist = false } = {}) {
  const { data: recipes, error } = await supabase
    .from('recipes')
    .select('id');

  if (error) throw error;

  const results = [];

  for (const entry of recipes) {
    try {
      const result = await calculateRecipeCost(entry.id, { persist });
      results.push({ recipeId: entry.id, status: 'success', totalCost: result.recipe.total_cost });
    } catch (err) {
      console.error(`Failed to calculate cost for recipe ${entry.id}:`, err.message);
      results.push({ recipeId: entry.id, status: 'error', message: err.message });
    }
  }

  return results;
}
