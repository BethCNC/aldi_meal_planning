// Common unit variations and their normalized forms
const UNIT_MAP = {
  // Weight
  'lb': 'lb',
  'lbs': 'lb',
  'pound': 'lb',
  'pounds': 'lb',
  'oz': 'oz',
  'ounce': 'oz',
  'ounces': 'oz',
  'g': 'g',
  'gram': 'g',
  'grams': 'g',
  'kg': 'kg',
  'kilogram': 'kg',
  'kilograms': 'kg',
  
  // Volume
  'cup': 'cup',
  'cups': 'cup',
  'tbsp': 'tbsp',
  'tablespoon': 'tbsp',
  'tablespoons': 'tbsp',
  'tsp': 'tsp',
  'teaspoon': 'tsp',
  'teaspoons': 'tsp',
  'fl oz': 'fl oz',
  'fluid ounce': 'fl oz',
  'fluid ounces': 'fl oz',
  'ml': 'ml',
  'milliliter': 'ml',
  'milliliters': 'ml',
  'l': 'l',
  'liter': 'l',
  'liters': 'l',
  'pt': 'pint',
  'pint': 'pint',
  'pints': 'pint',
  'qt': 'quart',
  'quart': 'quart',
  'quarts': 'quart',
  'gal': 'gallon',
  'gallon': 'gallon',
  'gallons': 'gallon',
  
  // Count/Other
  'each': 'each',
  'ea': 'each',
  'whole': 'each',
  'head': 'each',
  'bunch': 'each',
  'stalk': 'each',
  'clove': 'each',
  'can': 'can',
  'cans': 'can',
  'jar': 'jar',
  'jars': 'jar',
  'bottle': 'bottle',
  'bottles': 'bottle',
  'bag': 'bag',
  'bags': 'bag',
  'pack': 'pack',
  'packs': 'pack',
  'package': 'pack',
  'packages': 'pack',
  'box': 'box',
  'boxes': 'box',
  'slice': 'slice',
  'slices': 'slice'
};

// Conversion factors to base units (g for weight, ml for volume, each for count)
const TO_BASE = {
  // Weight (base: g)
  'lb': 453.592,
  'oz': 28.3495,
  'kg': 1000,
  'g': 1,
  
  // Volume (base: ml)
  'gallon': 3785.41,
  'quart': 946.353,
  'pint': 473.176,
  'cup': 236.588,
  'fl oz': 29.5735,
  'tbsp': 14.7868,
  'tsp': 4.92892,
  'l': 1000,
  'ml': 1,
  
  // Count (base: each)
  'each': 1,
  'can': 1, // Assumes 1 can ~= 1 each for generic pricing if not specified
  'pack': 1,
  'bag': 1,
  'box': 1,
  'jar': 1,
  'bottle': 1
};

// Density approximations for volume <-> weight (g/ml)
const DENSITIES = {
  'water': 1,
  'milk': 1.03,
  'oil': 0.92,
  'flour': 0.59,
  'sugar': 0.85,
  'butter': 0.911,
  'rice': 0.8,
  'honey': 1.42,
  'default': 1 // Fallback
};

/**
 * Normalize unit string to standard format
 * @param {string} unit - Raw unit string
 * @returns {string|null} Normalized unit or null if not found
 */
export function normalizeUnit(unit) {
  if (!unit) return null;
  const lower = unit.toLowerCase().trim().replace(/\.$/, ''); // Remove trailing dot
  return UNIT_MAP[lower] || null;
}

/**
 * Convert quantity from one unit to another
 * @param {number} quantity - Amount to convert
 * @param {string} fromUnit - Source unit
 * @param {string} toUnit - Target unit
 * @param {string} ingredientName - Optional ingredient name for density adjustments
 * @returns {number|null} Converted quantity or null if impossible
 */
export function convertUnit(quantity, fromUnit, toUnit, ingredientName = '') {
  const normFrom = normalizeUnit(fromUnit);
  const normTo = normalizeUnit(toUnit);
  
  if (!normFrom || !normTo) return null;
  if (normFrom === normTo) return quantity;
  
  // Check if units are compatible (same type)
  const isWeight = (u) => ['g', 'kg', 'oz', 'lb'].includes(u);
  const isVolume = (u) => ['ml', 'l', 'tsp', 'tbsp', 'fl oz', 'cup', 'pint', 'quart', 'gallon'].includes(u);
  const isCount = (u) => !isWeight(u) && !isVolume(u); // Simplified count check
  
  // Same type conversions
  if (isWeight(normFrom) && isWeight(normTo)) {
    return (quantity * TO_BASE[normFrom]) / TO_BASE[normTo];
  }
  
  if (isVolume(normFrom) && isVolume(normTo)) {
    return (quantity * TO_BASE[normFrom]) / TO_BASE[normTo];
  }
  
  // Cross-type conversions (requires density estimation)
  // We'll use a very simple heuristic for now or fail
  // TODO: Implement better density lookup based on ingredientName
  
  // Fallback: If we can't convert perfectly, return null to signal manual check needed
  // Or for "each" vs weight, we might need average weights (e.g. 1 onion ~= 150g)
  
  return null;
}

/**
 * Calculate cost of an ingredient portion
 * @param {number} packagePrice - Price of the full package
 * @param {number} packageSize - Size of the package
 * @param {string} packageUnit - Unit of the package
 * @param {number} recipeQuantity - Quantity needed for recipe
 * @param {string} recipeUnit - Unit used in recipe
 * @param {string} ingredientName - Name of ingredient (for density context)
 * @returns {number|null} Estimated cost or null if calculation failed
 */
export function calculateIngredientCost(packagePrice, packageSize, packageUnit, recipeQuantity, recipeUnit, ingredientName) {
  if (!packagePrice || !packageSize || !recipeQuantity) return 0;
  
  const normPackageUnit = normalizeUnit(packageUnit);
  const normRecipeUnit = normalizeUnit(recipeUnit);
  
  // If units match or can be normalized to same
  if (normPackageUnit === normRecipeUnit) {
    return (packagePrice / packageSize) * recipeQuantity;
  }
  
  // Try conversion
  const convertedQty = convertUnit(recipeQuantity, recipeUnit, packageUnit, ingredientName);
  if (convertedQty !== null) {
    return (packagePrice / packageSize) * convertedQty;
  }
  
  // If conversion failed, try converting package to base and recipe to base independently if they share a dimension
  // (Logic covered inside convertUnit for same-type, this handles if convertUnit was strictly direct)
  
  // Special handling for common mismatches (e.g., lb vs oz is handled by convertUnit)
  // What about "1 bunch" vs "oz"? Difficult without specific data.
  
  // Final fallback: If we really can't convert, and it's a small amount, maybe return a fraction? 
  // Better to return null to indicate "Unknown" or return full package price if "each" involved?
  // Strategy: If one is "each" and other is weight/volume, assume we buy 1 package if quantity > 0
  
  if (normPackageUnit === 'each' || normRecipeUnit === 'each') {
    // If we need "2 onions" and package is "3 lb bag", we can't know cost easily without avg weight.
    // Conservative estimate: 1 package per distinct ingredient requirement?
    // For now, return null to show "Check Price"
    return null;
  }
  
  return null;
}

