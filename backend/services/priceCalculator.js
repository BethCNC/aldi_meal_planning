import { getRecipeIngredients } from '../supabase/recipeClient.js';
import { getIngredientById } from '../supabase/ingredientClient.js';
import { convertUnit } from '../utils/unitConversions.js';

/**
 * Calculate cost for a single recipe based on ingredients
 * @param {string} recipeId
 * @returns {Promise<{totalCost: number, breakdown: Array}>}
 */
export async function calculateRecipeCost(recipeId) {
  const ingredients = await getRecipeIngredients(recipeId);
  if (!ingredients || ingredients.length === 0) {
    return { totalCost: 0, breakdown: [] };
  }

  let totalCost = 0;
  const breakdown = [];

  for (const ri of ingredients) {
    const ingredient = ri.ingredient;
    if (!ingredient) continue;

    // Use integer pricing if available, fallback to float
    const priceCents = ingredient.aldiPriceCents ?? (ingredient.pricePerPackage * 100);
    const packageSize = ingredient.packageSize;
    const packageUnit = ingredient.packageUnit;

    if (!priceCents || !packageSize) {
      breakdown.push({
        ingredient: ingredient.item,
        cost: 0,
        note: 'Missing pricing data'
      });
      continue;
    }

    const quantityNeeded = ri.quantity;
    const unitNeeded = ri.unit;

    // Convert needed quantity to package unit
    let quantityInPackageUnits = quantityNeeded;
    try {
      if (unitNeeded && packageUnit && unitNeeded.toLowerCase() !== packageUnit.toLowerCase()) {
        quantityInPackageUnits = convertUnit(quantityNeeded, unitNeeded, packageUnit, ingredient.item);
      }
    } catch (e) {
      console.warn(`Unit conversion failed for ${ingredient.item}: ${e.message}`);
      // Fallback: assume 1:1 if conversion fails or units incompatible (simple approximation)
    }

    // Calculate portion of package used (for single recipe cost estimation, we usually don't round up per ingredient unless buying strictly for this)
    // However, for accurate "shopping list" cost, we round up. 
    // For single recipe *value*, we might want pro-rated cost.
    // TDD says: "Costing: Math.ceil(total_quantity) * aldi_price_cents" -> This implies shopping list context.
    // But for a single recipe in isolation, pro-rated is often more useful for comparison.
    // Let's stick to the TDD philosophy: "Quantitative Logic... Calculating exact costs".
    // If I buy ingredients for ONE recipe, I pay for full packages.
    
    const packagesNeeded = Math.ceil(quantityInPackageUnits / packageSize);
    const costCents = packagesNeeded * priceCents;
    const costDollars = costCents / 100;

    totalCost += costDollars;
    breakdown.push({
      ingredient: ingredient.item,
      quantity: quantityNeeded,
      unit: unitNeeded,
      packages: packagesNeeded,
      cost: costDollars
    });
  }

  return { totalCost, breakdown };
}

/**
 * Aggregate ingredients across multiple recipes and calculate total plan cost
 * @param {Array<string>} recipeIds
 * @returns {Promise<{totalCost: number, groceryList: Array}>}
 */
export async function calculatePlanCost(recipeIds) {
  const aggregated = await aggregateIngredients(recipeIds);
  
  let totalCostCents = 0;
  const pricedIngredients = [];

  for (const item of aggregated) {
    const { ingredient, totalQuantity, units } = item;
    
    const priceCents = ingredient.aldiPriceCents ?? (ingredient.pricePerPackage * 100);
    const packageSize = ingredient.packageSize;
    const packageUnit = ingredient.packageUnit;

    if (!priceCents || !packageSize) {
      pricedIngredients.push({
        ...item,
        cost: 0,
        missingPrice: true
      });
      continue;
    }

    // Normalize quantity to package unit
    // Note: 'totalQuantity' here implies we've already normalized units in aggregateIngredients, 
    // or we have mixed units that need conversion.
    // Let's ensure aggregateIngredients handles normalization to Base Unit or Package Unit.
    
    // For simplicity, aggregateIngredients should return normalized quantities relative to the ingredient's preferred unit.
    
    const packagesNeeded = Math.ceil(totalQuantity / packageSize);
    const itemCostCents = packagesNeeded * priceCents;
    
    totalCostCents += itemCostCents;
    
    pricedIngredients.push({
      ...item,
      packagesToBuy: packagesNeeded,
      cost: itemCostCents / 100
    });
  }

  return {
    totalCost: totalCostCents / 100,
    groceryList: pricedIngredients
  };
}

/**
 * Helper to aggregate ingredients from recipes
 * @param {Array<string>} recipeIds
 * @returns {Promise<Array>}
 */
export async function aggregateIngredients(recipeIds) {
  const ingredientMap = new Map();

  for (const recipeId of recipeIds) {
    const ingredients = await getRecipeIngredients(recipeId);
    
    for (const ri of ingredients) {
      const ingId = ri.ingredient_id;
      const ingredient = ri.ingredient;
      
      if (!ingredientMap.has(ingId)) {
        ingredientMap.set(ingId, {
          ingredient,
          quantity: 0, // In package units
          originalUnits: [] // Track original for display
        });
      }

      const entry = ingredientMap.get(ingId);
      
      // Normalize to package unit
      let normalizedQty = ri.quantity;
      if (ri.unit && ingredient.packageUnit && ri.unit.toLowerCase() !== ingredient.packageUnit.toLowerCase()) {
        try {
          normalizedQty = convertUnit(ri.quantity, ri.unit, ingredient.packageUnit, ingredient.item);
        } catch (e) {
          console.warn(`Aggregation conversion failed: ${e.message}`);
        }
      }
      
      entry.quantity += normalizedQty;
      entry.originalUnits.push({ qty: ri.quantity, unit: ri.unit });
    }
  }

  return Array.from(ingredientMap.values()).map(entry => ({
    ingredient: entry.ingredient,
    totalQuantity: entry.quantity, // In package units
    unit: entry.ingredient.packageUnit,
    usageDetails: entry.originalUnits
  }));
}

