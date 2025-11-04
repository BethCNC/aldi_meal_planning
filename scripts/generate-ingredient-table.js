/**
 * Generate CSV Table for Missing Ingredient Data
 * 
 * Creates a formatted CSV with:
 * - Item name
 * - Price per Package (from CSVs or current)
 * - Package Size (suggested)
 * - Package Unit (suggested)
 * - Base Unit (suggested)
 * - Status/Notes
 * 
 * Usage:
 *   node scripts/generate-ingredient-table.js
 */

import {readFile, writeFile} from 'fs/promises';
import notion from '../src/notion/notionClient.js';
import {searchIngredient} from '../src/notion/notionClient.js';
import dotenv from 'dotenv';

dotenv.config();

const DB_IDS = {
  ingredients: process.env.NOTION_ALDI_INGREDIENTS_DB_ID || process.env.NOTION_INGREDIENTS_DB_ID
};

/**
 * Priority ingredients with suggested package data
 */
const PRIORITY_INGREDIENTS = [
  {
    name: 'coconut oil',
    suggested: {packageSize: 14, packageUnit: 'oz', baseUnit: 'ml', notes: 'Common Aldi size'}
  },
  {
    name: 'whole chicken',
    suggested: {packageSize: 3.5, packageUnit: 'lb', baseUnit: 'g', notes: 'Typical whole chicken size'}
  },
  {
    name: 'white rice, 3 lbs.',
    suggested: {packageSize: 3, packageUnit: 'lb', baseUnit: 'g', notes: 'Package size already set, needs unit'}
  },
  {
    name: 'buns, hamburger',
    suggested: {packageSize: 8, packageUnit: 'each', baseUnit: 'each', notes: 'Standard bun pack'}
  },
  {
    name: 'ground turkey',
    suggested: {packageSize: 1, packageUnit: 'lb', baseUnit: 'g', notes: '1 lb package common'}
  },
  {
    name: 'tomatoes, grape',
    suggested: {packageSize: 10, packageUnit: 'oz', baseUnit: 'g', notes: '10 oz clamshell'}
  },
  {
    name: 'mayonnaise',
    suggested: {packageSize: 30, packageUnit: 'oz', baseUnit: 'ml', notes: '30 oz jar'}
  },
  {
    name: 'chicken thighs',
    suggested: {packageSize: 1.5, packageUnit: 'lb', baseUnit: 'g', notes: 'Typical package size'}
  },
  {
    name: 'graham crackers',
    suggested: {packageSize: 14.4, packageUnit: 'oz', baseUnit: 'g', notes: 'Standard box size'}
  },
  {
    name: 'sour cream',
    suggested: {packageSize: 16, packageUnit: 'oz', baseUnit: 'ml', notes: '16 oz container'}
  },
  {
    name: 'chicken breasts',
    suggested: {packageSize: 1.5, packageUnit: 'lb', baseUnit: 'g', notes: 'Typical package'}
  },
  {
    name: 'broccoli',
    suggested: {packageSize: 12, packageUnit: 'oz', baseUnit: 'g', notes: '12 oz bag'}
  },
  {
    name: 'bell peppers',
    suggested: {packageSize: 3, packageUnit: 'each', baseUnit: 'each', notes: '3-pack common'}
  },
  {
    name: 'soy sauce',
    suggested: {packageSize: 10, packageUnit: 'oz', baseUnit: 'ml', notes: '10 oz bottle'}
  }
];

/**
 * Parse CSV files to get prices
 */
async function loadCSVPrices() {
  const prices = new Map();
  
  // Parse unified CSV (simplest format)
  try {
    const content = await readFile('/Users/bethcartrette/Downloads/unified_aldi_price_table_for_notion.csv', 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      if (cols.length >= 2) {
        const itemName = cols[0]?.trim().replace(/^"|"$/g, '');
        const priceStr = cols[1]?.trim().replace(/^"|"$/g, '');
        if (itemName && priceStr) {
          const price = parseFloat(priceStr);
          if (!isNaN(price) && price > 0) {
            const key = itemName.toLowerCase().replace(/[,\.,\-]/g, ' ').replace(/\s+/g, ' ').trim();
            if (!prices.has(key)) {
              prices.set(key, price);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error reading unified CSV:', error.message);
  }
  
  // Parse shopping list CSV
  try {
    const content = await readFile('/Users/bethcartrette/Downloads/Aldi-Master-Price-List - Shopping.csv', 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      
      // Items are in columns 1, 5, 9, 13, 17 (after Qnty columns)
      const itemPositions = [1, 5, 9, 13, 17];
      const pricePositions = [3, 7, 11, 15, 19];
      
      for (let j = 0; j < itemPositions.length; j++) {
        if (cols.length > itemPositions[j] && cols.length > pricePositions[j]) {
          const itemName = cols[itemPositions[j]]?.trim().replace(/^"|"$/g, '');
          const priceStr = cols[pricePositions[j]]?.trim().replace(/^"|"$/g, '');
          
          if (itemName && itemName.length > 2 && !itemName.includes(',')) {
            const price = parseFloat(priceStr);
            if (!isNaN(price) && price > 0) {
              const key = itemName.toLowerCase().replace(/[,\.,\-]/g, ' ').replace(/\s+/g, ' ').trim();
              if (!prices.has(key)) {
                prices.set(key, price);
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error reading shopping list CSV:', error.message);
  }
  
  return prices;
}

/**
 * Normalize name for matching
 */
function normalizeName(name) {
  return name.toLowerCase()
    .replace(/[,\.,\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Find price in CSV data
 */
function findPriceInCSV(itemName, csvPrices) {
  const normalized = normalizeName(itemName);
  
  // Exact match
  if (csvPrices.has(normalized)) {
    return csvPrices.get(normalized);
  }
  
  // Partial matches
  for (const [key, price] of csvPrices.entries()) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return price;
    }
  }
  
  // Word matching
  const itemWords = normalized.split(' ').filter(w => w.length > 2);
  for (const [key, price] of csvPrices.entries()) {
    const keyWords = key.split(' ').filter(w => w.length > 2);
    const matches = itemWords.filter(w => keyWords.includes(w));
    if (matches.length >= 2 || (matches.length === 1 && itemWords.length <= 3)) {
      return price;
    }
  }
  
  return null;
}

/**
 * Get ingredient data from Notion
 */
async function getIngredientData(ingredientName) {
  try {
    const ingredient = await searchIngredient(ingredientName);
    if (!ingredient) return null;
    
    const item = ingredient.properties['Item']?.title?.[0]?.plain_text || 'Unknown';
    const price = ingredient.properties['Price per Package ($)']?.number;
    const packageSize = ingredient.properties['Package Size']?.number;
    const packageUnit = ingredient.properties['Package Unit']?.select?.name;
    const baseUnit = ingredient.properties['Base Unit']?.select?.name;
    
    return {
      id: ingredient.id,
      name: item,
      price: price || null,
      packageSize: packageSize || null,
      packageUnit: packageUnit || null,
      baseUnit: baseUnit || null,
      missing: {
        price: !price || price === 0,
        packageSize: !packageSize,
        packageUnit: !packageUnit,
        baseUnit: !baseUnit
      }
    };
  } catch (error) {
    return null;
  }
}

/**
 * Generate CSV table
 */
async function generateTable() {
  console.log('📊 Generating Ingredient Data Table\n');
  
  // Load CSV prices
  console.log('📥 Loading prices from CSV files...');
  const csvPrices = await loadCSVPrices();
  console.log(`✅ Loaded ${csvPrices.size} prices from CSVs\n`);
  
  // Get Notion data for each ingredient
  console.log('📥 Fetching current data from Notion...');
  const rows = [];
  
  for (const item of PRIORITY_INGREDIENTS) {
    const notionData = await getIngredientData(item.name);
    
    if (!notionData) {
      rows.push({
        'Item Name': item.name,
        'Price per Package ($)': '',
        'Package Size': item.suggested.packageSize,
        'Package Unit': item.suggested.packageUnit,
        'Base Unit': item.suggested.baseUnit,
        'Status': 'NOT FOUND in Notion',
        'Notes': item.suggested.notes,
        'Current Notion Price': '',
        'CSV Price': findPriceInCSV(item.name, csvPrices) || ''
      });
      continue;
    }
    
    // Find price (prioritize Notion, then CSV, then suggest manual entry)
    let price = notionData.price;
    let priceSource = 'Notion';
    
    if (!price || price === 0) {
      const csvPrice = findPriceInCSV(item.name, csvPrices);
      if (csvPrice) {
        price = csvPrice;
        priceSource = 'CSV';
      } else {
        price = null;
        priceSource = 'Manual entry needed';
      }
    }
    
    // Determine status
    const missingFields = [];
    if (!price || price === 0) missingFields.push('Price');
    if (!notionData.packageSize) missingFields.push('Package Size');
    if (!notionData.packageUnit) missingFields.push('Package Unit');
    if (!notionData.baseUnit) missingFields.push('Base Unit');
    
    const status = missingFields.length === 0 
      ? '✅ Complete' 
      : `⚠️  Missing: ${missingFields.join(', ')}`;
    
    rows.push({
      'Item Name': notionData.name,
      'Price per Package ($)': price ? price.toFixed(2) : '',
      'Package Size': notionData.packageSize || item.suggested.packageSize,
      'Package Unit': notionData.packageUnit || item.suggested.packageUnit,
      'Base Unit': notionData.baseUnit || item.suggested.baseUnit,
      'Status': status,
      'Notes': `${item.suggested.notes} | Price source: ${priceSource}`,
      'Current Notion Price': notionData.price ? notionData.price.toFixed(2) : 'Missing',
      'CSV Price Found': findPriceInCSV(item.name, csvPrices) ? findPriceInCSV(item.name, csvPrices).toFixed(2) : 'Not in CSV'
    });
  }
  
  // Generate CSV content
  const headers = ['Item Name', 'Price per Package ($)', 'Package Size', 'Package Unit', 'Base Unit', 'Status', 'Current Notion Price', 'CSV Price Found', 'Notes'];
  
  let csvContent = headers.join(',') + '\n';
  
  for (const row of rows) {
    const values = headers.map(h => {
      const value = String(row[h] || '');
      // Escape commas and quotes
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    csvContent += values.join(',') + '\n';
  }
  
  // Write to file
  const outputPath = '/Users/bethcartrette/Downloads/ingredient-data-table.csv';
  await writeFile(outputPath, csvContent, 'utf-8');
  
  console.log('✅ CSV table generated!\n');
  console.log(`📄 Saved to: ${outputPath}\n`);
  
  // Show summary
  console.log('='.repeat(70));
  console.log('\n📊 Summary:\n');
  
  const complete = rows.filter(r => r.Status === '✅ Complete').length;
  const needsPrice = rows.filter(r => r.Status.includes('Price')).length;
  const needsPackage = rows.filter(r => r.Status.includes('Package')).length;
  const needsBase = rows.filter(r => r.Status.includes('Base Unit')).length;
  
  console.log(`   Total items: ${rows.length}`);
  console.log(`   ✅ Complete: ${complete}`);
  console.log(`   ⚠️  Needs Price: ${needsPrice}`);
  console.log(`   ⚠️  Needs Package Data: ${needsPackage}`);
  console.log(`   ⚠️  Needs Base Unit: ${needsBase}`);
  
  // Show items needing updates
  console.log('\n📋 Items Needing Updates:\n');
  for (const row of rows.filter(r => r.Status !== '✅ Complete')) {
    console.log(`   ${row['Item Name']}: ${row.Status}`);
    if (row['CSV Price Found'] !== 'Not in CSV') {
      console.log(`      → CSV has price: $${row['CSV Price Found']}`);
    }
  }
  
  console.log('\n✅ Done! Open the CSV file to review and fill in missing data.');
  console.log('\n💡 Next step:');
  console.log('   1. Review the CSV file');
  console.log('   2. Update any missing prices from your receipt');
  console.log('   3. Verify package sizes match Aldi packaging');
  console.log('   4. Run: npm run populate:missing -- --update-missing');
}

/**
 * Main
 */
async function main() {
  try {
    await generateTable();
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
