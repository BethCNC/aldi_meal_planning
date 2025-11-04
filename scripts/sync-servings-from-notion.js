import { Client } from '@notionhq/client';
import { createClient } from '@supabase/supabase-js';
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
    case 'number':
      return prop.number;
    default:
      return null;
  }
}

async function syncServings() {
  console.log('\n🔄 Syncing Servings from Notion to Supabase\n');
  console.log('════════════════════════════════════════════════════════════\n');

  // Get recipes missing servings in Supabase
  const { data: recipesMissingServings } = await supabase
    .from('recipes')
    .select('id, name, servings')
    .or('servings.is.null,servings.eq.0')
    .neq('name', 'Leftovers');

  if (!recipesMissingServings || recipesMissingServings.length === 0) {
    console.log('✅ All recipes have servings in Supabase!\n');
    return;
  }

  console.log(`📋 Found ${recipesMissingServings.length} recipes missing servings:\n`);
  recipesMissingServings.forEach(r => {
    console.log(`   • ${r.name}`);
  });
  console.log('');

  // Fetch all recipes from Notion
  console.log('📥 Fetching servings from Notion...\n');
  
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

  // Create a map of Notion recipes
  const notionRecipes = {};
  allResults.forEach(page => {
    const name = getPropertyValue(page, 'Recipe Name');
    const servings = getPropertyValue(page, 'Servings');
    if (name) {
      notionRecipes[name.toLowerCase()] = { name, servings };
    }
  });

  // Update Supabase recipes
  let updated = 0;
  let notFound = 0;

  for (const recipe of recipesMissingServings) {
    const notionRecipe = notionRecipes[recipe.name.toLowerCase()];
    
    if (!notionRecipe || !notionRecipe.servings) {
      console.log(`⚠️  ${recipe.name}: No servings found in Notion`);
      notFound++;
      continue;
    }

    const { error } = await supabase
      .from('recipes')
      .update({ 
        servings: notionRecipe.servings,
        updated_at: new Date().toISOString()
      })
      .eq('id', recipe.id);

    if (error) {
      console.log(`❌ Error updating ${recipe.name}: ${error.message}`);
    } else {
      console.log(`✅ Updated ${recipe.name}: ${notionRecipe.servings} servings`);
      updated++;
    }
  }

  console.log('\n════════════════════════════════════════════════════════════\n');
  console.log('📊 Summary:\n');
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ⚠️  Not found: ${notFound}\n`);

  if (updated > 0) {
    console.log('💡 Next: Run `node scripts/recalculate-all-recipe-costs.js` to update costs\n');
  }
}

syncServings();
