/**
 * Add Missing Items to Final CSV
 * 
 * Adds the 4 items from extra CSV that weren't merged:
 * - parmesan cheese (grated) - new item
 * - cheddar cheese, shredded (12 oz) - different package size
 * - mozzarella cheese, shredded (32 oz) - different package size  
 * - mini gold potatoes - different from 10lb bag
 */

import fs from 'fs';
import path from 'path';
import { calculatePPU } from './recalculate-ppu.js';

const FINAL_CSV = path.join(process.cwd(), 'data/prices/aldi_ingredients_with_ppu.csv');

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
 * Determine category
 */
function determineCategory(itemName) {
  const name = itemName.toLowerCase();
  
  if (name.includes('cheese') || name.includes('parmesan')) {
    return 'Dairy';
  }
  if (name.includes('potato')) {
    return 'Produce (Fruit/Vegetable)';
  }
  return 'Other';
}

/**
 * Determine base unit
 */
function determineBaseUnit(packageUnit, itemName) {
  const unit = packageUnit.toLowerCase();
  const name = itemName.toLowerCase();
  
  if (unit === 'each' || unit === 'ct') {
    return 'each';
  }
  
  if (name.includes('cheese')) {
    return 'oz'; // Cheese sold by weight
  }
  
  if (name.includes('potato')) {
    return 'lb'; // Potatoes sold by weight
  }
  
  if (unit === 'oz') {
    return 'oz';
  }
  
  if (unit === 'lb' || unit === 'lbs') {
    return 'lb';
  }
  
  return unit;
}

/**
 * Add missing items
 */
function addMissingItems() {
  console.log('➕ Adding missing items...\n');
  
  // Read current CSV
  const content = fs.readFileSync(FINAL_CSV, 'utf-8');
  const lines = content.trim().split('\n');
  const header = lines[0];
  const dataLines = lines.slice(1);
  
  // Missing items with their data
  const missingItems = [
    {
      item: 'parmesan cheese (grated)',
      price: 3.25,
      packageSize: 8.0,
      packageUnit: 'oz',
      category: 'Dairy'
    },
    {
      item: 'cheddar cheese, shredded (12 oz)',
      price: 2.85,
      packageSize: 12.0,
      packageUnit: 'oz',
      category: 'Dairy'
    },
    {
      item: 'mozzarella cheese, shredded (32 oz)',
      price: 7.55,
      packageSize: 32.0,
      packageUnit: 'oz',
      category: 'Dairy'
    },
    {
      item: 'mini gold potatoes',
      price: 2.59,
      packageSize: 24.0,
      packageUnit: 'oz',
      category: 'Produce (Fruit/Vegetable)'
    }
  ];
  
  // Check existing items to avoid duplicates
  const existingItems = new Set();
  for (const line of dataLines) {
    if (!line.trim()) continue;
    const fields = parseCSVLine(line);
    if (fields.length > 0) {
      existingItems.add(fields[0].trim().toLowerCase());
    }
  }
  
  // Process missing items
  const newRows = [];
  
  for (const item of missingItems) {
    const normalized = item.item.toLowerCase();
    
    if (existingItems.has(normalized)) {
      console.log(`   ⚠️  "${item.item}" already exists, skipping`);
      continue;
    }
    
    const baseUnit = determineBaseUnit(item.packageUnit, item.item);
    const ppu = calculatePPU(item.price, item.packageSize, item.packageUnit, baseUnit);
    
    const newRow = [
      item.item,
      item.price.toFixed(2),
      item.packageSize.toFixed(1),
      item.packageUnit,
      baseUnit,
      item.category,
      ppu.toFixed(6)
    ];
    
    newRows.push(newRow);
    existingItems.add(normalized);
    
    console.log(`   ✅ Added: ${item.item}`);
    console.log(`      Price: $${item.price} | Size: ${item.packageSize} ${item.packageUnit}`);
    console.log(`      PPU: $${ppu.toFixed(6)}/${baseUnit} | Category: ${item.category}`);
  }
  
  // Combine all rows and sort
  const allItems = [
    ...dataLines.map(line => {
      if (!line.trim()) return null;
      const fields = parseCSVLine(line);
      return { name: fields[0].trim(), row: line };
    }).filter(Boolean),
    ...newRows.map(row => ({ name: row[0], row: formatCSVLine(row) }))
  ];
  
  allItems.sort((a, b) => a.name.localeCompare(b.name));
  
  // Write updated CSV
  const outputLines = [header, ...allItems.map(item => item.row)];
  fs.writeFileSync(FINAL_CSV, outputLines.join('\n') + '\n', 'utf-8');
  
  console.log(`\n✅ Added ${newRows.length} missing items`);
  console.log(`   Total items: ${allItems.length}`);
  console.log(`   Updated file: ${FINAL_CSV}\n`);
  
  return newRows.length;
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  addMissingItems();
}

export { addMissingItems };
