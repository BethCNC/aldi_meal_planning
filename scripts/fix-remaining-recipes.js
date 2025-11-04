import { createClient } from '@supabase/supabase-js';
import { fetchRecipes } from './fetch-notion-databases.js';
import { parseIngredientLine, matchIngredient } from './calculate-recipe-costs.js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const REMAINING_RECIPES = [
  'Chicken Stir Fry Noodles Recipe',
  'Leftovers',
  'Smash Burger Bowls',
  'Spaghetti Night',
  'Taco Pasta Casserole'
];

async function checkRemainingRecipes() {
  console.log('\n🔍 Checking Remaining 5 Recipes\n');
  console.log('════════════════════════════════════════════════════════════\n');

  // Load Notion data
  let notionRecipes = [];
  try {
    const data = JSON.parse(fs.readFileSync('./data/notion-recipes.json', 'utf8'));
    notionRecipes = data;
  } catch (error) {
    console.log('⚠️  Could not load Notion data, fetching fresh...');
    notionRecipes = await fetchRecipes();
  }

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

  // Get recipe IDs
  const { data: supabaseRecipes } = await supabase
    .from('recipes')
    .select('id, name')
    .in('name', REMAINING_RECIPES);

  const recipeIdMap = {};
  supabaseRecipes.forEach(r => {
    recipeIdMap[r.name] = r.id;
  });

  // Check each recipe
  for (const recipeName of REMAINING_RECIPES) {
    console.log(`\n📝 ${recipeName}`);
    console.log('─'.repeat(50));

    const supabaseRecipeId = recipeIdMap[recipeName];
    if (!supabaseRecipeId) {
      console.log('❌ Not found in Supabase');
      continue;
    }

    // Find in Notion
    const notionRecipe = notionRecipes.find(r => 
      r.recipeName === recipeName || 
      r.recipeName?.includes(recipeName) ||
      recipeName.includes(r.recipeName) ||
      (r.recipeName && recipeName.toLowerCase().includes(r.recipeName.toLowerCase())) ||
      (r.recipeName && r.recipeName.toLowerCase().includes(recipeName.toLowerCase()))
    );

    if (notionRecipe) {
      console.log(`✅ Found in Notion as: "${notionRecipe.recipeName}"`);
      
      if (notionRecipe.recipeIngredients && !notionRecipe.recipeIngredients.includes('No ingredients')) {
        console.log('✅ Has ingredient text!');
        console.log(`\nIngredient text preview:\n${notionRecipe.recipeIngredients.substring(0, 500)}...`);
        
        // Try to process it
        const lines = notionRecipe.recipeIngredients.split('\n')
          .map(l => l.trim())
          .filter(l => l.length > 0 && !l.startsWith('#') && !l.startsWith('###'));

        console.log(`\nParsing ${lines.length} lines...`);
        
        const recipeIngredients = [];
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
          }
        }

        if (recipeIngredients.length > 0) {
          console.log(`✅ Matched ${recipeIngredients.length} ingredients`);
          
          // For Smash Burger Bowls, delete existing duplicates first
          if (recipeName === 'Smash Burger Bowls') {
            console.log('🔧 Fixing duplicate conflicts for Smash Burger Bowls...');
            
            // Get existing links
            const { data: existing } = await supabase
              .from('recipe_ingredients')
              .select('id, raw_line')
              .eq('recipe_id', supabaseRecipeId);

            if (existing && existing.length > 0) {
              // Delete duplicates
              const { error: deleteError } = await supabase
                .from('recipe_ingredients')
                .delete()
                .eq('recipe_id', supabaseRecipeId);

              if (deleteError) {
                console.log(`⚠️  Error deleting: ${deleteError.message}`);
              } else {
                console.log(`✅ Deleted ${existing.length} existing links`);
              }
            }
          }

          // Insert new links
          const { error: insertError } = await supabase
            .from('recipe_ingredients')
            .insert(recipeIngredients);

          if (insertError) {
            console.log(`❌ Error: ${insertError.message}`);
          } else {
            console.log(`✅ Created ${recipeIngredients.length} ingredient links!`);
          }
        } else {
          console.log('⚠️  No ingredients matched');
        }
      } else {
        console.log('❌ No ingredient text in Notion');
        
        // Check for source URL
        if (notionRecipe.sourceUrl) {
          console.log(`📎 Source URL: ${notionRecipe.sourceUrl}`);
        }
      }
    } else {
      console.log('❌ Not found in Notion data');
      
      // Check Supabase for source URL
      const { data: recipe } = await supabase
        .from('recipes')
        .select('source_url')
        .eq('id', supabaseRecipeId)
        .single();

      if (recipe?.source_url) {
        console.log(`📎 Source URL: ${recipe.source_url}`);
      }
    }
  }

  console.log('\n════════════════════════════════════════════════════════════');
  console.log('\n💡 Next: Run `node scripts/recalculate-all-recipe-costs.js` to update costs\n');
}

checkRemainingRecipes();
