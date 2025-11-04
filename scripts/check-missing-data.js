import { createClient } from '@supabase/supabase-js';
import { Client } from '@notionhq/client';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DB_IDS = {
  ingredients: process.env.NOTION_ALDI_INGREDIENTS_DB_ID || process.env.NOTION_INGREDIENTS_DB_ID,
  recipes: process.env.NOTION_ALDI_RECIPES_DB_ID || process.env.NOTION_RECIPES_DB_ID
};

async function checkSupabaseIngredients() {
  console.log('\n📦 SUPABASE INGREDIENTS CHECK\n');
  console.log('════════════════════════════════════════════════════════════\n');

  const { data: ingredients } = await supabase
    .from('ingredients')
    .select('id, item, price_per_base_unit, base_unit, category')
    .order('item');

  if (!ingredients) {
    console.log('❌ Error fetching ingredients');
    return;
  }

  const total = ingredients.length;
  const missingPrices = ingredients.filter(i => 
    !i.price_per_base_unit || i.price_per_base_unit === 0
  );

  console.log(`📊 Total ingredients: ${total}`);
  console.log(`✅ With prices: ${total - missingPrices.length} (${Math.round((total - missingPrices.length)/total*100)}%)`);
  console.log(`❌ Missing prices: ${missingPrices.length} (${Math.round(missingPrices.length/total*100)}%)\n`);

  if (missingPrices.length > 0) {
    console.log('⚠️  Ingredients missing prices in Supabase:\n');
    missingPrices.forEach(ing => {
      console.log(`   • ${ing.item || '(no name)'} [${ing.category || 'no category'}]`);
    });
    console.log('');
  }

  return { total, missingPrices: missingPrices.length };
}

async function checkSupabaseRecipes() {
  console.log('\n🍳 SUPABASE RECIPES CHECK\n');
  console.log('════════════════════════════════════════════════════════════\n');

  // Get all recipes
  const { data: allRecipes } = await supabase
    .from('recipes')
    .select('id, name, servings, total_cost, cost_per_serving')
    .order('name');

  if (!allRecipes) {
    console.log('❌ Error fetching recipes');
    return;
  }

  const total = allRecipes.length;
  
  // Recipes missing costs
  const missingCosts = allRecipes.filter(r => 
    !r.total_cost || r.total_cost === 0 || !r.cost_per_serving || r.cost_per_serving === 0
  ).filter(r => r.name !== 'Leftovers'); // Exclude Leftovers

  // Check which recipes have ingredient links
  const { data: recipeIngredients } = await supabase
    .from('recipe_ingredients')
    .select('recipe_id')
    .limit(1000);

  const recipeIdsWithIngredients = new Set(recipeIngredients?.map(ri => ri.recipe_id) || []);
  
  const missingLinks = allRecipes.filter(r => 
    !recipeIdsWithIngredients.has(r.id) && r.name !== 'Leftovers'
  );

  // Recipes missing servings
  const missingServings = allRecipes.filter(r => 
    !r.servings || r.servings === 0
  ).filter(r => r.name !== 'Leftovers');

  console.log(`📊 Total recipes: ${total}`);
  console.log(`✅ With costs: ${total - missingCosts.length} (${Math.round((total - missingCosts.length)/total*100)}%)`);
  console.log(`❌ Missing costs: ${missingCosts.length}`);
  console.log(`✅ With ingredient links: ${total - missingLinks.length} (${Math.round((total - missingLinks.length)/total*100)}%)`);
  console.log(`❌ Missing ingredient links: ${missingLinks.length}`);
  console.log(`⚠️  Missing servings: ${missingServings.length}\n`);

  if (missingCosts.length > 0) {
    console.log('⚠️  Recipes missing costs in Supabase:\n');
    missingCosts.forEach(r => {
      console.log(`   • ${r.name}`);
      if (!r.servings) console.log(`     (also missing servings)`);
    });
    console.log('');
  }

  if (missingLinks.length > 0) {
    console.log('⚠️  Recipes missing ingredient links in Supabase:\n');
    missingLinks.forEach(r => {
      console.log(`   • ${r.name}`);
    });
    console.log('');
  }

  if (missingServings.length > 0) {
    console.log('⚠️  Recipes missing servings in Supabase:\n');
    missingServings.forEach(r => {
      console.log(`   • ${r.name}`);
    });
    console.log('');
  }

  return { total, missingCosts: missingCosts.length, missingLinks: missingLinks.length, missingServings: missingServings.length };
}

async function checkNotionRecipes() {
  console.log('\n📋 NOTION RECIPES CHECK\n');
  console.log('════════════════════════════════════════════════════════════\n');

  // Fetch all recipes from Notion
  let allResults = [];
  let hasMore = true;
  let nextCursor = undefined;
  
  while (hasMore) {
    const response = await notion.databases.query({
      database_id: DB_IDS.recipes,
      start_cursor: nextCursor,
      page_size: 100
    });
    
    allResults = allResults.concat(response.results);
    hasMore = response.has_more;
    nextCursor = response.next_cursor;
    
    if (hasMore) {
      await new Promise(resolve => setTimeout(resolve, 350));
    }
  }

  function getPropertyValue(page, propertyName) {
    const prop = page.properties[propertyName];
    if (!prop) return null;
    
    switch (prop.type) {
      case 'title':
        return prop.title?.[0]?.plain_text || '';
      case 'rich_text':
        return prop.rich_text?.map(rt => rt.plain_text).join('') || '';
      case 'number':
        return prop.number;
      case 'select':
        return prop.select?.name || null;
      default:
        return null;
    }
  }

  const recipes = allResults.map(page => ({
    name: getPropertyValue(page, 'Recipe Name'),
    servings: getPropertyValue(page, 'Servings'),
    ingredientText: getPropertyValue(page, 'Recipe Ingredients'),
    url: page.url
  })).filter(r => r.name && r.name !== 'Leftovers');

  const total = recipes.length;
  const missingServings = recipes.filter(r => !r.servings || r.servings === 0);
  const missingIngredientText = recipes.filter(r => 
    !r.ingredientText || 
    r.ingredientText.trim() === '' || 
    r.ingredientText.includes('No ingredients')
  );

  console.log(`📊 Total recipes: ${total}`);
  console.log(`✅ With servings: ${total - missingServings.length} (${Math.round((total - missingServings.length)/total*100)}%)`);
  console.log(`❌ Missing servings: ${missingServings.length}`);
  console.log(`✅ With ingredient text: ${total - missingIngredientText.length} (${Math.round((total - missingIngredientText.length)/total*100)}%)`);
  console.log(`❌ Missing ingredient text: ${missingIngredientText.length}\n`);

  if (missingServings.length > 0) {
    console.log('⚠️  Recipes missing servings in Notion:\n');
    missingServings.forEach(r => {
      console.log(`   • ${r.name}`);
      console.log(`     ${r.url}\n`);
    });
  }

  if (missingIngredientText.length > 0) {
    console.log('⚠️  Recipes missing ingredient text in Notion:\n');
    missingIngredientText.forEach(r => {
      console.log(`   • ${r.name}`);
      console.log(`     ${r.url}\n`);
    });
  }

  return { total, missingServings: missingServings.length, missingIngredientText: missingIngredientText.length };
}

async function main() {
  try {
    console.log('🔍 COMPREHENSIVE DATABASE CHECK\n');
    console.log('════════════════════════════════════════════════════════════');

    const ingredients = await checkSupabaseIngredients();
    const recipes = await checkSupabaseRecipes();
    const notion = await checkNotionRecipes();

    console.log('\n════════════════════════════════════════════════════════════');
    console.log('\n📊 SUMMARY\n');
    console.log('════════════════════════════════════════════════════════════\n');

    console.log('SUPABASE:');
    console.log(`   Ingredients: ${ingredients?.total || 0} total, ${ingredients?.missingPrices || 0} missing prices`);
    console.log(`   Recipes: ${recipes?.total || 0} total, ${recipes?.missingCosts || 0} missing costs, ${recipes?.missingLinks || 0} missing links`);

    console.log('\nNOTION:');
    console.log(`   Recipes: ${notion?.total || 0} total, ${notion?.missingServings || 0} missing servings, ${notion?.missingIngredientText || 0} missing ingredient text`);

    console.log('\n════════════════════════════════════════════════════════════');
    console.log('\n💡 PRIORITY ACTIONS:\n');

    if (recipes?.missingLinks > 0) {
      console.log(`   1. Link ingredients for ${recipes.missingLinks} recipes in Supabase`);
      console.log(`      Run: node scripts/fetch-all-remaining-recipes.js\n`);
    }

    if (recipes?.missingCosts > 0) {
      console.log(`   2. Recalculate costs for ${recipes.missingCosts} recipes`);
      console.log(`      Run: node scripts/recalculate-all-recipe-costs.js\n`);
    }

    if (notion?.missingServings > 0) {
      console.log(`   3. Add servings for ${notion.missingServings} recipes in Notion\n`);
    }

    if (notion?.missingIngredientText > 0) {
      console.log(`   4. Add ingredient text for ${notion.missingIngredientText} recipes in Notion\n`);
    }

    if (ingredients?.missingPrices > 0) {
      console.log(`   5. Add prices for ${ingredients.missingPrices} ingredients in Supabase\n`);
    }

    console.log('✅ Check complete!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
