import { createClient } from '@supabase/supabase-js';
import { fetchRecipes } from './fetch-notion-databases.js';
import { parseIngredientLine, matchIngredient } from './calculate-recipe-costs.js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixSmashBurgerBowls() {
  console.log('\n🔧 Fixing Smash Burger Bowls\n');
  console.log('════════════════════════════════════════════════════════════\n');

  // Get recipe ID
  const { data: recipe } = await supabase
    .from('recipes')
    .select('id')
    .eq('name', 'Smash Burger Bowls')
    .single();

  if (!recipe) {
    console.log('❌ Recipe not found');
    return;
  }

  const recipeId = recipe.id;
  console.log(`✅ Found recipe ID: ${recipeId}\n`);

  // Delete ALL existing links for this recipe first
  console.log('🗑️  Deleting existing ingredient links...');
  const { error: deleteError } = await supabase
    .from('recipe_ingredients')
    .delete()
    .eq('recipe_id', recipeId);

  if (deleteError) {
    console.log(`❌ Error deleting: ${deleteError.message}`);
    return;
  }

  console.log('✅ Deleted existing links\n');

  // Get ingredients
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

  // Get recipe from Notion
  const notionRecipes = await fetchRecipes();
  const notionRecipe = notionRecipes.find(r => 
    r.recipeName === 'Smash Burger Bowls' || 
    r.recipeName?.includes('Smash Burger')
  );

  if (!notionRecipe || !notionRecipe.recipeIngredients) {
    console.log('❌ No ingredient text found in Notion');
    return;
  }

  console.log('✅ Found ingredient text in Notion\n');
  console.log('Processing ingredients...\n');

  // Parse ingredients
  const lines = notionRecipe.recipeIngredients.split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.startsWith('#') && !l.startsWith('###'));

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
        recipe_id: recipeId,
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

  console.log(`\n📊 Matched: ${matched}, Unmatched: ${unmatched}\n`);

  if (recipeIngredients.length === 0) {
    console.log('❌ No ingredients to insert');
    return;
  }

  // Insert using upsert to handle any edge cases
  console.log('💾 Inserting ingredient links...');
  const { error: insertError } = await supabase
    .from('recipe_ingredients')
    .upsert(recipeIngredients, { 
      onConflict: 'recipe_id,ingredient_id,raw_line',
      ignoreDuplicates: false
    });

  if (insertError) {
    console.log(`❌ Error: ${insertError.message}`);
    
    // Try inserting one at a time
    console.log('\n🔄 Trying to insert one at a time...');
    let success = 0;
    for (const ri of recipeIngredients) {
      const { error } = await supabase
        .from('recipe_ingredients')
        .insert(ri)
        .select();
      
      if (error) {
        console.log(`   ⚠️  Failed: ${ri.ingredient_name} - ${error.message}`);
      } else {
        success++;
      }
    }
    console.log(`\n✅ Successfully inserted ${success}/${recipeIngredients.length} ingredients`);
  } else {
    console.log(`✅ Successfully created ${recipeIngredients.length} ingredient links!`);
  }

  console.log('\n💡 Next: Run `node scripts/recalculate-all-recipe-costs.js`\n');
}

fixSmashBurgerBowls();
