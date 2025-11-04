/**
 * Bulk Update Ingredients
 * 
 * Interactive tool to quickly update multiple ingredients at once
 * Helps fill in missing Price per Package, Package Size, Package Unit
 * 
 * Usage:
 *   node scripts/bulk-update-ingredients.js
 */

import {queryRecipes} from '../src/notion/notionClient.js';
import notion from '../src/notion/notionClient.js';
import {updateIngredientPrice} from '../src/notion/notionClient.js';
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
 * Get ingredients used in recipes (priority list)
 */
async function getPriorityIngredients() {
  const recipes = await queryRecipes();
  const ingredientCounts = new Map();
  
  for (const recipe of recipes) {
    const ingredients = recipe.properties['Aldi Ingredients']?.relation || [];
    
    for (const rel of ingredients) {
      try {
        const ing = await notion.pages.retrieve({page_id: rel.id});
        const name = ing.properties['Item']?.title?.[0]?.plain_text || 'Unknown';
        ingredientCounts.set(rel.id, {
          name,
          count: (ingredientCounts.get(rel.id)?.count || 0) + 1
        });
      } catch (err) {
        // Skip
      }
    }
  }
  
  // Sort by usage count
  return Array.from(ingredientCounts.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .map(([id, data]) => ({id, ...data}));
}

/**
 * Check what data is missing for ingredient
 */
function checkMissingData(ingredient) {
  const price = ingredient.properties['Price per Package ($)']?.number;
  const packageSize = ingredient.properties['Package Size']?.number;
  const packageUnit = ingredient.properties['Package Unit']?.select?.name;
  const baseUnit = ingredient.properties['Base Unit']?.select?.name;
  
  const missing = [];
  if (!price) missing.push('Price per Package ($)');
  if (!packageSize) missing.push('Package Size');
  if (!packageUnit) missing.push('Package Unit');
  if (!baseUnit) missing.push('Base Unit');
  
  return {
    hasAll: missing.length === 0,
    missing,
    price,
    packageSize,
    packageUnit,
    baseUnit
  };
}

/**
 * Update ingredient
 */
async function updateIngredient(ingredientId, updates) {
  try {
    const properties = {};
    
    if (updates.price !== undefined) {
      properties['Price per Package ($)'] = {number: updates.price};
    }
    
    if (updates.packageSize !== undefined) {
      properties['Package Size'] = {number: updates.packageSize};
    }
    
    if (updates.packageUnit) {
      properties['Package Unit'] = {select: {name: updates.packageUnit}};
    }
    
    if (updates.baseUnit) {
      properties['Base Unit'] = {select: {name: updates.baseUnit}};
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
 * Main interactive flow
 */
async function main() {
  console.log('📦 Bulk Ingredient Data Updater\n');
  console.log('This tool helps you quickly fill in missing ingredient data.\n');
  
  try {
    // Get priority ingredients (most used in recipes)
    console.log('📥 Finding ingredients used in recipes...\n');
    const priorityIngredients = await getPriorityIngredients();
    
    console.log(`✅ Found ${priorityIngredients.length} ingredients used in recipes\n`);
    
    // Get full ingredient data
    const ingredients = [];
    for (const priority of priorityIngredients.slice(0, 30)) { // Top 30 most used
      try {
        const ing = await notion.pages.retrieve({page_id: priority.id});
        const status = checkMissingData(ing);
        
        if (!status.hasAll) {
          ingredients.push({
            ...priority,
            ingredient: ing,
            status,
            usage: priority.count
          });
        }
      } catch (err) {
        // Skip
      }
    }
    
    if (ingredients.length === 0) {
      console.log('✅ All priority ingredients have complete data!');
      rl.close();
      return;
    }
    
    console.log(`📋 Found ${ingredients.length} priority ingredients needing data:\n`);
    
    let updated = 0;
    let skipped = 0;
    
    for (const item of ingredients) {
      const name = item.name;
      const status = item.status;
      const usage = item.usage;
      
      console.log(`\n📦 ${name} (used in ${usage} recipe${usage > 1 ? 's' : ''})`);
      console.log(`   Missing: ${status.missing.join(', ')}`);
      
      if (status.price) {
        console.log(`   Current price: $${status.price.toFixed(2)}`);
      }
      
      const update = await prompt('   Update? (y/n/skip): ');
      
      if (update.toLowerCase() === 'n' || update.toLowerCase() === 'skip') {
        skipped++;
        continue;
      }
      
      if (update.toLowerCase() !== 'y') {
        continue;
      }
      
      const updates = {};
      
      // Price
      if (!status.price) {
        const priceInput = await prompt('   Enter Price per Package ($): ');
        const price = parseFloat(priceInput);
        if (!isNaN(price)) updates.price = price;
      }
      
      // Package Size
      if (!status.packageSize) {
        const sizeInput = await prompt('   Enter Package Size (number): ');
        const size = parseFloat(sizeInput);
        if (!isNaN(size)) updates.packageSize = size;
      }
      
      // Package Unit
      if (!status.packageUnit) {
        console.log('   Available units: lb, oz, g, kg, ml, l, each');
        const unitInput = await prompt('   Enter Package Unit: ');
        if (unitInput) updates.packageUnit = unitInput;
      }
      
      // Base Unit
      if (!status.baseUnit && updates.packageUnit) {
        const baseUnitMap = {
          'lb': 'g',
          'lbs': 'g',
          'oz': 'g',
          'g': 'g',
          'kg': 'g',
          'ml': 'ml',
          'l': 'ml',
          'cup': 'ml',
          'cups': 'ml',
          'each': 'each'
        };
        
        const suggested = baseUnitMap[updates.packageUnit.toLowerCase()] || 'each';
        const baseInput = await prompt(`   Enter Base Unit (suggested: ${suggested}): `);
        updates.baseUnit = baseInput || suggested;
      }
      
      // Update
      if (Object.keys(updates).length > 0) {
        const success = await updateIngredient(item.id, updates);
        if (success) {
          console.log(`   ✅ Updated!`);
          updated++;
        }
      } else {
        console.log(`   ⏭️  No changes`);
        skipped++;
      }
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('\n📊 Summary:');
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log('\n✅ Done!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    rl.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
