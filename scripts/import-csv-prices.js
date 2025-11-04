/**
 * Import Prices from CSV Files
 * 
 * Reads CSV files and matches items to Notion ingredients,
 * then updates prices and package data
 * 
 * Usage:
 *   node scripts/import-csv-prices.js --check-only
 *   node scripts/import-csv-prices.js --update
 */

import {readFile} from 'fs/promises';
import {parse} from 'csv-parse';
import notion from '../src/notion/notionClient.js';
import {searchIngredient} from '../src/notion/notionClient.js';
import dotenv from 'dotenv';

dotenv.config();

const DB_IDS = {
  ingredients: process.env.NOTION_ALDI_INGREDIENTS_DB_ID || process.env.NOTION_INGREDIENTS_DB_ID
};

/**
 * Parse the shopping list CSV (complex format with multiple columns)
 */
function parseShoppingListCSV(content) {
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true
  });
  
  const items = [];
  
  // This CSV has items in different columns (SNACKS, DAIRY, CANNED/DRY GOODS, etc.)
  for (const record of records) {
    // Check each category column
    const categories = ['SNACKS', 'DAIRY', 'CANNED/DRY GOODS', 'VEGETABLES', 'REFRIGERATED DELI', 'BREAKFAST FOOD', 'CONDIMENTS', 'MEAT', 'FRUITS', 'FROZEN', 'GRAIN/PASTA/RICE', 'BAKED GOODS', 'COOKING/BAKING SUPPLIES', 'STAPLES', 'BEVERAGES'];
    
    for (const category of categories) {
      const itemCol = category; // Item name column
      const costCol = category === 'SNACKS' ? 'Cost' : 
                     category === 'DAIRY' ? 'Cost' :
                     category === 'CANNED/DRY GOODS' ? 'Cost' :
                     category === 'VEGETABLES' ? 'Cost' :
                     category === 'REFRIGERATED DELI' ? 'Cost' :
                     'Cost'; // Most use "Cost"
      
      const itemName = record[itemCol];
      const priceStr = record[costCol] || record[`${category}.1`] || record[category];
      
      if (itemName && itemName.trim() && itemName !== category && !itemName.includes(',')) {
        const price = parseFloat(priceStr);
        if (!isNaN(price) && price > 0) {
          items.push({
            item: itemName.trim(),
            price,
            category,
            source: 'Aldi-Master-Price-List-Shopping'
          });
        }
      }
    }
  }
  
  return items;
}

/**
 * Parse unified CSV (simple format: item,price,category)
 */
function parseUnifiedCSV(content) {
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true
  });
  
  return records
    .filter(r => r.item && r.price && parseFloat(r.price) > 0)
    .map(r => ({
      item: r.item.trim(),
      price: parseFloat(r.price),
      category: r.category || null,
      source: 'unified_aldi_price_table'
    }));
}

/**
 * Parse sample CSV (item,price_usd format)
 */
function parseSampleCSV(content) {
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true
  });
  
  return records
    .filter(r => r.item && r.price_usd && parseFloat(r.price_usd) > 0)
    .map(r => ({
      item: r.item.trim(),
      price: parseFloat(r.price_usd),
      category: null,
      source: 'aldi_price_list_sample'
    }));
}

/**
 * Normalize item name for matching
 */
function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/[,\.,\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Match CSV item to Notion ingredient
 */
function matchItem(csvItem, notionItem) {
  const notionName = notionItem.properties['Item']?.title?.[0]?.plain_text || '';
  
  const csvNormalized = normalizeName(csvItem.item);
  const notionNormalized = normalizeName(notionName);
  
  // Exact match
  if (csvNormalized === notionNormalized) {
    return {matched: true, confidence: 100, name: notionName};
  }
  
  // Contains match
  if (csvNormalized.includes(notionNormalized) || notionNormalized.includes(csvNormalized)) {
    return {matched: true, confidence: 80, name: notionName};
  }
  
  // Word matching
  const csvWords = csvNormalized.split(' ');
  const notionWords = notionNormalized.split(' ');
  const matchingWords = csvWords.filter(w => notionWords.includes(w) && w.length > 2);
  
  if (matchingWords.length >= 2 || (matchingWords.length === 1 && csvWords.length <= 3)) {
    const score = (matchingWords.length / Math.max(csvWords.length, notionWords.length)) * 100;
    return {matched: true, confidence: Math.round(score), name: notionName};
  }
  
  return {matched: false, confidence: 0, name: null};
}

/**
 * Get all ingredients from Notion
 */
async function getAllIngredients() {
  const allIngredients = [];
  let cursor = undefined;
  
  do {
    const response = await notion.databases.query({
      database_id: DB_IDS.ingredients,
      start_cursor: cursor,
      page_size: 100
    });
    
    allIngredients.push(...response.results);
    cursor = response.next_cursor;
  } while (cursor);
  
  return allIngredients;
}

/**
 * Update ingredient price
 */
async function updateIngredientPrice(ingredientId, price) {
  try {
    await notion.pages.update({
      page_id: ingredientId,
      properties: {
        'Price per Package ($)': {number: price}
      }
    });
    return true;
  } catch (error) {
    console.error(`  ❌ Error updating: ${error.message}`);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes('--check-only');
  const update = args.includes('--update');
  const dryRun = !update || args.includes('--dry-run');
  
  console.log('📥 CSV Price Importer\n');
  
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }
  
  try {
    // Read CSV files
    console.log('📖 Reading CSV files...\n');
    
    const csvFiles = [
      '/Users/bethcartrette/Downloads/Aldi-Master-Price-List - Shopping.csv',
      '/Users/bethcartrette/Downloads/unified_aldi_price_table_for_notion.csv',
      '/Users/bethcartrette/Downloads/aldi_price_list_sample.csv'
    ];
    
    const allCSVItems = [];
    
    for (const filePath of csvFiles) {
      try {
        const content = await readFile(filePath, 'utf-8');
        const fileName = filePath.split('/').pop();
        
        let items = [];
        if (fileName.includes('Shopping')) {
          items = parseShoppingListCSV(content);
        } else if (fileName.includes('unified')) {
          items = parseUnifiedCSV(content);
        } else if (fileName.includes('sample')) {
          items = parseSampleCSV(content);
        }
        
        console.log(`  ✅ ${fileName}: ${items.length} items`);
        allCSVItems.push(...items);
      } catch (error) {
        console.log(`  ⚠️  ${filePath.split('/').pop()}: ${error.message}`);
      }
    }
    
    // Deduplicate by item name (keep first occurrence)
    const uniqueItems = new Map();
    for (const item of allCSVItems) {
      const key = normalizeName(item.item);
      if (!uniqueItems.has(key)) {
        uniqueItems.set(key, item);
      }
    }
    
    const csvItems = Array.from(uniqueItems.values());
    console.log(`\n📊 Total unique items from CSVs: ${csvItems.length}\n`);
    
    // Get Notion ingredients
    console.log('📥 Fetching ingredients from Notion...\n');
    const notionIngredients = await getAllIngredients();
    console.log(`  ✅ Found ${notionIngredients.length} ingredients in Notion\n`);
    
    // Match items
    console.log('🔍 Matching items...\n');
    
    const matches = [];
    const unmatched = [];
    
    for (const csvItem of csvItems) {
      let bestMatch = null;
      let bestScore = 0;
      
      for (const notionIng of notionIngredients) {
        const match = matchItem(csvItem, notionIng);
        if (match.matched && match.confidence > bestScore) {
          bestScore = match.confidence;
          bestMatch = {
            csvItem,
            notionIng,
            confidence: match.confidence,
            notionName: match.name
          };
        }
      }
      
      if (bestMatch && bestScore >= 50) {
        matches.push(bestMatch);
      } else {
        unmatched.push(csvItem);
      }
    }
    
    // Show results
    console.log('='.repeat(70));
    console.log('\n📊 Matching Results:\n');
    console.log(`   ✅ Matched: ${matches.length} items`);
    console.log(`   ⚠️  Unmatched: ${unmatched.length} items`);
    
    // Group matches by priority ingredients
    const priorityNames = [
      'coconut oil', 'whole chicken', 'white rice', 'buns hamburger',
      'ground turkey', 'tomatoes grape', 'mayonnaise', 'chicken thighs',
      'graham crackers', 'sour cream', 'chicken breasts', 'broccoli',
      'bell peppers', 'soy sauce'
    ];
    
    const priorityMatches = matches.filter(m => {
      const name = normalizeName(m.notionName);
      return priorityNames.some(p => name.includes(p));
    });
    
    console.log(`   🎯 Priority items matched: ${priorityMatches.length}`);
    
    // Show priority matches
    if (priorityMatches.length > 0) {
      console.log('\n🎯 Priority Items Matched:\n');
      for (const match of priorityMatches.sort((a, b) => b.confidence - a.confidence)) {
        const currentPrice = match.notionIng.properties['Price per Package ($)']?.number;
        const newPrice = match.csvItem.price;
        const status = !currentPrice || currentPrice === 0 ? '❌ Missing' : 
                      Math.abs(currentPrice - newPrice) < 0.10 ? '✓ Current' : 
                      currentPrice < newPrice ? `↑ ${(newPrice - currentPrice).toFixed(2)}` :
                      `↓ ${(currentPrice - newPrice).toFixed(2)}`;
        
        console.log(`  ${match.notionName}`);
        console.log(`    CSV: $${newPrice.toFixed(2)} (${match.csvItem.source})`);
        console.log(`    Notion: ${currentPrice ? `$${currentPrice.toFixed(2)}` : 'Missing'} ${status}`);
        console.log(`    Confidence: ${match.confidence}%`);
        console.log('');
      }
    }
    
    // Show all matches
    if (matches.length > 0 && !checkOnly) {
      console.log('\n📋 All Matched Items (first 20):\n');
      for (const match of matches.slice(0, 20).sort((a, b) => b.confidence - a.confidence)) {
        const currentPrice = match.notionIng.properties['Price per Package ($)']?.number;
        const needsUpdate = !currentPrice || currentPrice === 0 || Math.abs(currentPrice - match.csvItem.price) > 0.10;
        
        if (needsUpdate) {
          console.log(`  ${match.notionName}: $${currentPrice?.toFixed(2) || 'N/A'} → $${match.csvItem.price.toFixed(2)} (${match.confidence}%)`);
        }
      }
      
      if (matches.length > 20) {
        console.log(`  ... and ${matches.length - 20} more`);
      }
    }
    
    // Update prices
    if (!dryRun && update && matches.length > 0) {
      console.log('\n' + '='.repeat(70));
      console.log('\n💾 Updating prices in Notion...\n');
      
      let updated = 0;
      let unchanged = 0;
      let errors = 0;
      
      // Only update priority items first
      for (const match of priorityMatches) {
        const currentPrice = match.notionIng.properties['Price per Package ($)']?.number;
        const newPrice = match.csvItem.price;
        
        // Update if missing or different
        if (!currentPrice || currentPrice === 0 || Math.abs(currentPrice - newPrice) > 0.10) {
          const success = await updateIngredientPrice(match.notionIng.id, newPrice);
          if (success) {
            console.log(`  ✅ ${match.notionName}: $${currentPrice?.toFixed(2) || 'N/A'} → $${newPrice.toFixed(2)}`);
            updated++;
          } else {
            errors++;
          }
        } else {
          unchanged++;
        }
      }
      
      console.log('\n📊 Update Summary:');
      console.log(`   Updated: ${updated}`);
      console.log(`   Unchanged: ${unchanged}`);
      console.log(`   Errors: ${errors}`);
    }
    
    // Show unmatched (might be useful to add to Notion)
    if (unmatched.length > 0 && checkOnly) {
      console.log('\n⚠️  Unmatched CSV Items (not in Notion):');
      console.log('   These might need to be added to Notion:\n');
      unmatched.slice(0, 10).forEach(item => {
        console.log(`     ${item.item}: $${item.price.toFixed(2)}`);
      });
      if (unmatched.length > 10) {
        console.log(`     ... and ${unmatched.length - 10} more`);
      }
    }
    
    console.log('\n✅ Done!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
