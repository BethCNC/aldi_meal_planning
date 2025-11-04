import { Client } from '@notionhq/client';
import { createClient } from '@supabase/supabase-js';
import { parseIngredientLine, matchIngredient } from './calculate-recipe-costs.js';
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
    default:
      return null;
  }
}

async function fetchAllNotionRecipes() {
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
  
  return allResults;
}

async function processAllRecipes() {
  console.log('\n📥 Fetching ALL Recipes from Notion\n');
  console.log('════════════════════════════════════════════════════════════\n');

  // Get all ingredients from Supabase
  const { data: ingredients } = await supabase.from('ingredients').select('*');
  const ingredientsFormatted = ingredients.map(ing => ({
    id: ing.id,
    item: ing.item,
    pricePerBaseUnit: ing.price_per_base_unit,
    baseUnit: ing.base_unit,
    pricePerPackage: ing.price_per_package,
    packageSize: ing.package_size,
    packageUnit: ing.package_unit
  }));

  console.log(`✅ Loaded ${ingredientsFormatted.length} ingredients from Supabase\n`);

  // Get all recipes from Supabase
  const { data: supabaseRecipes } = await supabase
    .from('recipes')
    .select('id, name');

  const recipeIdMap = {};
  supabaseRecipes.forEach(r => {
    recipeIdMap[r.name.toLowerCase()] = r.id;
  });

  // Fetch all Notion recipes
  console.log('📥 Fetching all recipes from Notion...');
  const notionPages = await fetchAllNotionRecipes();
  console.log(`✅ Found ${notionPages.length} recipes in Notion\n`);

  // Process each Notion recipe
  let processed = 0;
  let linked = 0;
  let skipped = 0;

  for (const notionPage of notionPages) {
    const notionRecipeName = getPropertyValue(notionPage, 'Recipe Name');
    
    if (!notionRecipeName || notionRecipeName === 'Leftovers') {
      continue;
    }

    // Find in Supabase
    const supabaseRecipeId = recipeIdMap[notionRecipeName.toLowerCase()];
    
    if (!supabaseRecipeId) {
      skipped++;
      continue;
    }

    // Get ingredient text
    const recipeIngredientsText = getPropertyValue(notionPage, 'Recipe Ingredients');
    
    if (!recipeIngredientsText || recipeIngredientsText.trim() === '' || recipeIngredientsText.includes('No ingredients')) {
      continue;
    }

    processed++;
    console.log(`\n📝 ${notionRecipeName}`);
    console.log('─'.repeat(50));

    // Check if already has links
    const { data: existingLinks } = await supabase
      .from('recipe_ingredients')
      .select('id')
      .eq('recipe_id', supabaseRecipeId)
      .limit(1);

    if (existingLinks && existingLinks.length > 0) {
      console.log('✅ Already has ingredient links, skipping');
      continue;
    }

    // Parse ingredient lines
    const lines = recipeIngredientsText.split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0 && !l.startsWith('#') && !l.startsWith('###'));

    console.log(`📋 Processing ${lines.length} ingredient lines...\n`);

    const recipeIngredients = [];
    let matched = 0;

    for (const line of lines) {
      const parsed = parseIngredientLine(line);
      if (!parsed || !parsed.name) continue;

      const match = matchIngredient(parsed, ingredientsFormatted);

      if (match.matched) {
        const ingredient = match.ingredient;
        let cost = 0;
        if (ingredient.pricePerBaseUnit && parsed.quantity) {
          cost = parsed.quantity * ingredient.pricePerBaseUnit;
        }

        recipeIngredients.push({
          recipe_id: supabaseRecipeId,
          ingredient_id: ingredient.id,
          quantity: parsed.quantity,
          unit: parsed.unit || null,
          ingredient_name: parsed.name,
          raw_line: line,
          calculated_cost: cost > 0 ? Math.round(cost * 100) / 100 : null,
          matched_with_fuzzy: match.score < 100
        });
        matched++;
      }
    }

    console.log(`   Matched: ${matched}/${lines.length} ingredients`);

    if (recipeIngredients.length > 0) {
      // Insert
      const { error } = await supabase
        .from('recipe_ingredients')
        .insert(recipeIngredients);

      if (error) {
        console.log(`   ❌ Error: ${error.message}`);
      } else {
        console.log(`   ✅ Created ${recipeIngredients.length} ingredient links!`);
        linked++;
      }
    } else {
      console.log('   ⚠️  No ingredients matched');
    }
  }

  console.log('\n════════════════════════════════════════════════════════════\n');
  console.log('📊 Summary:\n');
  console.log(`   Processed: ${processed} recipes with ingredient text`);
  console.log(`   ✅ Linked: ${linked} recipes`);
  console.log(`   ⏭️  Skipped (already linked): ${processed - linked}`);
  console.log('\n💡 Next: Run `node scripts/recalculate-all-recipe-costs.js` to update costs\n');
}

processAllRecipes();
