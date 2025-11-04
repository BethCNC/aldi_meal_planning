/**
 * Populate Missing Ingredient Data
 * 
 * Fetches prices and helps fill in missing fields for specific ingredients
 * 
 * Usage:
 *   node scripts/populate-missing-ingredients.js --fetch-prices
 *   node scripts/populate-missing-ingredients.js --update-missing
 *   node scripts/populate-missing-ingredients.js --list-only
 */

import notion from '../src/notion/notionClient.js';
import {searchIngredient, updateIngredientPrice} from '../src/notion/notionClient.js';
import axios from 'axios';
import * as cheerio from 'cheerio';
import {setTimeout} from 'timers/promises';
import readline from 'readline';
import dotenv from 'dotenv';

dotenv.config();

const DB_IDS = {
  ingredients: process.env.NOTION_ALDI_INGREDIENTS_DB_ID || process.env.NOTION_INGREDIENTS_DB_ID
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Priority ingredients list with known package info where available
 */
const PRIORITY_INGREDIENTS = [
  {
    name: 'coconut oil',
    notes: 'Missing Base Unit, Package Size, Package Unit',
    commonPackage: {size: 14, unit: 'oz', baseUnit: 'ml', typicalPrice: null}
  },
  {
    name: 'whole chicken',
    notes: 'Missing Price, Base Unit, Package Size, Package Unit',
    commonPackage: {size: 3.5, unit: 'lb', baseUnit: 'g', typicalPrice: null}
  },
  {
    name: 'white rice, 3 lbs.',
    notes: 'Price is 0, has Base Unit (g) and Package Size (3) but Package Unit missing',
    commonPackage: {size: 3, unit: 'lb', baseUnit: 'g', typicalPrice: null}
  },
  {
    name: 'buns, hamburger',
    notes: 'Price 0 and missing Base Unit, Package Size, Package Unit',
    commonPackage: {size: 8, unit: 'each', baseUnit: 'each', typicalPrice: null}
  },
  {
    name: 'ground turkey',
    notes: 'Missing Price, Base Unit, Package Size, Package Unit',
    commonPackage: {size: 1, unit: 'lb', baseUnit: 'g', typicalPrice: null}
  },
  {
    name: 'tomatoes, grape',
    notes: 'Has Price, but missing Base Unit, Package Size, Package Unit',
    commonPackage: {size: 10, unit: 'oz', baseUnit: 'g', typicalPrice: null}
  },
  {
    name: 'mayonnaise',
    notes: 'Has Price, but missing Base Unit, Package Size, Package Unit',
    commonPackage: {size: 30, unit: 'oz', baseUnit: 'ml', typicalPrice: null}
  },
  {
    name: 'chicken thighs',
    notes: 'Has Price, but missing Base Unit, Package Size, Package Unit',
    commonPackage: {size: 1.5, unit: 'lb', baseUnit: 'g', typicalPrice: null}
  },
  {
    name: 'graham crackers',
    notes: 'Has Price, but missing Base Unit, Package Size, Package Unit',
    commonPackage: {size: 14.4, unit: 'oz', baseUnit: 'g', typicalPrice: null}
  },
  {
    name: 'sour cream',
    notes: 'Has Price, but missing Base Unit, Package Size, Package Unit',
    commonPackage: {size: 16, unit: 'oz', baseUnit: 'ml', typicalPrice: null}
  },
  // Bonus priority items
  {
    name: 'chicken breasts',
    notes: 'Frequent staple',
    commonPackage: {size: 1.5, unit: 'lb', baseUnit: 'g', typicalPrice: null}
  },
  {
    name: 'broccoli',
    notes: 'Frequent staple',
    commonPackage: {size: 12, unit: 'oz', baseUnit: 'g', typicalPrice: null}
  },
  {
    name: 'bell peppers',
    notes: 'Frequent staple',
    commonPackage: {size: 3, unit: 'each', baseUnit: 'each', typicalPrice: null}
  },
  {
    name: 'soy sauce',
    notes: 'Frequent staple',
    commonPackage: {size: 10, unit: 'oz', baseUnit: 'ml', typicalPrice: null}
  }
];

/**
 * Search Aldi website for price
 */
async function searchAldiPrice(productName) {
  try {
    const searchUrl = `https://www.aldi.us/en/grocery/search.html?text=${encodeURIComponent(productName)}`;
    
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      timeout: 15000,
      maxRedirects: 5
    });
    
    const $ = cheerio.load(response.data);
    
    // Try multiple selector patterns
    let price = null;
    let priceText = null;
    
    const selectors = [
      '.price, .product-price, [data-price]',
      '.currency-value',
      'span:contains("$")'
    ];
    
    for (const selector of selectors) {
      const $price = $(selector).first();
      if ($price.length) {
        priceText = $price.text().trim();
        const match = priceText.match(/\$?(\d+\.?\d*)/);
        if (match) {
          price = parseFloat(match[1]);
          if (price > 0 && price < 100) { // Sanity check
            break;
          }
        }
      }
    }
    
    return {price, priceText, source: 'aldi_website'};
    
  } catch (error) {
    return {price: null, error: error.message};
  }
}

/**
 * Check what's missing for an ingredient
 */
function checkMissing(ingredient) {
  const item = ingredient.properties['Item']?.title?.[0]?.plain_text || 'Unknown';
  const price = ingredient.properties['Price per Package ($)']?.number;
  const packageSize = ingredient.properties['Package Size']?.number;
  const packageUnit = ingredient.properties['Package Unit']?.select?.name;
  const baseUnit = ingredient.properties['Base Unit']?.select?.name;
  
  return {
    name: item,
    missing: {
      price: !price || price === 0,
      packageSize: !packageSize,
      packageUnit: !packageUnit,
      baseUnit: !baseUnit
    },
    current: {
      price,
      packageSize,
      packageUnit,
      baseUnit
    }
  };
}

/**
 * Update ingredient with all data
 */
async function updateIngredient(ingredientId, data) {
  try {
    const properties = {};
    
    if (data.price !== undefined) {
      properties['Price per Package ($)'] = {number: data.price};
    }
    
    if (data.packageSize !== undefined) {
      properties['Package Size'] = {number: data.packageSize};
    }
    
    if (data.packageUnit) {
      properties['Package Unit'] = {select: {name: data.packageUnit}};
    }
    
    if (data.baseUnit) {
      properties['Base Unit'] = {select: {name: data.baseUnit}};
    }
    
    await notion.pages.update({
      page_id: ingredientId,
      properties
    });
    
    return true;
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    return false;
  }
}

/**
 * Fetch prices for all priority ingredients
 */
async function fetchAllPrices() {
  console.log('🛒 Fetching Prices from Aldi Website\n');
  console.log('This may take a few minutes due to rate limiting...\n');
  
  const results = [];
  
  for (const item of PRIORITY_INGREDIENTS) {
    console.log(`🔍 Searching for: ${item.name}`);
    
    const priceData = await searchAldiPrice(item.name);
    
    if (priceData.price) {
      console.log(`   ✅ Found: $${priceData.price.toFixed(2)}`);
      results.push({...item, fetchedPrice: priceData.price});
    } else {
      console.log(`   ⚠️  Not found (${priceData.error || 'no results'})`);
      results.push({...item, fetchedPrice: null});
    }
    
    // Rate limiting
    await setTimeout(3000); // 3 seconds between requests
  }
  
  return results;
}

/**
 * Interactive update process
 */
async function updateMissingData() {
  console.log('📋 Updating Missing Ingredient Data\n');
  
  let updated = 0;
  let skipped = 0;
  
  for (const item of PRIORITY_INGREDIENTS) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`\n📦 ${item.name}`);
    console.log(`   ${item.notes}`);
    
    // Find ingredient in Notion
    const ingredient = await searchIngredient(item.name);
    
    if (!ingredient) {
      console.log(`   ⚠️  Not found in Notion database`);
      skipped++;
      continue;
    }
    
    const status = checkMissing(ingredient);
    
    console.log(`\n   Current status:`);
    console.log(`   - Price: ${status.current.price ? `$${status.current.price.toFixed(2)}` : '❌ Missing'}`);
    console.log(`   - Package Size: ${status.current.packageSize || '❌ Missing'}`);
    console.log(`   - Package Unit: ${status.current.packageUnit || '❌ Missing'}`);
    console.log(`   - Base Unit: ${status.current.baseUnit || '❌ Missing'}`);
    
    const needsUpdate = status.missing.price || status.missing.packageSize || 
                       status.missing.packageUnit || status.missing.baseUnit;
    
    if (!needsUpdate) {
      console.log(`\n   ✅ All data complete!`);
      skipped++;
      continue;
    }
    
    const update = await prompt('\n   Update this ingredient? (y/n/skip): ');
    
    if (update.toLowerCase() !== 'y') {
      skipped++;
      continue;
    }
    
    const updates = {};
    
    // Price
    if (status.missing.price || status.current.price === 0) {
      const suggested = item.commonPackage.typicalPrice || 
                       (item.name === 'white rice, 3 lbs.' ? '2.99' : null);
      
      const pricePrompt = suggested 
        ? `   Enter Price per Package ($) [suggested: $${suggested}]: $`
        : '   Enter Price per Package ($): $';
      
      const priceInput = await prompt(pricePrompt);
      const price = parseFloat(priceInput);
      if (!isNaN(price) && price > 0) {
        updates.price = price;
      }
    }
    
    // Package Size
    if (status.missing.packageSize) {
      const suggested = item.commonPackage.size;
      const sizeInput = await prompt(`   Enter Package Size [suggested: ${suggested}]: `);
      const size = parseFloat(sizeInput);
      if (!isNaN(size) && size > 0) {
        updates.packageSize = size;
      }
    }
    
    // Package Unit
    if (status.missing.packageUnit) {
      const suggested = item.commonPackage.unit;
      console.log('   Available units: lb, oz, g, kg, ml, l, cup, each');
      const unitInput = await prompt(`   Enter Package Unit [suggested: ${suggested}]: `);
      if (unitInput) {
        updates.packageUnit = unitInput;
      }
    }
    
    // Base Unit
    if (status.missing.baseUnit) {
      const suggested = item.commonPackage.baseUnit;
      const baseInput = await prompt(`   Enter Base Unit [suggested: ${suggested}]: `);
      if (baseInput) {
        updates.baseUnit = baseInput;
      }
    }
    
    // Update
    if (Object.keys(updates).length > 0) {
      const success = await updateIngredient(ingredient.id, updates);
      if (success) {
        console.log(`   ✅ Updated!`);
        updated++;
      }
    } else {
      console.log(`   ⏭️  No changes`);
      skipped++;
    }
  }
  
  console.log(`\n${'='.repeat(70)}`);
  console.log('\n📊 Summary:');
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped: ${skipped}`);
  console.log('\n✅ Done!');
}

/**
 * Show list of missing data only
 */
async function showMissingList() {
  console.log('📋 Missing Ingredient Data Report\n');
  console.log('='.repeat(70));
  
  for (const item of PRIORITY_INGREDIENTS) {
    const ingredient = await searchIngredient(item.name);
    
    if (!ingredient) {
      console.log(`\n❌ ${item.name} - NOT FOUND in Notion`);
      continue;
    }
    
    const status = checkMissing(ingredient);
    const missingFields = [];
    
    if (status.missing.price || status.current.price === 0) missingFields.push('Price');
    if (status.missing.packageSize) missingFields.push('Package Size');
    if (status.missing.packageUnit) missingFields.push('Package Unit');
    if (status.missing.baseUnit) missingFields.push('Base Unit');
    
    if (missingFields.length > 0) {
      console.log(`\n📦 ${item.name}`);
      console.log(`   Missing: ${missingFields.join(', ')}`);
      console.log(`   ${item.notes}`);
      
      if (item.commonPackage) {
        console.log(`   Suggested: ${item.commonPackage.size} ${item.commonPackage.unit}, base: ${item.commonPackage.baseUnit}`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(70));
}

/**
 * Quick update using suggested values
 */
async function quickUpdateWithDefaults() {
  console.log('⚡ Quick Update with Default Values\n');
  console.log('This will use suggested package sizes/units.\n');
  
  const confirm = await prompt('Continue? This will update multiple ingredients (y/n): ');
  if (confirm.toLowerCase() !== 'y') {
    console.log('Cancelled.');
    return;
  }
  
  let updated = 0;
  let errors = 0;
  
  for (const item of PRIORITY_INGREDIENTS) {
    const ingredient = await searchIngredient(item.name);
    
    if (!ingredient) {
      console.log(`\n⚠️  ${item.name} - not found, skipping`);
      continue;
    }
    
    const status = checkMissing(ingredient);
    const needsUpdate = status.missing.packageSize || status.missing.packageUnit || status.missing.baseUnit;
    
    if (!needsUpdate) {
      continue;
    }
    
    const updates = {};
    
    if (status.missing.packageSize && item.commonPackage.size) {
      updates.packageSize = item.commonPackage.size;
    }
    
    if (status.missing.packageUnit && item.commonPackage.unit) {
      updates.packageUnit = item.commonPackage.unit;
    }
    
    if (status.missing.baseUnit && item.commonPackage.baseUnit) {
      updates.baseUnit = item.commonPackage.baseUnit;
    }
    
    if (Object.keys(updates).length > 0) {
      const success = await updateIngredient(ingredient.id, updates);
      if (success) {
        console.log(`✅ ${item.name} - updated`);
        updated++;
      } else {
        errors++;
      }
    }
  }
  
  console.log(`\n📊 Updated: ${updated}, Errors: ${errors}`);
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const fetchPrices = args.includes('--fetch-prices');
  const updateMissing = args.includes('--update-missing');
  const listOnly = args.includes('--list-only');
  const quickUpdate = args.includes('--quick-update');
  
  try {
    if (listOnly) {
      await showMissingList();
    } else if (quickUpdate) {
      await quickUpdateWithDefaults();
    } else if (fetchPrices) {
      const results = await fetchAllPrices();
      
      console.log('\n' + '='.repeat(70));
      console.log('\n📊 Price Fetching Results:\n');
      
      results.forEach(r => {
        if (r.fetchedPrice) {
          console.log(`✅ ${r.name}: $${r.fetchedPrice.toFixed(2)}`);
        } else {
          console.log(`⚠️  ${r.name}: Not found`);
        }
      });
      
      console.log('\n💡 Next step: Run --update-missing to fill in the data');
    } else if (updateMissing) {
      await updateMissingData();
    } else {
      console.log('Usage:');
      console.log('  node scripts/populate-missing-ingredients.js --list-only');
      console.log('  node scripts/populate-missing-ingredients.js --fetch-prices');
      console.log('  node scripts/populate-missing-ingredients.js --update-missing');
      console.log('  node scripts/populate-missing-ingredients.js --quick-update');
      console.log('\nRecommended order:');
      console.log('  1. --list-only (see what\'s missing)');
      console.log('  2. --fetch-prices (get current prices from Aldi)');
      console.log('  3. --update-missing (interactive update)');
      console.log('  OR --quick-update (use defaults, then manually fix prices)');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    rl.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
