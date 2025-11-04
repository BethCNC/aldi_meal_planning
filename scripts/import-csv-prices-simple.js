/**
 * Simple CSV Price Importer
 * 
 * Matches CSV items to Notion ingredients and shows what can be imported
 */

import {readFile} from 'fs/promises';
import notion from '../src/notion/notionClient.js';
import {searchIngredient} from '../src/notion/notionClient.js';
import dotenv from 'dotenv';

dotenv.config();

const DB_IDS = {
  ingredients: process.env.NOTION_ALDI_INGREDIENTS_DB_ID || process.env.NOTION_INGREDIENTS_DB_ID
};

/**
 * Parse simple CSV manually (avoiding external dependencies)
 */
function parseCSV(content) {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const items = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    if (values.length < 2) continue;
    
    // Try to find item and price columns
    let itemCol = -1;
    let priceCol = -1;
    
    for (let j = 0; j < headers.length; j++) {
      const header = headers[j].toLowerCase();
      if ((header.includes('item') || header.includes('name')) && itemCol === -1) {
        itemCol = j;
      }
      if ((header.includes('price') || header === 'cost' || header.includes('usd')) && priceCol === -1) {
        priceCol = j;
      }
    }
    
    if (itemCol >= 0 && priceCol >= 0 && values[itemCol] && values[priceCol]) {
      const price = parseFloat(values[priceCol]);
      if (!isNaN(price) && price > 0) {
        items.push({
          item: values[itemCol].trim(),
          price: price,
          source: 'CSV'
        });
      }
    }
  }
  
  return items;
}

/**
 * Parse the shopping list CSV (special format)
 */
function parseShoppingListCSV(content) {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  const items = [];
  
  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    
    // This CSV has items in different column positions
    // Items appear after "Qnty." columns
    const categories = [
      {name: 'SNACKS', startCol: 1},
      {name: 'DAIRY', startCol: 5},
      {name: 'CANNED/DRY GOODS', startCol: 9},
      {name: 'VEGETABLES', startCol: 13},
      {name: 'REFRIGERATED DELI', startCol: 17}
    ];
    
    for (const cat of categories) {
      if (cols.length > cat.startCol + 1) {
        const itemName = cols[cat.startCol]?.trim().replace(/^"|"$/g, '');
        const priceStr = cols[cat.startCol + 2]?.trim().replace(/^"|"$/g, '');
        
        if (itemName && itemName.length > 2 && !itemName.includes(',')) {
          const price = parseFloat(priceStr);
          if (!isNaN(price) && price > 0) {
            items.push({
              item: itemName,
              price: price,
              category: cat.name,
              source: 'Aldi-Master-Price-List'
            });
          }
        }
      }
    }
  }
  
  return items;
}

/**
 * Parse unified CSV
 */
function parseUnifiedCSV(content) {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  const items = [];
  
  // Header: item,price,category
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length >= 2) {
      const itemName = cols[0]?.trim().replace(/^"|"$/g, '');
      const priceStr = cols[1]?.trim().replace(/^"|"$/g, '');
      
      if (itemName && priceStr) {
        const price = parseFloat(priceStr);
        if (!isNaN(price) && price > 0) {
          items.push({
            item: itemName,
            price: price,
            category: cols[2]?.trim().replace(/^"|"$/g, '') || null,
            source: 'unified_aldi_price_table'
          });
        }
      }
    }
  }
  
  return items;
}

/**
 * Parse sample CSV
 */
function parseSampleCSV(content) {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  const items = [];
  
  // Header: store,source_url,scraped_at,item,price_usd
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length >= 5) {
      const itemName = cols[3]?.trim().replace(/^"|"$/g, '');
      const priceStr = cols[4]?.trim().replace(/^"|"$/g, '');
      
      if (itemName && priceStr) {
        const price = parseFloat(priceStr);
        if (!isNaN(price) && price > 0) {
          items.push({
            item: itemName,
            price: price,
            source: 'aldi_price_list_sample'
          });
        }
      }
    }
  }
  
  return items;
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
 * Match CSV item to ingredient name
 */
function matchNames(csvName, notionName) {
  const csvNorm = normalizeName(csvName);
  const notionNorm = normalizeName(notionName);
  
  if (csvNorm === notionNorm) return {matched: true, score: 100};
  if (csvNorm.includes(notionNorm) || notionNorm.includes(csvNorm)) return {matched: true, score: 80};
  
  // Word matching
  const csvWords = csvNorm.split(' ').filter(w => w.length > 2);
  const notionWords = notionNorm.split(' ').filter(w => w.length > 2);
  const matches = csvWords.filter(w => notionWords.includes(w));
  
  if (matches.length >= 2) {
    return {matched: true, score: Math.round((matches.length / Math.max(csvWords.length, notionWords.length)) * 100)};
  }
  
  if (matches.length === 1 && csvWords.length <= 3) {
    return {matched: true, score: 60};
  }
  
  return {matched: false, score: 0};
}

/**
 * Get all ingredients
 */
async function getAllIngredients() {
  const all = [];
  let cursor = undefined;
  
  do {
    const response = await notion.databases.query({
      database_id: DB_IDS.ingredients,
      start_cursor: cursor,
      page_size: 100
    });
    all.push(...response.results);
    cursor = response.next_cursor;
  } while (cursor);
  
  return all;
}

/**
 * Update ingredient price
 */
async function updatePrice(ingredientId, price) {
  try {
    await notion.pages.update({
      page_id: ingredientId,
      properties: {
        'Price per Package ($)': {number: price}
      }
    });
    return true;
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    return false;
  }
}

/**
 * Main
 */
async function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes('--check-only');
  const update = args.includes('--update');
  
  console.log('📥 CSV Price Matcher\n');
  
  try {
    // Read and parse CSVs
    const csvFiles = [
      {path: '/Users/bethcartrette/Downloads/Aldi-Master-Price-List - Shopping.csv', parser: parseShoppingListCSV},
      {path: '/Users/bethcartrette/Downloads/unified_aldi_price_table_for_notion.csv', parser: parseUnifiedCSV},
      {path: '/Users/bethcartrette/Downloads/aldi_price_list_sample.csv', parser: parseSampleCSV}
    ];
    
    const allCSVItems = [];
    
    for (const file of csvFiles) {
      try {
        const content = await readFile(file.path, 'utf-8');
        const items = file.parser(content);
        console.log(`✅ ${file.path.split('/').pop()}: ${items.length} items`);
        allCSVItems.push(...items);
      } catch (error) {
        console.log(`⚠️  ${file.path.split('/').pop()}: ${error.message}`);
      }
    }
    
    // Deduplicate
    const unique = new Map();
    for (const item of allCSVItems) {
      const key = normalizeName(item.item);
      if (!unique.has(key) || !unique.get(key).price) {
        unique.set(key, item);
      }
    }
    
    const csvItems = Array.from(unique.values());
    console.log(`\n📊 Total unique items: ${csvItems.length}\n`);
    
    // Get Notion ingredients
    console.log('📥 Loading Notion ingredients...');
    const notionIngredients = await getAllIngredients();
    console.log(`✅ Found ${notionIngredients.length} ingredients\n`);
    
    // Priority items to check
    const priorityNames = [
      'coconut oil', 'whole chicken', 'white rice', 'buns hamburger',
      'ground turkey', 'tomatoes grape', 'mayonnaise', 'chicken thighs',
      'graham crackers', 'sour cream', 'chicken breasts', 'broccoli',
      'bell peppers', 'peppers', 'soy sauce'
    ];
    
    // Match items
    console.log('🔍 Matching items...\n');
    
    const matches = [];
    
    for (const csvItem of csvItems) {
      for (const notionIng of notionIngredients) {
        const notionName = notionIng.properties['Item']?.title?.[0]?.plain_text || '';
        const match = matchNames(csvItem.item, notionName);
        
        if (match.matched && match.score >= 50) {
          matches.push({
            csvItem,
            notionIng,
            notionName,
            score: match.score
          });
          break; // Take first good match
        }
      }
    }
    
    // Filter priority matches
    const priorityMatches = matches.filter(m => {
      const name = normalizeName(m.notionName);
      return priorityNames.some(p => name.includes(p));
    }).sort((a, b) => b.score - a.score);
    
    // Show results
    console.log('='.repeat(70));
    console.log('\n🎯 PRIORITY ITEMS FOUND IN CSVs:\n');
    
    if (priorityMatches.length === 0) {
      console.log('⚠️  No priority items matched');
    } else {
      for (const match of priorityMatches) {
        const currentPrice = match.notionIng.properties['Price per Package ($)']?.number;
        const csvPrice = match.csvItem.price;
        const needsUpdate = !currentPrice || currentPrice === 0 || Math.abs(currentPrice - csvPrice) > 0.10;
        
        console.log(`📦 ${match.notionName}`);
        console.log(`   CSV Price: $${csvPrice.toFixed(2)} (${match.csvItem.source})`);
        console.log(`   Notion Price: ${currentPrice ? `$${currentPrice.toFixed(2)}` : '❌ Missing'}`);
        if (needsUpdate && currentPrice) {
          const diff = csvPrice > currentPrice ? `↑ +$${(csvPrice - currentPrice).toFixed(2)}` : `↓ -$${(currentPrice - csvPrice).toFixed(2)}`;
          console.log(`   Status: ${diff}`);
        } else if (needsUpdate) {
          console.log(`   Status: ✅ Can import`);
        } else {
          console.log(`   Status: ✓ Already set`);
        }
        console.log(`   Match: ${match.score}%`);
        console.log('');
      }
    }
    
    console.log('='.repeat(70));
    console.log(`\n📊 Summary:`);
    console.log(`   Total CSV items: ${csvItems.length}`);
    console.log(`   Matched to Notion: ${matches.length}`);
    console.log(`   Priority items: ${priorityMatches.length}`);
    
    // Update if requested
    if (!checkOnly && update && priorityMatches.length > 0) {
      console.log('\n💾 Updating prices...\n');
      
      let updated = 0;
      let unchanged = 0;
      
      for (const match of priorityMatches) {
        const currentPrice = match.notionIng.properties['Price per Package ($)']?.number;
        const csvPrice = match.csvItem.price;
        
        if (!currentPrice || currentPrice === 0 || Math.abs(currentPrice - csvPrice) > 0.10) {
          const success = await updatePrice(match.notionIng.id, csvPrice);
          if (success) {
            console.log(`✅ ${match.notionName}: $${currentPrice?.toFixed(2) || 'N/A'} → $${csvPrice.toFixed(2)}`);
            updated++;
          }
        } else {
          unchanged++;
        }
      }
      
      console.log(`\n📊 Updated: ${updated}, Unchanged: ${unchanged}`);
    }
    
    console.log('\n✅ Done!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
