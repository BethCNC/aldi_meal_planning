/**
 * Fetch and Analyze Notion Databases
 * 
 * Fetches ingredients and recipes from Notion and saves them to JSON files
 * for analysis and cost calculation.
 */

import notion from '../backend/notion/notionClient.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const DB_IDS = {
  ingredients: process.env.NOTION_ALDI_INGREDIENTS_DB_ID || process.env.NOTION_INGREDIENTS_DB_ID,
  recipes: process.env.NOTION_ALDI_RECIPES_DB_ID || process.env.NOTION_RECIPES_DB_ID
};

/**
 * Fetch all pages from a database (handles pagination)
 */
async function fetchAllPages(databaseId) {
  let allResults = [];
  let hasMore = true;
  let nextCursor = undefined;
  
  while (hasMore) {
    const response = await notion.databases.query({
      database_id: databaseId,
      start_cursor: nextCursor,
      page_size: 100
    });
    
    allResults = allResults.concat(response.results);
    hasMore = response.has_more;
    nextCursor = response.next_cursor;
    
    // Rate limiting
    if (hasMore) {
      await new Promise(resolve => setTimeout(resolve, 350));
    }
  }
  
  return allResults;
}

/**
 * Extract property value from Notion page
 */
function getPropertyValue(page, propertyName) {
  const prop = page.properties[propertyName];
  if (!prop) return null;
  
  switch (prop.type) {
    case 'title':
      return prop.title?.[0]?.plain_text || '';
    case 'rich_text':
      return prop.rich_text?.[0]?.plain_text || '';
    case 'number':
      return prop.number;
    case 'select':
      return prop.select?.name || null;
    case 'multi_select':
      return prop.multi_select?.map(item => item.name) || [];
    case 'date':
      return prop.date?.start || null;
    case 'url':
      return prop.url || null;
    case 'relation':
      return prop.relation?.map(r => r.id) || [];
    case 'checkbox':
      return prop.checkbox || false;
    default:
      return null;
  }
}

/**
 * Fetch and format ingredients
 */
async function fetchIngredients() {
  console.log('📦 Fetching Ingredients database...\n');
  
  if (!DB_IDS.ingredients) {
    throw new Error('NOTION_INGREDIENTS_DB_ID or NOTION_ALDI_INGREDIENTS_DB_ID not found in .env');
  }
  
  const pages = await fetchAllPages(DB_IDS.ingredients);
  
  const ingredients = pages.map(page => {
    const item = getPropertyValue(page, 'Item');
    let pricePerPackage = getPropertyValue(page, 'Price per Package ($)');
    const packageSize = getPropertyValue(page, 'Package Size');
    const packageUnit = getPropertyValue(page, 'Package Unit');
    const baseUnit = getPropertyValue(page, 'Base Unit');
    const pricePerBaseUnit = getPropertyValue(page, 'Price per Base Unit ($)');
    const category = getPropertyValue(page, 'Grocery Category');
    const notes = getPropertyValue(page, 'Notes');
    
    // Calculate package price from PPU if missing
    if (!pricePerPackage && pricePerBaseUnit && packageSize) {
      pricePerPackage = pricePerBaseUnit * packageSize;
    }
    
    return {
      id: page.id,
      item,
      pricePerPackage,
      packageSize,
      packageUnit,
      baseUnit,
      pricePerBaseUnit,
      category,
      notes,
      url: page.url
    };
  });
  
  console.log(`✅ Fetched ${ingredients.length} ingredients\n`);
  
  // Save to file
  const outputPath = path.join(process.cwd(), 'data', 'notion-ingredients.json');
  fs.writeFileSync(outputPath, JSON.stringify(ingredients, null, 2));
  console.log(`💾 Saved to: ${outputPath}\n`);
  
  // Show summary
  console.log('📊 Ingredients Summary:');
  console.log(`   Total: ${ingredients.length}`);
  console.log(`   With prices: ${ingredients.filter(i => i.pricePerPackage).length}`);
  console.log(`   With PPU: ${ingredients.filter(i => i.pricePerBaseUnit).length}`);
  console.log(`   Categories: ${[...new Set(ingredients.map(i => i.category).filter(Boolean))].join(', ')}\n`);
  
  return ingredients;
}

/**
 * Fetch and format recipes
 */
async function fetchRecipes() {
  console.log('🍳 Fetching Recipes database...\n');
  
  if (!DB_IDS.recipes) {
    throw new Error('NOTION_RECIPES_DB_ID or NOTION_ALDI_RECIPES_DB_ID not found in .env');
  }
  
  const pages = await fetchAllPages(DB_IDS.recipes);
  
  const recipes = await Promise.all(pages.map(async (page) => {
    const recipeName = getPropertyValue(page, 'Recipe Name');
    const servings = getPropertyValue(page, 'Servings');
    const category = getPropertyValue(page, 'Category');
    const cost = getPropertyValue(page, 'Cost ($)');
    const recipeCost = getPropertyValue(page, 'Recipe Cost');
    const costPerServing = getPropertyValue(page, 'Cost per Serving ($)');
    const recipeIngredients = getPropertyValue(page, 'Recipe Ingredients');
    const instructions = getPropertyValue(page, 'Instructions');
    const sourceUrl = getPropertyValue(page, 'Source/Link');
    const tags = getPropertyValue(page, 'Tags') || [];
    
    // Get linked ingredients
    const ingredientIds = getPropertyValue(page, 'Aldi Ingredients') || 
                         getPropertyValue(page, 'Database Ingredients ') || [];
    
    // Fetch full ingredient details if we have IDs
    let linkedIngredients = [];
    if (ingredientIds.length > 0) {
      // Note: We'll fetch these in the cost calculation script
      // For now, just store the IDs
      linkedIngredients = ingredientIds;
    }
    
    return {
      id: page.id,
      recipeName,
      servings,
      category,
      cost: cost || recipeCost,
      costPerServing,
      recipeIngredients,
      instructions,
      sourceUrl,
      tags,
      linkedIngredientIds: linkedIngredients,
      url: page.url
    };
  }));
  
  console.log(`✅ Fetched ${recipes.length} recipes\n`);
  
  // Save to file
  const outputPath = path.join(process.cwd(), 'data', 'notion-recipes.json');
  fs.writeFileSync(outputPath, JSON.stringify(recipes, null, 2));
  console.log(`💾 Saved to: ${outputPath}\n`);
  
  // Show summary
  console.log('📊 Recipes Summary:');
  console.log(`   Total: ${recipes.length}`);
  console.log(`   With cost: ${recipes.filter(r => r.cost).length}`);
  console.log(`   With linked ingredients: ${recipes.filter(r => r.linkedIngredientIds?.length > 0).length}`);
  console.log(`   With ingredient text: ${recipes.filter(r => r.recipeIngredients).length}`);
  console.log(`   Categories: ${[...new Set(recipes.map(r => r.category).filter(Boolean))].join(', ')}\n`);
  
  return recipes;
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🔍 Fetching Notion Databases\n');
    console.log('═'.repeat(50) + '\n');
    
    const ingredients = await fetchIngredients();
    console.log('\n' + '═'.repeat(50) + '\n');
    const recipes = await fetchRecipes();
    
    console.log('\n✅ Complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Review the JSON files in data/');
    console.log('   2. Run: node scripts/calculate-recipe-costs.js');
    console.log('      to calculate costs based on linked ingredients\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.message.includes('not found')) {
      console.error('\n💡 Make sure your .env file has:');
      console.error('   NOTION_API_KEY=...');
      console.error('   NOTION_INGREDIENTS_DB_ID=...');
      console.error('   NOTION_RECIPES_DB_ID=...\n');
    }
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { fetchIngredients, fetchRecipes, getPropertyValue };
