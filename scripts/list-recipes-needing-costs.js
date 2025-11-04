import { createClient } from '@supabase/supabase-js';
import { Client } from '@notionhq/client';
import dotenv from 'dotenv';

dotenv.config();

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const DB_IDS = {
  recipes: process.env.NOTION_ALDI_RECIPES_DB_ID || process.env.NOTION_RECIPES_DB_ID
};

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
    case 'url':
      return prop.url || null;
    default:
      return null;
  }
}

async function fetchRecipeFromNotion(recipeName) {
  const response = await notion.databases.query({
    database_id: DB_IDS.recipes,
    filter: {
      property: 'Recipe Name',
      title: {
        contains: recipeName
      }
    }
  });

  if (response.results.length === 0) {
    // Try without "Recipe" suffix
    const searchName = recipeName.replace(/Recipe$/i, '').trim();
    const response2 = await notion.databases.query({
      database_id: DB_IDS.recipes,
      filter: {
        property: 'Recipe Name',
        title: {
          contains: searchName
        }
      }
    });
    
    if (response2.results.length > 0) {
      return response2.results[0];
    }
  }

  return response.results[0] || null;
}

async function listRecipesNeedingCosts() {
  console.log('\n📋 Recipes Needing Costs\n');
  console.log('════════════════════════════════════════════════════════════\n');

  // Get all recipes and check which ones need costs
  const { data: allRecipes, error } = await supabase
    .from('recipes')
    .select('id, name, servings, total_cost, cost_per_serving, source_url')
    .order('name');
  
  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  // Filter to recipes missing costs
  const recipes = allRecipes.filter(r => 
    !r.total_cost || r.total_cost === 0 || !r.cost_per_serving || r.cost_per_serving === 0
  );

  console.log(`Found ${recipes.length} recipes missing costs:\n`);

  // Check each recipe
  const results = [];

  for (const recipe of recipes) {
    // Skip "Leftovers" - doesn't need costs
    if (recipe.name === 'Leftovers') {
      continue;
    }

    // Check if recipe has ingredient links in Supabase
    const { data: ingredients } = await supabase
      .from('recipe_ingredients')
      .select('id')
      .eq('recipe_id', recipe.id);

    const hasLinks = ingredients && ingredients.length > 0;

    // Check Notion
    const notionPage = await fetchRecipeFromNotion(recipe.name);
    
    let notionStatus = 'not_found';
    let hasIngredientText = false;
    let notionUrl = null;
    let ingredientPreview = null;

    if (notionPage) {
      notionStatus = 'found';
      notionUrl = notionPage.url;
      const ingredientText = getPropertyValue(notionPage, 'Recipe Ingredients');
      
      if (ingredientText && ingredientText.trim() !== '' && !ingredientText.includes('No ingredients')) {
        hasIngredientText = true;
        ingredientPreview = ingredientText.substring(0, 150);
      }
    }

    results.push({
      name: recipe.name,
      servings: recipe.servings,
      hasIngredientLinks: hasLinks,
      notionStatus,
      hasIngredientText,
      notionUrl,
      ingredientPreview,
      sourceUrl: recipe.source_url
    });
  }

  // Group by status
  const withNotionText = results.filter(r => r.hasIngredientText);
  const withNotionNoText = results.filter(r => r.notionStatus === 'found' && !r.hasIngredientText);
  const notInNotion = results.filter(r => r.notionStatus === 'not_found');

  // Print results
  if (withNotionText.length > 0) {
    console.log('✅ Recipes with ingredient text in Notion (ready to link):\n');
    withNotionText.forEach(r => {
      console.log(`   📝 ${r.name}`);
      console.log(`      Notion: ${r.notionUrl}`);
      console.log(`      Preview: ${r.ingredientPreview}...`);
      console.log(`      Action: Run fetch script to link ingredients\n`);
    });
  }

  if (withNotionNoText.length > 0) {
    console.log('\n⚠️  Recipes in Notion but missing ingredient text:\n');
    withNotionNoText.forEach(r => {
      console.log(`   📝 ${r.name}`);
      console.log(`      Notion: ${r.notionUrl}`);
      if (r.sourceUrl) {
        console.log(`      Source URL: ${r.sourceUrl}`);
      }
      console.log(`      Action: Add ingredient list to "Recipe Ingredients" field in Notion\n`);
    });
  }

  if (notInNotion.length > 0) {
    console.log('\n❌ Recipes not found in Notion:\n');
    notInNotion.forEach(r => {
      console.log(`   📝 ${r.name}`);
      if (r.sourceUrl) {
        console.log(`      Source URL: ${r.sourceUrl}`);
      }
      console.log(`      Action: Create recipe in Notion or manually add ingredient links\n`);
    });
  }

  // Summary
  console.log('\n════════════════════════════════════════════════════════════\n');
  console.log('📊 Summary:\n');
  console.log(`   Total needing costs: ${results.length}`);
  console.log(`   ✅ Ready to link (has Notion text): ${withNotionText.length}`);
  console.log(`   ⚠️  Need ingredient text in Notion: ${withNotionNoText.length}`);
  console.log(`   ❌ Not in Notion: ${notInNotion.length}\n`);

  if (withNotionText.length > 0) {
    console.log('💡 Quick fix: Run this to link ingredients for ready recipes:');
    console.log('   node scripts/fetch-ingredients-from-notion.js\n');
  }
}

listRecipesNeedingCosts();
