import { Client } from '@notionhq/client';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const DB_IDS = {
  ingredients: process.env.NOTION_ALDI_INGREDIENTS_DB_ID || process.env.NOTION_INGREDIENTS_DB_ID,
  recipes: process.env.NOTION_ALDI_RECIPES_DB_ID || process.env.NOTION_RECIPES_DB_ID
};

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
    
    if (hasMore) {
      await new Promise(resolve => setTimeout(resolve, 350));
    }
  }
  
  return allResults;
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
    case 'multi_select':
      return prop.multi_select?.map(item => item.name) || [];
    case 'url':
      return prop.url || null;
    case 'relation':
      return prop.relation?.map(r => r.id) || [];
    default:
      return null;
  }
}

async function reviewIngredients() {
  console.log('\n📦 REVIEWING INGREDIENTS DATABASE\n');
  console.log('════════════════════════════════════════════════════════════\n');

  // Fetch from Notion
  console.log('📥 Fetching from Notion...');
  const notionPages = await fetchAllPages(DB_IDS.ingredients);
  console.log(`✅ Found ${notionPages.length} ingredients in Notion\n`);

  // Get from Supabase
  const { data: supabaseIngredients } = await supabase
    .from('ingredients')
    .select('*');

  console.log(`✅ Found ${supabaseIngredients.length} ingredients in Supabase\n`);

  // Analyze Notion ingredients
  const notionIngredients = notionPages.map(page => {
    const item = getPropertyValue(page, 'Item');
    const pricePerPackage = getPropertyValue(page, 'Price per Package ($)');
    const packageSize = getPropertyValue(page, 'Package Size');
    const packageUnit = getPropertyValue(page, 'Package Unit');
    const baseUnit = getPropertyValue(page, 'Base Unit');
    const pricePerBaseUnit = getPropertyValue(page, 'Price per Base Unit ($)');
    const category = getPropertyValue(page, 'Grocery Category');

    return {
      id: page.id,
      item,
      pricePerPackage,
      packageSize,
      packageUnit,
      baseUnit,
      pricePerBaseUnit,
      category,
      url: page.url
    };
  });

  // Statistics
  const withPackagePrice = notionIngredients.filter(i => i.pricePerPackage && i.pricePerPackage > 0).length;
  const withPPU = notionIngredients.filter(i => i.pricePerBaseUnit && i.pricePerBaseUnit > 0).length;
  const withPackageInfo = notionIngredients.filter(i => i.packageSize && i.packageUnit).length;
  const withCategory = notionIngredients.filter(i => i.category).length;

  console.log('📊 Notion Ingredients Statistics:\n');
  console.log(`   Total: ${notionIngredients.length}`);
  console.log(`   With package price: ${withPackagePrice} (${Math.round(withPackagePrice/notionIngredients.length*100)}%)`);
  console.log(`   With price per base unit: ${withPPU} (${Math.round(withPPU/notionIngredients.length*100)}%)`);
  console.log(`   With package size/unit: ${withPackageInfo} (${Math.round(withPackageInfo/notionIngredients.length*100)}%)`);
  console.log(`   With category: ${withCategory} (${Math.round(withCategory/notionIngredients.length*100)}%)\n`);

  // Find missing data
  const missingPrices = notionIngredients.filter(i => !i.pricePerPackage && !i.pricePerBaseUnit);
  const missingPackageInfo = notionIngredients.filter(i => !i.packageSize || !i.packageUnit);
  const missingBaseUnit = notionIngredients.filter(i => !i.baseUnit);

  if (missingPrices.length > 0 && missingPrices.length <= 10) {
    console.log('⚠️  Ingredients missing prices:\n');
    missingPrices.slice(0, 10).forEach(i => {
      console.log(`   • ${i.item || '(no name)'}`);
    });
    if (missingPrices.length > 10) {
      console.log(`   ... and ${missingPrices.length - 10} more\n`);
    } else {
      console.log('');
    }
  }

  return { notionIngredients, supabaseIngredients };
}

async function reviewRecipes() {
  console.log('\n🍳 REVIEWING RECIPES DATABASE\n');
  console.log('════════════════════════════════════════════════════════════\n');

  // Fetch from Notion
  console.log('📥 Fetching from Notion...');
  const notionPages = await fetchAllPages(DB_IDS.recipes);
  console.log(`✅ Found ${notionPages.length} recipes in Notion\n`);

  // Get from Supabase
  const { data: supabaseRecipes } = await supabase
    .from('recipes')
    .select('*');

  console.log(`✅ Found ${supabaseRecipes.length} recipes in Supabase\n`);

  // Analyze Notion recipes
  const notionRecipes = notionPages.map(page => {
    const recipeName = getPropertyValue(page, 'Recipe Name');
    const servings = getPropertyValue(page, 'Servings');
    const category = getPropertyValue(page, 'Category');
    const cost = getPropertyValue(page, 'Cost ($)') || getPropertyValue(page, 'Recipe Cost');
    const costPerServing = getPropertyValue(page, 'Cost per Serving ($)');
    const recipeIngredients = getPropertyValue(page, 'Recipe Ingredients');
    const instructions = getPropertyValue(page, 'Instructions');
    const sourceUrl = getPropertyValue(page, 'Source/Link');
    const linkedIngredients = getPropertyValue(page, 'Aldi Ingredients') || 
                             getPropertyValue(page, 'Database Ingredients ') || [];

    return {
      id: page.id,
      recipeName,
      servings,
      category,
      cost,
      costPerServing,
      recipeIngredients,
      instructions,
      sourceUrl,
      linkedIngredients: linkedIngredients.length,
      url: page.url
    };
  });

  // Statistics
  const withServings = notionRecipes.filter(r => r.servings && r.servings > 0).length;
  const withCost = notionRecipes.filter(r => r.cost && r.cost > 0).length;
  const withCostPerServing = notionRecipes.filter(r => r.costPerServing && r.costPerServing > 0).length;
  const withIngredientText = notionRecipes.filter(r => r.recipeIngredients && 
    r.recipeIngredients.trim() !== '' && 
    !r.recipeIngredients.includes('No ingredients')).length;
  const withLinkedIngredients = notionRecipes.filter(r => r.linkedIngredients > 0).length;
  const withInstructions = notionRecipes.filter(r => r.instructions && r.instructions.trim() !== '').length;
  const withSourceUrl = notionRecipes.filter(r => r.sourceUrl).length;
  const withCategory = notionRecipes.filter(r => r.category).length;

  console.log('📊 Notion Recipes Statistics:\n');
  console.log(`   Total: ${notionRecipes.length}`);
  console.log(`   With servings: ${withServings} (${Math.round(withServings/notionRecipes.length*100)}%)`);
  console.log(`   With cost: ${withCost} (${Math.round(withCost/notionRecipes.length*100)}%)`);
  console.log(`   With cost per serving: ${withCostPerServing} (${Math.round(withCostPerServing/notionRecipes.length*100)}%)`);
  console.log(`   With ingredient text: ${withIngredientText} (${Math.round(withIngredientText/notionRecipes.length*100)}%)`);
  console.log(`   With linked ingredients: ${withLinkedIngredients} (${Math.round(withLinkedIngredients/notionRecipes.length*100)}%)`);
  console.log(`   With instructions: ${withInstructions} (${Math.round(withInstructions/notionRecipes.length*100)}%)`);
  console.log(`   With source URL: ${withSourceUrl} (${Math.round(withSourceUrl/notionRecipes.length*100)}%)`);
  console.log(`   With category: ${withCategory} (${Math.round(withCategory/notionRecipes.length*100)}%)\n`);

  // Compare with Supabase
  const supabaseRecipesMap = {};
  supabaseRecipes.forEach(r => {
    supabaseRecipesMap[r.name.toLowerCase()] = r;
  });

  const inNotionNotSupabase = notionRecipes.filter(r => 
    !supabaseRecipesMap[r.recipeName?.toLowerCase()]
  );
  const inSupabaseNotNotion = supabaseRecipes.filter(r => 
    !notionRecipes.find(nr => nr.recipeName?.toLowerCase() === r.name.toLowerCase())
  );

  if (inNotionNotSupabase.length > 0) {
    console.log('📋 Recipes in Notion but not in Supabase:\n');
    inNotionNotSupabase.forEach(r => {
      console.log(`   • ${r.recipeName}`);
    });
    console.log('');
  }

  if (inSupabaseNotNotion.length > 0) {
    console.log('📋 Recipes in Supabase but not in Notion:\n');
    inSupabaseNotNotion.forEach(r => {
      console.log(`   • ${r.name}`);
    });
    console.log('');
  }

  // Find recipes missing key data
  const missingIngredientText = notionRecipes.filter(r => 
    !r.recipeIngredients || 
    r.recipeIngredients.trim() === '' || 
    r.recipeIngredients.includes('No ingredients')
  );

  if (missingIngredientText.length > 0 && missingIngredientText.length <= 10) {
    console.log('⚠️  Recipes missing ingredient text:\n');
    missingIngredientText.slice(0, 10).forEach(r => {
      console.log(`   • ${r.recipeName || '(no name)'}`);
      if (r.url) console.log(`     ${r.url}`);
    });
    if (missingIngredientText.length > 10) {
      console.log(`   ... and ${missingIngredientText.length - 10} more\n`);
    } else {
      console.log('');
    }
  }

  const missingServings = notionRecipes.filter(r => !r.servings || r.servings === 0);
  if (missingServings.length > 0 && missingServings.length <= 10) {
    console.log('⚠️  Recipes missing servings:\n');
    missingServings.slice(0, 10).forEach(r => {
      console.log(`   • ${r.recipeName || '(no name)'}`);
    });
    if (missingServings.length > 10) {
      console.log(`   ... and ${missingServings.length - 10} more\n`);
    } else {
      console.log('');
    }
  }

  return { notionRecipes, supabaseRecipes };
}

async function compareSupabaseStatus() {
  console.log('\n🔄 COMPARING WITH SUPABASE STATUS\n');
  console.log('════════════════════════════════════════════════════════════\n');

  // Check recipes with costs in Supabase
  const { data: recipesWithCosts } = await supabase
    .from('recipes')
    .select('id, name, servings, total_cost, cost_per_serving')
    .not('total_cost', 'is', null)
    .not('cost_per_serving', 'is', null)
    .gt('total_cost', 0)
    .gt('cost_per_serving', 0);

  const { data: recipesWithIngredients } = await supabase
    .from('recipe_ingredients')
    .select('recipe_id')
    .limit(1000);

  const uniqueRecipeIdsWithIngredients = new Set(recipesWithIngredients?.map(r => r.recipe_id) || []);
  
  const { data: allRecipes } = await supabase
    .from('recipes')
    .select('id, name');

  console.log('📊 Supabase Status:\n');
  console.log(`   Total recipes: ${allRecipes?.length || 0}`);
  console.log(`   Recipes with costs: ${recipesWithCosts?.length || 0}`);
  console.log(`   Recipes with ingredient links: ${uniqueRecipeIdsWithIngredients.size}\n`);

  // Find recipes without ingredient links
  const recipesWithoutLinks = allRecipes?.filter(r => 
    !uniqueRecipeIdsWithIngredients.has(r.id) && r.name !== 'Leftovers'
  ) || [];

  if (recipesWithoutLinks.length > 0) {
    console.log('⚠️  Recipes in Supabase without ingredient links:\n');
    recipesWithoutLinks.forEach(r => {
      console.log(`   • ${r.name}`);
    });
    console.log('');
  }
}

async function main() {
  try {
    console.log('🔍 COMPREHENSIVE NOTION DATABASE REVIEW\n');
    console.log('════════════════════════════════════════════════════════════');

    const ingredientsData = await reviewIngredients();
    const recipesData = await reviewRecipes();
    await compareSupabaseStatus();

    console.log('\n════════════════════════════════════════════════════════════');
    console.log('\n✅ Review Complete!\n');
    console.log('💡 Next Steps:');
    console.log('   1. Review any missing data above');
    console.log('   2. Update Notion databases as needed');
    console.log('   3. Run: node scripts/fetch-all-remaining-recipes.js');
    console.log('   4. Run: node scripts/recalculate-all-recipe-costs.js\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
