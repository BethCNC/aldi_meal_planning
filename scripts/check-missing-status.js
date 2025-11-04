/**
 * Check Missing Status for Priority Ingredients
 * 
 * Shows exactly what's still missing for each priority item
 */

import notion from '../src/notion/notionClient.js';
import {searchIngredient} from '../src/notion/notionClient.js';
import dotenv from 'dotenv';

dotenv.config();

const DB_IDS = {
  ingredients: process.env.NOTION_ALDI_INGREDIENTS_DB_ID || process.env.NOTION_INGREDIENTS_DB_ID
};

/**
 * Priority ingredients from your list
 */
const PRIORITY_INGREDIENTS = [
  {name: 'coconut oil', needs: ['Base Unit', 'Package Size', 'Package Unit']},
  {name: 'whole chicken', needs: ['Price', 'Base Unit', 'Package Size', 'Package Unit']},
  {name: 'white rice, 3 lbs.', needs: ['Price', 'Package Unit']}, // Has Base Unit (g) and Package Size (3)
  {name: 'buns, hamburger', needs: ['Price', 'Base Unit', 'Package Size', 'Package Unit']},
  {name: 'ground turkey', needs: ['Price', 'Base Unit', 'Package Size', 'Package Unit']},
  {name: 'tomatoes, grape', needs: ['Base Unit', 'Package Size', 'Package Unit']}, // Has Price
  {name: 'mayonnaise', needs: ['Base Unit', 'Package Size', 'Package Unit']}, // Has Price
  {name: 'chicken thighs', needs: ['Base Unit', 'Package Size', 'Package Unit']}, // Has Price
  {name: 'graham crackers', needs: ['Base Unit', 'Package Size', 'Package Unit']}, // Has Price
  {name: 'sour cream', needs: ['Base Unit', 'Package Size', 'Package Unit']}, // Has Price
  {name: 'chicken breasts', needs: ['Base Unit', 'Package Size', 'Package Unit']},
  {name: 'broccoli', needs: ['Base Unit', 'Package Size', 'Package Unit']},
  {name: 'bell peppers', needs: ['Price', 'Base Unit', 'Package Size', 'Package Unit']},
  {name: 'soy sauce', needs: ['Base Unit', 'Package Size', 'Package Unit']}
];

/**
 * Check ingredient status
 */
function checkStatus(ingredient) {
  const item = ingredient.properties['Item']?.title?.[0]?.plain_text || 'Unknown';
  const price = ingredient.properties['Price per Package ($)']?.number;
  const packageSize = ingredient.properties['Package Size']?.number;
  const packageUnit = ingredient.properties['Package Unit']?.select?.name;
  const baseUnit = ingredient.properties['Base Unit']?.select?.name;
  
  const missing = [];
  if (!price || price === 0) missing.push('Price');
  if (!packageSize) missing.push('Package Size');
  if (!packageUnit) missing.push('Package Unit');
  if (!baseUnit) missing.push('Base Unit');
  
  return {
    name: item,
    has: {
      price: price && price > 0 ? `$${price.toFixed(2)}` : null,
      packageSize: packageSize || null,
      packageUnit: packageUnit || null,
      baseUnit: baseUnit || null
    },
    missing: missing,
    complete: missing.length === 0
  };
}

/**
 * Main
 */
async function main() {
  console.log('📋 Checking Missing Status for Priority Ingredients\n');
  console.log('='.repeat(70));
  
  const results = [];
  
  for (const item of PRIORITY_INGREDIENTS) {
    console.log(`\n🔍 ${item.name}`);
    
    const ingredient = await searchIngredient(item.name);
    
    if (!ingredient) {
      console.log('   ❌ NOT FOUND in Notion');
      results.push({
        name: item.name,
        found: false,
        missing: item.needs,
        has: {}
      });
      continue;
    }
    
    const status = checkStatus(ingredient);
    
    console.log(`   Name in Notion: ${status.name}`);
    
    // Show what's there
    if (status.has.price) console.log(`   ✅ Price: ${status.has.price}`);
    if (status.has.packageSize) console.log(`   ✅ Package Size: ${status.has.packageSize}`);
    if (status.has.packageUnit) console.log(`   ✅ Package Unit: ${status.has.packageUnit}`);
    if (status.has.baseUnit) console.log(`   ✅ Base Unit: ${status.has.baseUnit}`);
    
    // Show what's missing
    if (status.missing.length > 0) {
      console.log(`   ❌ Missing: ${status.missing.join(', ')}`);
      
      // Show expected vs actual
      const expectedMissing = item.needs;
      const actuallyMissing = status.missing;
      const unexpectedMissing = actuallyMissing.filter(m => !expectedMissing.includes(m));
      const fixed = expectedMissing.filter(m => !actuallyMissing.includes(m));
      
      if (fixed.length > 0) {
        console.log(`   ✅ Fixed: ${fixed.join(', ')} (no longer missing!)`);
      }
      if (unexpectedMissing.length > 0) {
        console.log(`   ⚠️  Unexpected: ${unexpectedMissing.join(', ')} (wasn't in original list)`);
      }
    } else {
      console.log(`   ✅ COMPLETE - All fields filled!`);
    }
    
    results.push({
      name: status.name,
      found: true,
      missing: status.missing,
      has: status.has,
      complete: status.complete
    });
  }
  
  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('\n📊 SUMMARY\n');
  
  const complete = results.filter(r => r.complete).length;
  const incomplete = results.filter(r => !r.complete && r.found).length;
  const notFound = results.filter(r => !r.found).length;
  
  console.log(`   ✅ Complete: ${complete}/${results.length}`);
  console.log(`   ⚠️  Incomplete: ${incomplete}/${results.length}`);
  console.log(`   ❌ Not Found: ${notFound}/${results.length}`);
  
  // Show what's still missing
  console.log('\n❌ STILL MISSING:\n');
  
  const missingCounts = {
    'Price': 0,
    'Package Size': 0,
    'Package Unit': 0,
    'Base Unit': 0
  };
  
  for (const result of results.filter(r => !r.complete && r.found)) {
    console.log(`📦 ${result.name}`);
    if (result.missing.includes('Price')) {
      console.log(`   ❌ Price: ${result.has.price || 'Missing'}`);
      missingCounts['Price']++;
    }
    if (result.missing.includes('Package Size')) {
      console.log(`   ❌ Package Size: ${result.has.packageSize || 'Missing'}`);
      missingCounts['Package Size']++;
    }
    if (result.missing.includes('Package Unit')) {
      console.log(`   ❌ Package Unit: ${result.has.packageUnit || 'Missing'}`);
      missingCounts['Package Unit']++;
    }
    if (result.missing.includes('Base Unit')) {
      console.log(`   ❌ Base Unit: ${result.has.baseUnit || 'Missing'}`);
      missingCounts['Base Unit']++;
    }
    console.log('');
  }
  
  console.log('📊 Missing Field Counts:');
  console.log(`   Price: ${missingCounts['Price']} items`);
  console.log(`   Package Size: ${missingCounts['Package Size']} items`);
  console.log(`   Package Unit: ${missingCounts['Package Unit']} items`);
  console.log(`   Base Unit: ${missingCounts['Base Unit']} items`);
  
  // Show complete items
  if (complete > 0) {
    console.log('\n✅ COMPLETE ITEMS:\n');
    for (const result of results.filter(r => r.complete)) {
      console.log(`   ✅ ${result.name}`);
      console.log(`      Price: ${result.has.price}, Size: ${result.has.packageSize} ${result.has.packageUnit}, Base: ${result.has.baseUnit}`);
    }
  }
  
  console.log('\n✅ Check complete!');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
