/**
 * Recalculate Price Per Unit (PPU) for All Items
 * 
 * Ensures all items have correct PPU calculations based on package price, size, and base unit.
 */

import fs from 'fs';
import path from 'path';

const CSV_PATH = path.join(process.cwd(), 'data/prices/aldi_ingredients_with_ppu.csv');
const OUTPUT_PATH = path.join(process.cwd(), 'data/prices/aldi_ingredients_with_ppu_recalculated.csv');

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
 * Format CSV line
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
 * Calculate PPU based on package price, size, and base unit
 */
function calculatePPU(pricePerPackage, packageSize, packageUnit, baseUnit) {
  if (!pricePerPackage || !packageSize || pricePerPackage === 0 || packageSize === 0) {
    return pricePerPackage; // Fallback
  }
  
  const pkgUnit = packageUnit.toLowerCase();
  const base = baseUnit.toLowerCase();
  
  // If units match, simple division
  if (pkgUnit === base) {
    return pricePerPackage / packageSize;
  }
  
  // Handle "each" - price per item
  if (pkgUnit === 'each' || base === 'each') {
    return pricePerPackage / packageSize;
  }
  
  // Handle "ct" (count) -> "each"
  if ((pkgUnit === 'ct' || pkgUnit === 'count') && base === 'each') {
    return pricePerPackage / packageSize;
  }
  
  // Convert oz to fl oz (for liquids, treat as same approximately)
  if (pkgUnit === 'oz' && base === 'fl oz') {
    return pricePerPackage / packageSize;
  }
  
  // Convert fl oz to oz (for liquids)
  if (pkgUnit === 'fl oz' && base === 'fl oz') {
    return pricePerPackage / packageSize;
  }
  
  // Convert oz to lb (1 lb = 16 oz)
  if (pkgUnit === 'oz' && base === 'lb') {
    const sizeInLb = packageSize / 16;
    return pricePerPackage / sizeInLb;
  }
  
  // Convert lb to oz (1 lb = 16 oz)
  if (pkgUnit === 'lb' && base === 'oz') {
    const sizeInOz = packageSize * 16;
    return pricePerPackage / sizeInOz;
  }
  
  // Convert pint to fl oz (1 pint = 16 fl oz)
  if (pkgUnit === 'pint' && base === 'fl oz') {
    const sizeInFlOz = packageSize * 16;
    return pricePerPackage / sizeInFlOz;
  }
  
  // Default: assume units are compatible and do simple division
  return pricePerPackage / packageSize;
}

/**
 * Main function
 */
function recalculatePPU() {
  console.log('🔄 Recalculating PPU for all items...\n');
  
  const content = fs.readFileSync(CSV_PATH, 'utf-8');
  const lines = content.trim().split('\n');
  const header = lines[0];
  const dataLines = lines.slice(1);
  
  const processed = [];
  const issues = [];
  const fixed = [];
  
  for (const line of dataLines) {
    if (!line.trim()) continue;
    
    const fields = parseCSVLine(line);
    
    if (fields.length < 7) {
      issues.push(`Skipping malformed line: ${line.substring(0, 50)}...`);
      continue;
    }
    
    const itemName = fields[0].trim();
    const pricePerPackage = parseFloat(fields[1]) || 0;
    const packageSize = parseFloat(fields[2]) || 1;
    const packageUnit = fields[3].trim();
    const baseUnit = fields[4].trim();
    const category = fields[5].trim();
    const oldPPU = parseFloat(fields[6]) || 0;
    
    // Calculate correct PPU
    const newPPU = calculatePPU(pricePerPackage, packageSize, packageUnit, baseUnit);
    
    // Check if PPU changed significantly (more than 0.1% difference)
    const difference = Math.abs(oldPPU - newPPU);
    const percentDiff = oldPPU > 0 ? (difference / oldPPU) * 100 : 0;
    
    if (percentDiff > 0.1) {
      fixed.push({
        item: itemName,
        oldPPU,
        newPPU,
        price: pricePerPackage,
        size: packageSize,
        pkgUnit: packageUnit,
        baseUnit: baseUnit
      });
    }
    
    // Create updated row
    const updatedRow = [
      itemName,
      pricePerPackage.toFixed(2),
      packageSize.toFixed(1),
      packageUnit,
      baseUnit,
      category,
      newPPU.toFixed(6)
    ];
    
    processed.push(updatedRow);
  }
  
  // Write updated CSV
  const outputLines = [header, ...processed.map(formatCSVLine)];
  fs.writeFileSync(OUTPUT_PATH, outputLines.join('\n') + '\n', 'utf-8');
  
  // Print summary
  console.log('✅ Recalculation complete!\n');
  console.log(`📊 Summary:`);
  console.log(`   Total items: ${processed.length}`);
  console.log(`   PPU values fixed: ${fixed.length}`);
  console.log(`   Issues: ${issues.length}\n`);
  
  if (fixed.length > 0) {
    console.log('🔧 Fixed PPU Values:');
    for (const fix of fixed.slice(0, 15)) {
      console.log(`   ${fix.item}`);
      console.log(`      Old: $${fix.oldPPU.toFixed(6)}/${fix.baseUnit}`);
      console.log(`      New: $${fix.newPPU.toFixed(6)}/${fix.baseUnit}`);
      console.log(`      ($${fix.price} ÷ ${fix.size} ${fix.pkgUnit})`);
    }
    if (fixed.length > 15) {
      console.log(`   ... and ${fixed.length - 15} more fixes`);
    }
  }
  
  if (issues.length > 0) {
    console.log(`\n⚠️  Issues encountered:`);
    issues.forEach(issue => console.log(`   ${issue}`));
  }
  
  console.log(`\n💾 Output saved to: ${OUTPUT_PATH}`);
  console.log(`\n📝 Next step: Review and replace original if satisfied:`);
  console.log(`   mv ${OUTPUT_PATH} ${CSV_PATH}`);
  
  return { processed, fixed, issues };
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  recalculatePPU();
}

export { recalculatePPU, calculatePPU };
