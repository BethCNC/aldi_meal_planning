/**
 * Compare Extra Pricing CSV with Main Ingredients Table
 * 
 * Verifies which items from the extra pricing file are already in the main table
 * and identifies missing items that should be added.
 */

import fs from 'fs';
import path from 'path';

const MAIN_CSV = path.join(process.cwd(), 'data/prices/aldi_ingredients_with_ppu.csv');
const EXTRA_CSV = path.join(process.cwd(), 'data/prices/extra aldi pricing - aldi_missing_pricing_seed (1).csv');
const OUTPUT_CSV = path.join(process.cwd(), 'data/prices/missing_items_to_add.csv');

/**
 * Normalize item name for comparison
 */
function normalizeName(name) {
  return name.toLowerCase()
    .replace(/[",]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\s*"|"\s*$/g, ''); // Remove quotes
}

/**
 * Extract core item name (remove descriptors)
 */
function getCoreName(name) {
  const normalized = normalizeName(name);
  // Remove common descriptors
  return normalized
    .replace(/^(fresh|dried|frozen|canned|shredded|grated|chopped|sliced|whole|ground)\s+/i, '')
    .replace(/\s*\(.*?\)\s*/g, '') // Remove parentheses content
    .replace(/\s*\d+\s*(oz|lb|lbs|ct|each|fl oz).*$/i, '') // Remove size descriptors
    .replace(/\s+per\s+\w+.*$/i, '') // Remove "per lb", etc.
    .trim();
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
 * Read and parse main CSV
 */
function readMainCSV() {
  const content = fs.readFileSync(MAIN_CSV, 'utf-8');
  const lines = content.trim().split('\n');
  const items = new Map();
  
  // Skip header
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const fields = parseCSVLine(line);
    if (fields.length < 7) continue;
    
    const itemName = fields[0].trim();
    const normalized = normalizeName(itemName);
    const core = getCoreName(itemName);
    
    items.set(itemName, {
      normalized,
      core,
      price: parseFloat(fields[1]) || 0,
      packageSize: parseFloat(fields[2]) || 0,
      packageUnit: fields[3].trim(),
      baseUnit: fields[4].trim(),
      category: fields[5].trim(),
      ppu: parseFloat(fields[6]) || 0
    });
  }
  
  return items;
}

/**
 * Read and parse extra pricing CSV
 */
function readExtraCSV() {
  const content = fs.readFileSync(EXTRA_CSV, 'utf-8');
  const lines = content.trim().split('\n');
  const items = [];
  
  // Skip header
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const fields = parseCSVLine(line);
    if (fields.length < 7) continue;
    
    const itemName = fields[0].trim();
    const priceStr = fields[4].replace('$', '').trim();
    const price = parseFloat(priceStr) || 0;
    
    items.push({
      itemName,
      normalized: normalizeName(itemName),
      core: getCoreName(itemName),
      brand: fields[1].trim(),
      packageSize: parseFloat(fields[2]) || 0,
      packageUnit: fields[3].trim(),
      price,
      notes: fields[5].trim(),
      collectedAt: fields[6].trim()
    });
  }
  
  return items;
}

/**
 * Find matching item in main CSV
 */
function findMatch(extraItem, mainItems) {
  const exactMatch = mainItems.get(extraItem.itemName);
  if (exactMatch) {
    return { matched: true, type: 'exact', item: exactMatch };
  }
  
  // Try normalized match
  for (const [name, item] of mainItems.entries()) {
    if (item.normalized === extraItem.normalized) {
      return { matched: true, type: 'normalized', item, name };
    }
  }
  
  // Try core name match
  for (const [name, item] of mainItems.entries()) {
    if (item.core === extraItem.core && item.core.length > 2) {
      return { matched: true, type: 'core', item, name };
    }
  }
  
  // Try partial match
  for (const [name, item] of mainItems.entries()) {
    if (extraItem.normalized.includes(item.core) || item.core.includes(extraItem.normalized)) {
      return { matched: true, type: 'partial', item, name };
    }
  }
  
  return { matched: false };
}

/**
 * Determine category for new item
 */
function determineCategory(itemName) {
  const name = itemName.toLowerCase();
  
  if (name.includes('chicken') || name.includes('turkey') || name.includes('beef') || 
      name.includes('pork') || name.includes('sausage') || name.includes('bacon') ||
      name.includes('meat') || name.includes('ravioli')) {
    return 'Meat';
  }
  
  if (name.includes('cheese') || name.includes('milk') || name.includes('cream') ||
      name.includes('yogurt') || name.includes('butter')) {
    return 'Dairy';
  }
  
  if (name.includes('pepper') || name.includes('tomato') || name.includes('potato') ||
      name.includes('lettuce') || name.includes('salad') || name.includes('greens') ||
      name.includes('pepper') || name.includes('onion') || name.includes('produce')) {
    return 'Produce (Fruit/Vegetable)';
  }
  
  if (name.includes('rice') || name.includes('pasta') || name.includes('macaroni') ||
      name.includes('oil') || name.includes('herb') || name.includes('spice') ||
      name.includes('flour') || name.includes('baking')) {
    return 'Pantry Staple';
  }
  
  if (name.includes('bun') || name.includes('bread') || name.includes('muffin') ||
      name.includes('cookie') || name.includes('pie') || name.includes('dough')) {
    return 'Bakery';
  }
  
  if (name.includes('fry') || name.includes('frozen')) {
    return 'Frozen';
  }
  
  if (name.includes('juice') || name.includes('drink')) {
    return 'Beverages';
  }
  
  if (name.includes('snack')) {
    return 'Snack';
  }
  
  return 'Other';
}

/**
 * Determine best base unit
 */
function determineBaseUnit(packageUnit, itemName) {
  const unit = packageUnit.toLowerCase();
  const name = itemName.toLowerCase();
  
  if (unit === 'each' || unit === 'ct') {
    return 'each';
  }
  
  // Liquid items
  if (name.includes('juice') || name.includes('oil') || (unit === 'fl oz')) {
    return unit === 'oz' ? 'fl oz' : unit;
  }
  
  // Weight items
  if (unit === 'lb' || unit === 'lbs') {
    return 'lb';
  }
  
  if (unit === 'oz') {
    // For produce or meat, check if it's typically sold by weight
    if (name.includes('chicken') || name.includes('turkey') || name.includes('meat') ||
        name.includes('potato') || name.includes('rice')) {
      return 'lb'; // Prefer lb for weight-based items
    }
    return 'oz';
  }
  
  return unit;
}

/**
 * Calculate PPU
 */
function calculatePPU(price, packageSize, packageUnit, baseUnit) {
  if (!price || !packageSize || price === 0 || packageSize === 0) {
    return price;
  }
  
  if (packageUnit.toLowerCase() === baseUnit.toLowerCase()) {
    return price / packageSize;
  }
  
  // Handle conversions
  if (packageUnit.toLowerCase() === 'ct' && baseUnit === 'each') {
    return price / packageSize;
  }
  
  // Convert oz to fl oz (for liquids, treat as same)
  if (packageUnit.toLowerCase() === 'oz' && baseUnit === 'fl oz') {
    return price / packageSize;
  }
  
  // Convert oz to lb
  if (packageUnit.toLowerCase() === 'oz' && baseUnit === 'lb') {
    const sizeInLb = packageSize / 16;
    return price / sizeInLb;
  }
  
  // Convert pint to fl oz (1 pint = 16 fl oz)
  if (packageUnit.toLowerCase() === 'pint' && baseUnit === 'fl oz') {
    const sizeInFlOz = packageSize * 16;
    return price / sizeInFlOz;
  }
  
  return price / packageSize;
}

/**
 * Main comparison function
 */
function compareCSVs() {
  console.log('🔍 Comparing CSV files...\n');
  
  const mainItems = readMainCSV();
  const extraItems = readExtraCSV();
  
  console.log(`📊 Main CSV: ${mainItems.size} items`);
  console.log(`📊 Extra CSV: ${extraItems.length} items\n`);
  
  const matches = [];
  const missing = [];
  const priceDifferences = [];
  
  for (const extraItem of extraItems) {
    const match = findMatch(extraItem, mainItems);
    
    if (match.matched) {
      matches.push({
        extra: extraItem,
        main: match.item,
        mainName: match.name,
        matchType: match.type
      });
      
      // Check for significant price differences
      const priceDiff = Math.abs(extraItem.price - match.item.price);
      if (priceDiff > 0.50) { // More than $0.50 difference
        priceDifferences.push({
          item: extraItem.itemName,
          extraPrice: extraItem.price,
          mainPrice: match.item.price,
          difference: priceDiff,
          mainName: match.name
        });
      }
    } else {
      missing.push(extraItem);
    }
  }
  
  // Print results
  console.log('✅ MATCHES FOUND:');
  console.log(`   ${matches.length} items already in main table\n`);
  
  for (const match of matches.slice(0, 10)) {
    const type = match.matchType === 'exact' ? '✓' : 
                 match.matchType === 'normalized' ? '≈' : 
                 match.matchType === 'core' ? '~' : '?';
    console.log(`   ${type} "${match.extra.itemName}" → "${match.mainName}" (${match.main.price} vs ${match.extra.price})`);
  }
  if (matches.length > 10) {
    console.log(`   ... and ${matches.length - 10} more matches`);
  }
  
  if (priceDifferences.length > 0) {
    console.log(`\n⚠️  PRICE DIFFERENCES (>$0.50):`);
    for (const diff of priceDifferences) {
      console.log(`   "${diff.item}"`);
      console.log(`      Extra: $${diff.extraPrice} | Main: $${diff.mainPrice} (${diff.mainName})`);
      console.log(`      Difference: $${diff.difference.toFixed(2)}`);
    }
  }
  
  console.log(`\n❌ MISSING ITEMS:`);
  console.log(`   ${missing.length} items NOT in main table\n`);
  
  if (missing.length > 0) {
    const missingToAdd = [];
    
    for (const item of missing) {
      const category = determineCategory(item.itemName);
      let packageUnit = item.packageUnit.toLowerCase();
      if (packageUnit === 'ct') packageUnit = 'each';
      const baseUnit = determineBaseUnit(packageUnit, item.itemName);
      const ppu = calculatePPU(item.price, item.packageSize, item.packageUnit, baseUnit);
      
      missingToAdd.push({
        item: item.itemName,
        price: item.price,
        packageSize: item.packageSize,
        packageUnit: packageUnit,
        baseUnit: baseUnit,
        category: category,
        ppu: ppu,
        notes: item.notes
      });
      
      console.log(`   - ${item.itemName}`);
      console.log(`     Price: $${item.price} | Size: ${item.packageSize} ${item.packageUnit}`);
      console.log(`     → Would add as: ${category}, PPU: $${ppu.toFixed(6)}/${baseUnit}`);
    }
    
    // Write missing items to CSV for review
    const csvLines = [
      'Item,Price per Package ($),Package Size,Package Unit,Base Unit,Grocery Category,Price per Base Unit ($),Notes'
    ];
    
    for (const item of missingToAdd) {
      const csvLine = [
        `"${item.item}"`,
        item.price.toFixed(2),
        item.packageSize.toFixed(1),
        item.packageUnit,
        item.baseUnit,
        item.category,
        item.ppu.toFixed(6),
        `"${item.notes}"`
      ].join(',');
      csvLines.push(csvLine);
    }
    
    fs.writeFileSync(OUTPUT_CSV, csvLines.join('\n') + '\n', 'utf-8');
    console.log(`\n💾 Missing items saved to: ${OUTPUT_CSV}`);
  }
  
  console.log(`\n📋 SUMMARY:`);
  console.log(`   ✅ Matched: ${matches.length}/${extraItems.length}`);
  console.log(`   ❌ Missing: ${missing.length}/${extraItems.length}`);
  console.log(`   ⚠️  Price differences: ${priceDifferences.length}`);
  
  return { matches, missing, priceDifferences };
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  compareCSVs();
}

export { compareCSVs };
