/**
 * Verify Final Ingredients Table
 * 
 * Comprehensive verification that the final CSV contains:
 * 1. All original items from main CSV
 * 2. All items from extra pricing CSV
 * 3. All items have proper PPU calculations
 */

import fs from 'fs';
import path from 'path';

const MAIN_CSV = path.join(process.cwd(), 'data/prices/aldi_ingredients_with_ppu_backup.csv');
const EXTRA_CSV = path.join(process.cwd(), 'data/prices/extra aldi pricing - aldi_missing_pricing_seed (1).csv');
const FINAL_CSV = path.join(process.cwd(), 'data/prices/aldi_ingredients_with_ppu.csv');

/**
 * Normalize item name for comparison
 */
function normalizeName(name) {
  return name.toLowerCase()
    .replace(/[",]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\s*"|"\s*$/g, '');
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
 * Read CSV file and return items map
 */
function readCSV(filePath, isExtraCSV = false) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  const items = new Map();
  
  // Skip header
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const fields = parseCSVLine(line);
    
    if (isExtraCSV) {
      // Extra CSV format: item_name, suggested_brand, package_size, package_unit, price_usd, notes, collected_at
      if (fields.length < 7) continue;
      const itemName = fields[0].trim();
      const normalized = normalizeName(itemName);
      items.set(normalized, {
        originalName: itemName,
        normalized,
        price: parseFloat(fields[4].replace('$', '')) || 0,
        packageSize: parseFloat(fields[2]) || 0,
        packageUnit: fields[3].trim(),
        notes: fields[5].trim()
      });
    } else {
      // Main CSV format: Item, Price per Package ($), Package Size, Package Unit, Base Unit, Grocery Category, Price per Base Unit ($)
      if (fields.length < 7) continue;
      const itemName = fields[0].trim();
      const normalized = normalizeName(itemName);
      items.set(normalized, {
        originalName: itemName,
        normalized,
        price: parseFloat(fields[1]) || 0,
        packageSize: parseFloat(fields[2]) || 0,
        packageUnit: fields[3].trim(),
        baseUnit: fields[4].trim(),
        category: fields[5].trim(),
        ppu: parseFloat(fields[6]) || 0
      });
    }
  }
  
  return items;
}

/**
 * Calculate expected PPU
 */
function calculateExpectedPPU(price, packageSize, packageUnit, baseUnit) {
  if (!price || !packageSize || price === 0 || packageSize === 0) {
    return price;
  }
  
  const pkgUnit = packageUnit.toLowerCase();
  const base = baseUnit.toLowerCase();
  
  // Same units
  if (pkgUnit === base) {
    return price / packageSize;
  }
  
  // Handle "each"
  if (pkgUnit === 'each' || base === 'each') {
    return price / packageSize;
  }
  
  // Handle "ct" -> "each"
  if ((pkgUnit === 'ct' || pkgUnit === 'count') && base === 'each') {
    return price / packageSize;
  }
  
  // oz to fl oz (treat as same for liquids)
  if (pkgUnit === 'oz' && base === 'fl oz') {
    return price / packageSize;
  }
  
  // oz to lb (1 lb = 16 oz)
  if (pkgUnit === 'oz' && base === 'lb') {
    const sizeInLb = packageSize / 16;
    return price / sizeInLb;
  }
  
  // lb to oz
  if (pkgUnit === 'lb' && base === 'oz') {
    const sizeInOz = packageSize * 16;
    return price / sizeInOz;
  }
  
  // pint to fl oz (1 pint = 16 fl oz)
  if (pkgUnit === 'pint' && base === 'fl oz') {
    const sizeInFlOz = packageSize * 16;
    return price / sizeInFlOz;
  }
  
  // Default
  return price / packageSize;
}

/**
 * Find match in final CSV
 */
function findMatch(itemName, finalItems) {
  const normalized = normalizeName(itemName);
  
  // Exact match
  if (finalItems.has(normalized)) {
    return { matched: true, type: 'exact', item: finalItems.get(normalized) };
  }
  
  // Try partial match
  for (const [name, item] of finalItems.entries()) {
    if (normalized.includes(name) || name.includes(normalized)) {
      return { matched: true, type: 'partial', item, name };
    }
  }
  
  return { matched: false };
}

/**
 * Main verification function
 */
function verifyFinalTable() {
  console.log('🔍 Verifying Final Ingredients Table...\n');
  
  // Read all CSV files
  const mainItems = readCSV(MAIN_CSV, false);
  const extraItems = readCSV(EXTRA_CSV, true);
  const finalItems = readCSV(FINAL_CSV, false);
  
  console.log(`📊 Source Files:`);
  console.log(`   Main CSV: ${mainItems.size} items`);
  console.log(`   Extra CSV: ${extraItems.size} items`);
  console.log(`   Final CSV: ${finalItems.size} items\n`);
  
  const expectedTotal = mainItems.size + extraItems.size;
  const expectedInFinal = finalItems.size;
  
  // Verify main CSV items are in final
  console.log('✅ Verifying Main CSV Items...');
  const missingFromMain = [];
  const mainVerified = [];
  
  for (const [normName, item] of mainItems.entries()) {
    const match = findMatch(item.originalName, finalItems);
    if (match.matched) {
      const finalItem = match.item;
      // Verify PPU is correct (within 0.01 tolerance)
      const expectedPPU = calculateExpectedPPU(
        finalItem.price,
        finalItem.packageSize,
        finalItem.packageUnit,
        finalItem.baseUnit
      );
      const ppuDiff = Math.abs(finalItem.ppu - expectedPPU);
      
      if (ppuDiff > 0.01) {
        console.log(`   ⚠️  "${item.originalName}": PPU mismatch`);
        console.log(`      Expected: $${expectedPPU.toFixed(6)} | Actual: $${finalItem.ppu.toFixed(6)}`);
      } else {
        mainVerified.push(item.originalName);
      }
    } else {
      missingFromMain.push(item.originalName);
    }
  }
  
  if (missingFromMain.length > 0) {
    console.log(`   ❌ Missing from final: ${missingFromMain.length} items`);
    missingFromMain.forEach(item => console.log(`      - ${item}`));
  } else {
    console.log(`   ✓ All ${mainItems.size} items found in final table`);
  }
  
  // Verify extra CSV items are in final
  console.log(`\n✅ Verifying Extra CSV Items...`);
  const missingFromExtra = [];
  const extraVerified = [];
  
  for (const [normName, item] of extraItems.entries()) {
    const match = findMatch(item.originalName, finalItems);
    if (match.matched) {
      const finalItem = match.item;
      // Verify PPU is correct
      const expectedPPU = calculateExpectedPPU(
        finalItem.price,
        finalItem.packageSize,
        finalItem.packageUnit,
        finalItem.baseUnit
      );
      const ppuDiff = Math.abs(finalItem.ppu - expectedPPU);
      
      if (ppuDiff > 0.01) {
        console.log(`   ⚠️  "${item.originalName}": PPU mismatch`);
        console.log(`      Expected: $${expectedPPU.toFixed(6)} | Actual: $${finalItem.ppu.toFixed(6)}`);
      } else {
        extraVerified.push(item.originalName);
      }
    } else {
      missingFromExtra.push(item.originalName);
    }
  }
  
  if (missingFromExtra.length > 0) {
    console.log(`   ❌ Missing from final: ${missingFromExtra.length} items`);
    missingFromExtra.forEach(item => console.log(`      - ${item}`));
  } else {
    console.log(`   ✓ All ${extraItems.size} items found in final table`);
  }
  
  // Verify all final items have valid PPU
  console.log(`\n✅ Verifying PPU Calculations...`);
  const invalidPPU = [];
  
  for (const [normName, item] of finalItems.entries()) {
    if (!item.ppu || item.ppu <= 0 || isNaN(item.ppu)) {
      invalidPPU.push(item.originalName);
    } else {
      // Verify PPU matches expected calculation
      const expectedPPU = calculateExpectedPPU(
        item.price,
        item.packageSize,
        item.packageUnit,
        item.baseUnit
      );
      const ppuDiff = Math.abs(item.ppu - expectedPPU);
      
      if (ppuDiff > 0.01) {
        invalidPPU.push({
          item: item.originalName,
          expected: expectedPPU,
          actual: item.ppu,
          diff: ppuDiff
        });
      }
    }
  }
  
  if (invalidPPU.length === 0) {
    console.log(`   ✓ All ${finalItems.size} items have valid PPU calculations`);
  } else {
    console.log(`   ⚠️  ${invalidPPU.length} items with PPU issues:`);
    invalidPPU.slice(0, 10).forEach(issue => {
      if (typeof issue === 'string') {
        console.log(`      - ${issue}: No PPU or invalid`);
      } else {
        console.log(`      - ${issue.item}: Expected $${issue.expected.toFixed(6)}, got $${issue.actual.toFixed(6)}`);
      }
    });
    if (invalidPPU.length > 10) {
      console.log(`      ... and ${invalidPPU.length - 10} more`);
    }
  }
  
  // Final summary
  console.log(`\n📋 VERIFICATION SUMMARY:`);
  console.log(`   ──────────────────────────────────────`);
  console.log(`   Main CSV items in final: ${mainVerified.length}/${mainItems.size}`);
  console.log(`   Extra CSV items in final: ${extraVerified.length}/${extraItems.size}`);
  console.log(`   Total items in final: ${finalItems.size}`);
  console.log(`   Items with valid PPU: ${finalItems.size - invalidPPU.length}/${finalItems.size}`);
  console.log(`   ──────────────────────────────────────\n`);
  
  // Check for duplicates
  const itemCounts = new Map();
  for (const [normName, item] of finalItems.entries()) {
    itemCounts.set(normName, (itemCounts.get(normName) || 0) + 1);
  }
  
  const duplicates = Array.from(itemCounts.entries())
    .filter(([name, count]) => count > 1)
    .map(([name]) => name);
  
  if (duplicates.length > 0) {
    console.log(`⚠️  WARNING: Found ${duplicates.length} duplicate items (case-insensitive):`);
    duplicates.forEach(name => console.log(`   - ${name}`));
  } else {
    console.log(`✓ No duplicate items found\n`);
  }
  
  // Overall status
  const allMainFound = missingFromMain.length === 0;
  const allExtraFound = missingFromExtra.length === 0;
  const allPPUValid = invalidPPU.length === 0;
  const noDuplicates = duplicates.length === 0;
  
  if (allMainFound && allExtraFound && allPPUValid && noDuplicates) {
    console.log(`✅ VERIFICATION PASSED: All checks passed!`);
    console.log(`   Final table is complete and accurate.`);
  } else {
    console.log(`❌ VERIFICATION FAILED: Some issues found.`);
    if (!allMainFound) console.log(`   - Missing items from main CSV`);
    if (!allExtraFound) console.log(`   - Missing items from extra CSV`);
    if (!allPPUValid) console.log(`   - Invalid PPU values`);
    if (!noDuplicates) console.log(`   - Duplicate items`);
  }
  
  return {
    mainVerified: mainVerified.length,
    extraVerified: extraVerified.length,
    totalItems: finalItems.size,
    invalidPPU: invalidPPU.length,
    duplicates: duplicates.length,
    allPassed: allMainFound && allExtraFound && allPPUValid && noDuplicates
  };
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  verifyFinalTable();
}

export { verifyFinalTable };
