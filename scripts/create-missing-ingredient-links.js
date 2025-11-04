import { createClient } from '@supabase/supabase-js';
import { fetchRecipes } from './fetch-notion-databases.js';
import { parseIngredientLine, matchIngredient } from './calculate-recipe-costs.js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Recipes that need ingredient links
const MISSING_RECIPES = [
  'Chicken & Broccoli (Brown Sauce)',
  'Chicken Stir Fry Noodles Recipe',
  'Crab Ravioli with Lemon-Garlic No-Cream Sauce',
  'Easy 30 Minute Sausage and Pepper Pasta',
  'Honey-Garlic Chicken',
  'Leftovers',
  'Orange Chicken',
  'Sheet-Pan Chicken Fajitas',
  'Smash Burger Bowls',
  'Spaghetti Night',
  'Taco Pasta Casserole'
];

async function createMissingLinks() {
  console.log('\n🔗 Creating Missing Ingredient Links\n');
  console.log('════════════════════════════════════════════════════════════\n');

  try {
    // Get all ingredients from Supabase
    console.log('📦 Fetching ingredients from Supabase...');
    const { data: ingredients, error: ingError } = await supabase
      .from('ingredients')
      .select('*');

    if (ingError) throw ingError;

    console.log(`✅ Found ${ingredients.length} ingredients\n`);

    // Convert to format expected by matchIngredient
    const ingredientsFormatted = ingredients.map(ing => ({
      id: ing.id,
      item: ing.item,
      pricePerBaseUnit: ing.price_per_base_unit,
      baseUnit: ing.base_unit,
      pricePerPackage: ing.price_per_package,
      packageSize: ing.package_size,
      packageUnit: ing.package_unit
    }));

    // Fetch recipes from Notion
    console.log('📥 Fetching recipes from Notion...');
    const notionRecipes = await fetchRecipes();
    console.log(`✅ Fetched ${notionRecipes.length} recipes from Notion\n`);

    // Get recipe IDs from Supabase for the missing recipes
    console.log('🔍 Finding missing recipes in Supabase...');
    const { data: supabaseRecipes, error: recipeError } = await supabase
      .from('recipes')
      .select('id, name')
      .in('name', MISSING_RECIPES);

    if (recipeError) throw recipeError;

    console.log(`✅ Found ${supabaseRecipes.length} recipes in Supabase\n`);

    // Create a map of recipe names to IDs
    const recipeIdMap = {};
    supabaseRecipes.forEach(r => {
      recipeIdMap[r.name] = r.id;
    });

    // Process each missing recipe
    let totalLinksCreated = 0;
    const results = [];

    for (const recipeName of MISSING_RECIPES) {
      const supabaseRecipeId = recipeIdMap[recipeName];
      
      if (!supabaseRecipeId) {
        console.log(`⚠️  ${recipeName}: Not found in Supabase`);
        results.push({ name: recipeName, status: 'not_found' });
        continue;
      }

      // Find in Notion data
      const notionRecipe = notionRecipes.find(r => 
        r.recipeName === recipeName || 
        r.recipeName?.includes(recipeName) ||
        recipeName.includes(r.recipeName)
      );

      if (!notionRecipe) {
        console.log(`⚠️  ${recipeName}: Not found in Notion data`);
        results.push({ name: recipeName, status: 'not_in_notion' });
        continue;
      }

      if (!notionRecipe.recipeIngredients || notionRecipe.recipeIngredients.includes('No ingredients')) {
        console.log(`⚠️  ${recipeName}: No ingredient text in Notion`);
        results.push({ name: recipeName, status: 'no_ingredients' });
        continue;
      }

      console.log(`\n📝 Processing: ${recipeName}`);

      // Parse ingredient lines
      const lines = notionRecipe.recipeIngredients.split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0 && !l.startsWith('#') && !l.startsWith('###'));

      console.log(`   Found ${lines.length} ingredient lines`);

      // Parse and match ingredients
      const recipeIngredients = [];
      let matched = 0;
      let unmatched = 0;

      for (const line of lines) {
        const parsed = parseIngredientLine(line);
        if (!parsed || !parsed.name) {
          unmatched++;
          continue;
        }

        const match = matchIngredient(parsed, ingredientsFormatted);

        if (match.matched) {
          const ingredient = match.ingredient;

          // Simple cost calculation (unit conversion would be better)
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
        } else {
          unmatched++;
          console.log(`   ⚠️  No match: ${line}`);
        }
      }

      console.log(`   ✅ Matched: ${matched}, ❌ Unmatched: ${unmatched}`);

      if (recipeIngredients.length === 0) {
        console.log(`   ⚠️  No ingredients matched for ${recipeName}`);
        results.push({ name: recipeName, status: 'no_matches', matched, unmatched });
        continue;
      }

      // Insert into Supabase
      const { error: insertError } = await supabase
        .from('recipe_ingredients')
        .upsert(recipeIngredients, { 
          onConflict: 'recipe_id,ingredient_id,raw_line',
          ignoreDuplicates: false
        });

      if (insertError) {
        console.log(`   ❌ Error inserting: ${insertError.message}`);
        results.push({ name: recipeName, status: 'error', error: insertError.message });
        continue;
      }

      console.log(`   ✅ Created ${recipeIngredients.length} ingredient links`);
      totalLinksCreated += recipeIngredients.length;
      results.push({ name: recipeName, status: 'success', links: recipeIngredients.length, matched, unmatched });
    }

    // Summary
    console.log('\n════════════════════════════════════════════════════════════');
    console.log('\n📊 Summary:\n');
    
    const successful = results.filter(r => r.status === 'success');
    const failed = results.filter(r => r.status !== 'success');

    console.log(`✅ Successfully linked: ${successful.length} recipes`);
    console.log(`⚠️  Failed/Skipped: ${failed.length} recipes`);
    console.log(`📎 Total links created: ${totalLinksCreated}\n`);

    if (successful.length > 0) {
      console.log('✅ Recipes successfully linked:');
      successful.forEach(r => {
        console.log(`   • ${r.name} (${r.links} ingredients, ${r.matched} matched, ${r.unmatched} unmatched)`);
      });
      console.log('');
    }

    if (failed.length > 0) {
      console.log('⚠️  Recipes that need attention:');
      failed.forEach(r => {
        console.log(`   • ${r.name}: ${r.status}`);
      });
      console.log('');
    }

    console.log('💡 Next step: Run this SQL to recalculate recipe costs:');
    console.log('   node scripts/recalculate-all-recipe-costs.js\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

createMissingLinks();
