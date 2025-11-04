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

const REMAINING_RECIPES = [
  'Chicken Stir Fry Noodles Recipe',
  'Spaghetti Night',
  'Taco Pasta Casserole'
];

function getPropertyValue(page, propertyName) {
  const prop = page.properties[propertyName];
  if (!prop) return null;
  
  switch (prop.type) {
    case 'title':
      return prop.title?.[0]?.plain_text || '';
    case 'rich_text':
      // Rich text can have multiple blocks
      return prop.rich_text?.map(rt => rt.plain_text).join('') || '';
    case 'number':
      return prop.number;
    case 'select':
      return prop.select?.name || null;
    case 'multi_select':
      return prop.multi_select?.map(item => item.name) || [];
    case 'url':
      return prop.url || null;
    default:
      return null;
  }
}

async function fetchRecipeFromNotion(recipeName) {
  console.log(`\n🔍 Searching Notion for: "${recipeName}"`);
  
  // Search for the recipe in Notion
  const response = await notion.databases.query({
    database_id: DB_IDS.recipes,
    filter: {
      property: 'Recipe Name',
      title: {
        contains: recipeName
      }
    }
  });

  // If exact match not found, try partial match
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

async function processRecipes() {
  console.log('\n📥 Fetching Ingredients from Notion Database\n');
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

  // Process each recipe
  for (const recipeName of REMAINING_RECIPES) {
    console.log(`\n📝 ${recipeName}`);
    console.log('─'.repeat(50));

    // Get recipe from Supabase to get ID
    const { data: supabaseRecipe } = await supabase
      .from('recipes')
      .select('id')
      .eq('name', recipeName)
      .single();

    if (!supabaseRecipe) {
      console.log('❌ Not found in Supabase');
      continue;
    }

    const supabaseRecipeId = supabaseRecipe.id;

    // Fetch from Notion
    const notionPage = await fetchRecipeFromNotion(recipeName);

    if (!notionPage) {
      console.log('❌ Not found in Notion database');
      continue;
    }

    const notionRecipeName = getPropertyValue(notionPage, 'Recipe Name');
    console.log(`✅ Found in Notion as: "${notionRecipeName}"`);

    // Get Recipe Ingredients field
    const recipeIngredientsText = getPropertyValue(notionPage, 'Recipe Ingredients');
    
    if (!recipeIngredientsText || recipeIngredientsText.trim() === '' || recipeIngredientsText.includes('No ingredients')) {
      console.log('❌ No ingredient text in "Recipe Ingredients" field');
      console.log(`   Notion URL: ${notionPage.url}`);
      console.log('\n💡 Please add ingredient list to this recipe in Notion:');
      console.log(`   ${notionPage.url}\n`);
      continue;
    }

    console.log('✅ Found ingredient text!');
    console.log(`\nIngredient text (first 300 chars):\n${recipeIngredientsText.substring(0, 300)}...\n`);

    // Parse ingredient lines
    const lines = recipeIngredientsText.split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0 && !l.startsWith('#') && !l.startsWith('###'));

    console.log(`📋 Processing ${lines.length} ingredient lines...\n`);

    const recipeIngredients = [];
    let matched = 0;
    let unmatched = 0;

    for (const line of lines) {
      const parsed = parseIngredientLine(line);
      if (!parsed || !parsed.name) {
        unmatched++;
        console.log(`   ⚠️  Could not parse: ${line}`);
        continue;
      }

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
        console.log(`   ✅ ${parsed.name} (${parsed.quantity} ${parsed.unit || ''}) -> ${ingredient.item}`);
      } else {
        unmatched++;
        console.log(`   ❌ No match: ${line}`);
      }
    }

    console.log(`\n📊 Matched: ${matched}, Unmatched: ${unmatched}`);

    if (recipeIngredients.length === 0) {
      console.log('⚠️  No ingredients to link');
      continue;
    }

    // Delete existing links for this recipe first
    console.log('\n🗑️  Cleaning up existing links...');
    await supabase
      .from('recipe_ingredients')
      .delete()
      .eq('recipe_id', supabaseRecipeId);

    // Insert new links
    console.log('💾 Inserting ingredient links...');
    const { error: insertError } = await supabase
      .from('recipe_ingredients')
      .insert(recipeIngredients);

    if (insertError) {
      console.log(`❌ Error: ${insertError.message}`);
      
      // Try one at a time
      console.log('🔄 Trying to insert one at a time...');
      let success = 0;
      for (const ri of recipeIngredients) {
        const { error } = await supabase
          .from('recipe_ingredients')
          .insert(ri);
        
        if (!error) success++;
      }
      console.log(`✅ Inserted ${success}/${recipeIngredients.length} ingredients`);
    } else {
      console.log(`✅ Successfully created ${recipeIngredients.length} ingredient links!`);
    }
  }

  console.log('\n════════════════════════════════════════════════════════════');
  console.log('\n💡 Next: Run `node scripts/recalculate-all-recipe-costs.js` to update costs\n');
}

processRecipes();
