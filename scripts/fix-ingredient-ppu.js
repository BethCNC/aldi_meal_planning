/**
 * Fix Ingredient PPU Calculator
 * 
 * Analyzes and fixes the aldi_ingredients_with_ppu.csv file to improve
 * Price Per Base Unit calculations for accurate recipe cost calculations.
 * 
 * Issues to fix:
 * 1. Base units should match recipe-common units (not always grams)
 * 2. Liquid items should use fluid oz or cups, not weight-based grams
 * 3. Fix incorrect package size values
 * 4. Fix categorization errors
 * 5. Remove duplicates
 * 6. Standardize PPU to most recipe-friendly unit
 */

import fs from 'fs';
import path from 'path';

const CSV_PATH = path.join(process.cwd(), 'data/prices/aldi_ingredients_with_ppu.csv');
const OUTPUT_PATH = path.join(process.cwd(), 'data/prices/aldi_ingredients_with_ppu_fixed.csv');

/**
 * Determine the best base unit for recipe cost calculations
 */
function determineBestBaseUnit(packageUnit, itemName, category) {
  const itemLower = itemName.toLowerCase();
  
  // Items sold "each" should stay "each"
  if (packageUnit.toLowerCase() === 'each') {
    return 'each';
  }
  
  // Liquid items - use fluid oz or cups (not weight)
  const liquidItems = ['juice', 'sauce', 'dressing', 'broth', 'oil', 'vinegar', 'soup', 'cream', 'milk', 'water', 'soda', 'soup'];
  if (liquidItems.some(liq => itemLower.includes(liq))) {
    if (packageUnit.toLowerCase() === 'oz') {
      return 'fl oz'; // Fluid ounces for liquids
    }
    return packageUnit; // Keep original if not oz
  }
  
  // For weight-based items, use the package unit (oz or lb) - not grams
  // Recipes typically use oz or lb, not grams
  if (['oz', 'lb', 'lbs'].includes(packageUnit.toLowerCase())) {
    return packageUnit.toLowerCase() === 'lbs' ? 'lb' : packageUnit.toLowerCase();
  }
  
  // Default: keep package unit
  return packageUnit.toLowerCase();
}

/**
 * Calculate PPU in the best unit for recipes
 */
function calculatePPU(pricePerPackage, packageSize, packageUnit, baseUnit) {
  if (!pricePerPackage || !packageSize || pricePerPackage === 0 || packageSize === 0) {
    return pricePerPackage; // Fallback to package price
  }
  
  // If base unit matches package unit, simple division
  if (packageUnit.toLowerCase() === baseUnit.toLowerCase()) {
    return pricePerPackage / packageSize;
  }
  
  // Handle "each" - price per item
  if (packageUnit.toLowerCase() === 'each' || baseUnit.toLowerCase() === 'each') {
    return pricePerPackage / packageSize;
  }
  
  // Handle fluid oz vs weight oz (approximate - 1 fl oz ≈ 1 oz weight for most liquids)
  if (packageUnit.toLowerCase() === 'oz' && baseUnit.toLowerCase() === 'fl oz') {
    // For most liquids, treat oz as fl oz
    return pricePerPackage / packageSize;
  }
  
  // Convert lb to oz
  if (packageUnit.toLowerCase() === 'lb' && baseUnit.toLowerCase() === 'oz') {
    const sizeInOz = packageSize * 16;
    return pricePerPackage / sizeInOz;
  }
  
  // Convert oz to lb
  if (packageUnit.toLowerCase() === 'oz' && baseUnit.toLowerCase() === 'lb') {
    const sizeInLb = packageSize / 16;
    return pricePerPackage / sizeInLb;
  }
  
  // Default: simple division
  return pricePerPackage / packageSize;
}

/**
 * Fix categorization errors
 */
function fixCategory(itemName, currentCategory) {
  const itemLower = itemName.toLowerCase();
  
  // Graham crackers shouldn't be in Meat
  if (itemLower.includes('graham cracker')) {
    return 'Snack';
  }
  
  // Pepperoni in Produce? Should be Meat or Other
  if (itemLower.includes('pepperoni')) {
    return 'Meat';
  }
  
  // Chicken broth shouldn't be in Meat (it's more of a Pantry item)
  if (itemLower.includes('chicken broth')) {
    return 'Pantry Staple';
  }
  
  // Egg noodles in Dairy? Should be Pantry
  if (itemLower.includes('egg noodle')) {
    return 'Pantry Staple';
  }
  
  return currentCategory;
}

/**
 * Fix package size errors
 */
function fixPackageSize(itemName, packageSize, packageUnit) {
  const itemLower = itemName.toLowerCase();
  
  // Ketchup says "38 oz" in name but package size is 8 oz
  if (itemLower.includes('ketchup') && itemLower.includes('38 oz')) {
    return 38.0; // Fix to match the name
  }
  
  return packageSize;
}

/**
 * Parse CSV line
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  
  return result;
}

/**
 * Format CSV line (handles quotes)
 */
function formatCSVLine(fields) {
  return fields.map(field => {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }).join(',');
}

/**
 * Main processing function
 */
function processCSV() {
  const content = fs.readFileSync(CSV_PATH, 'utf-8');
  const lines = content.trim().split('\n');
  const header = lines[0];
  const dataLines = lines.slice(1);
  
  const processed = [];
  const seenItems = new Set();
  const issues = [];
  
  for (const line of dataLines) {
    if (!line.trim()) continue;
    
    const fields = parseCSVLine(line);
    
    if (fields.length < 7) {
      issues.push(`Skipping malformed line: ${line.substring(0, 50)}...`);
      continue;
    }
    
    const itemName = fields[0].trim();
    const pricePerPackage = parseFloat(fields[1]) || 0;
    let packageSize = parseFloat(fields[2]) || 1;
    let packageUnit = fields[3].trim().toLowerCase();
    let baseUnit = fields[4].trim().toLowerCase();
    let category = fields[5].trim();
    const oldPPU = parseFloat(fields[6]) || 0;
    
    // Skip duplicates
    const itemKey = itemName.toLowerCase().trim();
    if (seenItems.has(itemKey)) {
      issues.push(`Removed duplicate: ${itemName}`);
      continue;
    }
    seenItems.add(itemKey);
    
    // Fix package size
    packageSize = fixPackageSize(itemName, packageSize, packageUnit);
    
    // Fix category
    category = fixCategory(itemName, category);
    
    // Determine best base unit for recipes
    const bestBaseUnit = determineBestBaseUnit(packageUnit, itemName, category);
    
    // Calculate correct PPU
    const newPPU = calculatePPU(pricePerPackage, packageSize, packageUnit, bestBaseUnit);
    
    // Normalize package unit (lbs -> lb)
    if (packageUnit === 'lbs') packageUnit = 'lb';
    
    // Create fixed row
    const fixedRow = [
      itemName,
      pricePerPackage.toFixed(2),
      packageSize.toFixed(1),
      packageUnit,
      bestBaseUnit,
      category,
      newPPU.toFixed(6)
    ];
    
    processed.push(fixedRow);
    
    // Track significant changes
    if (Math.abs(oldPPU - newPPU) > 0.001) {
      issues.push(`Updated ${itemName}: PPU ${oldPPU.toFixed(6)} → ${newPPU.toFixed(6)} (base unit: ${bestBaseUnit})`);
    }
    
    if (category !== fields[5].trim()) {
      issues.push(`Category fix: ${itemName} → ${category}`);
    }
  }
  
  // Write fixed CSV
  const outputLines = [header, ...processed.map(formatCSVLine)];
  fs.writeFileSync(OUTPUT_PATH, outputLines.join('\n') + '\n', 'utf-8');
  
  // Print summary
  console.log('\n✅ Fixed CSV created:', OUTPUT_PATH);
  console.log(`\n📊 Summary:`);
  console.log(`   Original items: ${dataLines.length}`);
  console.log(`   Processed items: ${processed.length}`);
  console.log(`   Issues found/fixed: ${issues.length}`);
  
  console.log(`\n🔍 Key Changes:`);
  const significantChanges = issues.filter(i => i.includes('Updated') || i.includes('Category') || i.includes('duplicate'));
  significantChanges.slice(0, 20).forEach(issue => console.log(`   ${issue}`));
  if (significantChanges.length > 20) {
    console.log(`   ... and ${significantChanges.length - 20} more changes`);
  }
  
  console.log(`\n📝 Next steps:`);
  console.log(`   1. Review the fixed file: ${OUTPUT_PATH}`);
  console.log(`   2. Verify the changes look correct`);
  console.log(`   3. Replace the original file if satisfied`);
  console.log(`   4. Re-run recipe cost calculations`);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  processCSV();
}

export { processCSV, determineBestBaseUnit, calculatePPU };
