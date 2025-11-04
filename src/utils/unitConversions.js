/**
 * Unit Conversion Utilities
 * 
 * Handles conversions between different measurement units
 * for accurate cost calculations
 */

/**
 * Convert quantity from one unit to another
 * @param {number} quantity - Amount to convert
 * @param {string} fromUnit - Source unit (lb, oz, cup, etc.)
 * @param {string} toUnit - Target unit
 * @param {string} ingredient - Optional ingredient name for density-based conversions
 * @returns {number} Converted quantity
 */
export function convertUnit(quantity, fromUnit, toUnit, ingredient = null) {
  if (!fromUnit || !toUnit || fromUnit.toLowerCase() === toUnit.toLowerCase()) {
    return quantity;
  }
  
  const from = fromUnit.toLowerCase();
  const to = toUnit.toLowerCase();
  
  // Weight conversions
  if (isWeightUnit(from) && isWeightUnit(to)) {
    return convertWeight(quantity, from, to);
  }
  
  // Volume conversions
  if (isVolumeUnit(from) && isVolumeUnit(to)) {
    return convertVolume(quantity, from, to);
  }
  
  // Weight to Volume (or vice versa) - needs ingredient density
  if ((isWeightUnit(from) && isVolumeUnit(to)) || (isVolumeUnit(from) && isWeightUnit(to))) {
    return convertWeightToVolume(quantity, from, to, ingredient);
  }
  
  // Same type but different units (oz vs lb) - handled above
  // If can't convert, return original
  return quantity;
}

/**
 * Check if unit is a weight unit
 */
function isWeightUnit(unit) {
  return ['g', 'kg', 'oz', 'lb', 'lbs', 'pound', 'pounds'].includes(unit.toLowerCase());
}

/**
 * Check if unit is a volume unit
 */
function isVolumeUnit(unit) {
  return ['ml', 'l', 'cup', 'cups', 'tbsp', 'tsp', 'tablespoon', 'teaspoon', 'fl oz', 'oz'].includes(unit.toLowerCase());
}

/**
 * Convert weight units
 */
function convertWeight(quantity, from, to) {
  // Convert to grams first, then to target
  const toGrams = {
    'g': 1,
    'kg': 1000,
    'oz': 28.35,
    'lb': 453.6,
    'lbs': 453.6,
    'pound': 453.6,
    'pounds': 453.6
  };
  
  const fromGrams = {
    'g': 1,
    'kg': 1000,
    'oz': 28.35,
    'lb': 453.6,
    'lbs': 453.6,
    'pound': 453.6,
    'pounds': 453.6
  };
  
  const grams = quantity * (fromGrams[from] || 1);
  return grams / (toGrams[to] || 1);
}

/**
 * Convert volume units
 */
function convertVolume(quantity, from, to) {
  // Convert to ml first, then to target
  const toMl = {
    'ml': 1,
    'l': 1000,
    'cup': 236.6,
    'cups': 236.6,
    'tbsp': 14.79,
    'tsp': 4.93,
    'tablespoon': 14.79,
    'teaspoon': 4.93,
    'fl oz': 29.57,
    'oz': 29.57 // Assuming fluid oz
  };
  
  const fromMl = {
    'ml': 1,
    'l': 1000,
    'cup': 236.6,
    'cups': 236.6,
    'tbsp': 14.79,
    'tsp': 4.93,
    'tablespoon': 14.79,
    'teaspoon': 4.93,
    'fl oz': 29.57,
    'oz': 29.57
  };
  
  const ml = quantity * (fromMl[from] || 1);
  return ml / (toMl[to] || 1);
}

/**
 * Convert weight to volume (or vice versa) using ingredient density
 */
function convertWeightToVolume(quantity, from, to, ingredient) {
  // Ingredient densities (grams per cup for dry, or ml per gram for liquids)
  const densities = {
    // Dry ingredients (cups per pound approximate)
    'rice': {cup: 2.5, lb: 1}, // ~2.5 cups per lb
    'pasta': {cup: 2.5, lb: 1},
    'flour': {cup: 3.5, lb: 1},
    'sugar': {cup: 2, lb: 1},
    'cheese': {cup: 4, lb: 1}, // shredded
    
    // Liquids (approximately 1:1 for water-based)
    'milk': {cup: 1, lb: 0.968}, // ~1 cup = 0.968 lb
    'water': {cup: 1, lb: 0.968},
    
    // Common ingredients
    'butter': {cup: 2, lb: 1}, // ~2 cups = 1 lb
    'onion': {cup: 3, lb: 1}, // chopped
    'tomato': {cup: 2.5, lb: 1}, // chopped
  };
  
  // Try to find ingredient in density table
  const ingLower = ingredient?.toLowerCase() || '';
  let density = null;
  
  for (const [key, value] of Object.entries(densities)) {
    if (ingLower.includes(key)) {
      density = value;
      break;
    }
  }
  
  if (!density) {
    // Default assumptions
    if (isWeightUnit(from)) {
      // Weight to volume - assume similar to water for liquids, or use generic
      if (ingLower.includes('liquid') || ingLower.includes('milk') || ingLower.includes('water')) {
        return quantity * 2; // Rough: 1 lb ≈ 2 cups for liquids
      }
      return quantity * 2.5; // Rough: 1 lb ≈ 2.5 cups for dry ingredients
    } else {
      // Volume to weight
      if (ingLower.includes('liquid') || ingLower.includes('milk') || ingLower.includes('water')) {
        return quantity * 0.5; // Rough: 1 cup ≈ 0.5 lb for liquids
      }
      return quantity * 0.4; // Rough: 1 cup ≈ 0.4 lb for dry ingredients
    }
  }
  
  // Use density conversion
  if (isWeightUnit(from) && isVolumeUnit(to)) {
    // Weight to volume (e.g., lb to cup)
    const cupsPerLb = density.cup || 2.5;
    const quantityInLb = convertWeight(quantity, from, 'lb');
    const cups = quantityInLb * cupsPerLb;
    return convertVolume(cups, 'cup', to);
  } else if (isVolumeUnit(from) && isWeightUnit(to)) {
    // Volume to weight (e.g., cup to lb)
    const quantityInCups = convertVolume(quantity, from, 'cup');
    const cupsPerLb = density.cup || 2.5;
    const lbs = quantityInCups / cupsPerLb;
    return convertWeight(lbs, 'lb', to);
  }
  
  return quantity;
}

/**
 * Calculate price per unit from package info
 * @param {number} pricePerPackage - Price of entire package
 * @param {number} packageSize - Size of package
 * @param {string} packageUnit - Unit of package size
 * @param {string} targetUnit - Unit to calculate price for (default: same as package)
 * @returns {number} Price per target unit
 */
export function calculatePricePerUnit(pricePerPackage, packageSize, packageUnit, targetUnit = null) {
  if (!pricePerPackage || !packageSize || pricePerPackage === 0 || packageSize === 0) {
    return null;
  }
  
  if (!targetUnit || packageUnit.toLowerCase() === targetUnit.toLowerCase()) {
    return pricePerPackage / packageSize;
  }
  
  // If units are different, convert
  const convertedSize = convertUnit(packageSize, packageUnit, targetUnit);
  if (convertedSize === packageSize) {
    // Conversion failed, return per original unit
    return pricePerPackage / packageSize;
  }
  
  return pricePerPackage / convertedSize;
}

/**
 * Calculate cost for ingredient based on quantity needed
 * @param {number} pricePerPackage - Price of package
 * @param {number} packageSize - Size of package
 * @param {string} packageUnit - Unit of package
 * @param {number} quantityNeeded - Quantity recipe needs
 * @param {string} quantityUnit - Unit of quantity needed
 * @param {string} ingredientName - Optional, for density conversions
 * @returns {number} Cost for the quantity needed
 */
export function calculateIngredientCost(pricePerPackage, packageSize, packageUnit, quantityNeeded, quantityUnit, ingredientName = null) {
  if (!pricePerPackage || pricePerPackage === 0) {
    return 0;
  }
  
  // If no quantity specified, assume 1 package
  if (!quantityNeeded || (quantityNeeded === 1 && !quantityUnit)) {
    return pricePerPackage;
  }
  
  // If no package size, can't calculate partial - return full package price
  if (!packageSize || packageSize === 0) {
    return pricePerPackage;
  }
  
  // Convert quantity needed to package unit
  let quantityInPackageUnits;
  
  if (!quantityUnit || quantityUnit.toLowerCase() === packageUnit.toLowerCase()) {
    quantityInPackageUnits = quantityNeeded;
  } else {
    quantityInPackageUnits = convertUnit(quantityNeeded, quantityUnit, packageUnit, ingredientName);
  }
  
  // Calculate how many packages needed
  const packagesNeeded = quantityInPackageUnits / packageSize;
  
  // Round up (can't buy partial packages)
  const packagesToBuy = Math.ceil(packagesNeeded);
  
  // Cost is price per package × packages needed
  return pricePerPackage * packagesToBuy;
}

/**
 * Parse unit string to standardize
 */
export function normalizeUnit(unit) {
  if (!unit) return null;
  
  const normalized = unit.toLowerCase().trim();
  
  // Common variations
  const mappings = {
    'lbs': 'lb',
    'pound': 'lb',
    'pounds': 'lb',
    'ounce': 'oz',
    'ounces': 'oz',
    'fluid ounce': 'fl oz',
    'fluid ounces': 'fl oz',
    'cup': 'cup',
    'cups': 'cup',
    'tablespoon': 'tbsp',
    'tablespoons': 'tbsp',
    'teaspoon': 'tsp',
    'teaspoons': 'tsp',
    'liter': 'l',
    'liters': 'l',
    'milliliter': 'ml',
    'milliliters': 'ml',
    'gram': 'g',
    'grams': 'g',
    'kilogram': 'kg',
    'kilograms': 'kg',
    'piece': 'each',
    'pieces': 'each',
    'item': 'each',
    'items': 'each',
    'count': 'each'
  };
  
  return mappings[normalized] || normalized;
}
