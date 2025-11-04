/**
 * Merge Missing Items into Main Ingredients CSV
 * 
 * Adds missing items from the extra pricing CSV to the main ingredients table.
 */

import fs from 'fs';
import path from 'path';

const MAIN_CSV = path.join(process.cwd(), 'data/prices/aldi_ingredients_with_ppu.csv');
const MISSING_CSV = path.join(process.cwd(), 'data/prices/missing_items_to_add.csv');
const OUTPUT_CSV = path.join(process.cwd(), 'data/prices/aldi_ingredients_with_ppu.csv');

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
 * Merge missing items
 */
function mergeMissingItems() {
  console.log('📦 Merging missing items...\n');
  
  // Read main CSV
  const mainContent = fs.readFileSync(MAIN_CSV, 'utf-8');
  const mainLines = mainContent.trim().split('\n');
  const header = mainLines[0];
  const mainData = mainLines.slice(1);
  
  // Read missing items
  const missingContent = fs.readFileSync(MISSING_CSV, 'utf-8');
  const missingLines = missingContent.trim().split('\n');
  const missingData = missingLines.slice(1);
  
  console.log(`📊 Main CSV: ${mainData.length} items`);
  console.log(`📊 Missing items: ${missingData.length} items\n`);
  
  // Parse existing items to check for duplicates
  const existingItems = new Set();
  for (const line of mainData) {
    if (!line.trim()) continue;
    const fields = parseCSVLine(line);
    if (fields.length > 0) {
      existingItems.add(fields[0].trim().toLowerCase());
    }
  }
  
  // Process missing items
  const newItems = [];
  const skipped = [];
  
  for (const line of missingData) {
    if (!line.trim()) continue;
    const fields = parseCSVLine(line);
    if (fields.length < 7) continue;
    
    const itemName = fields[0].trim();
    const normalizedName = itemName.toLowerCase();
    
    // Skip if already exists (case-insensitive)
    if (existingItems.has(normalizedName)) {
      skipped.push(itemName);
      continue;
    }
    
    // Create new row (remove Notes column for main CSV)
    const newRow = [
      itemName,
      fields[1], // Price
      fields[2], // Package Size
      fields[3], // Package Unit
      fields[4], // Base Unit
      fields[5], // Category
      fields[6]  // PPU
    ];
    
    newItems.push(newRow);
    existingItems.add(normalizedName);
  }
  
  // Sort all items alphabetically by name
  const allItems = [...mainData.map(line => {
    if (!line.trim()) return null;
    const fields = parseCSVLine(line);
    return { name: fields[0].trim(), row: line };
  }).filter(Boolean), ...newItems.map(row => ({ name: row[0], row: formatCSVLine(row) }))];
  
  allItems.sort((a, b) => a.name.localeCompare(b.name));
  
  // Write merged CSV
  const outputLines = [header, ...allItems.map(item => item.row)];
  fs.writeFileSync(OUTPUT_CSV, outputLines.join('\n') + '\n', 'utf-8');
  
  // Print summary
  console.log('✅ Merge complete!\n');
  console.log(`   Added: ${newItems.length} new items`);
  if (skipped.length > 0) {
    console.log(`   Skipped: ${skipped.length} items (already exist)`);
    skipped.forEach(item => console.log(`     - ${item}`));
  }
  console.log(`   Total items: ${allItems.length}\n`);
  
  console.log('📝 New items added:');
  newItems.forEach(item => {
    console.log(`   - ${item[0]} ($${item[1]}, ${item[5]})`);
  });
  
  console.log(`\n💾 Updated file: ${OUTPUT_CSV}`);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  mergeMissingItems();
}

export { mergeMissingItems };
