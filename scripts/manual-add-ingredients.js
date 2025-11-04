import { createClient } from '@supabase/supabase-js';
import { fetchRecipes } from './fetch-notion-databases.js';
import { parseIngredientLine, matchIngredient } from './calculate-recipe-costs.js';
import readline from 'readline';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const REMAINING = [
  'Chicken Stir Fry Noodles Recipe',
  'Spaghetti Night',
  'Taco Pasta Casserole'
  // Note: Leftovers intentionally skipped - doesn't need costs
];

function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function checkRecipes() {
  console.log('\n🔍 Checking Remaining Recipes\n');
  console.log('════════════════════════════════════════════════════════════\n');

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

  // Get Notion recipes
  const notionRecipes = await fetchRecipes();

  // Check each recipe
  for (const recipeName of REMAINING) {
    console.log(`\n📝 ${recipeName}`);
    console.log('─'.repeat(50));

    // Get recipe from Supabase
    const { data: recipe } = await supabase
      .from('recipes')
      .select('id, name, source_url')
      .eq('name', recipeName)
      .single();

    if (!recipe) {
      console.log('❌ Not found in Supabase');
      continue;
    }

    console.log(`✅ Found in Supabase (ID: ${recipe.id})`);

    // Check for variations in Notion name
    const notionRecipe = notionRecipes.find(r => {
      const notionName = r.recipeName?.toLowerCase() || '';
      const searchName = recipeName.toLowerCase();
      return notionName.includes(searchName) || 
             searchName.includes(notionName) ||
             notionName.replace(/recipe$/i, '').trim() === searchName.replace(/recipe$/i, '').trim() ||
             searchName.replace(/recipe$/i, '').trim() === notionName.replace(/recipe$/i, '').trim();
    });

    if (notionRecipe) {
      console.log(`✅ Found in Notion as: "${notionRecipe.recipeName}"`);
      
      if (notionRecipe.recipeIngredients && !notionRecipe.recipeIngredients.includes('No ingredients')) {
        console.log('✅ Has ingredient text! Processing...\n');
        
        // Process ingredients
        const lines = notionRecipe.recipeIngredients.split('\n')
          .map(l => l.trim())
          .filter(l => l.length > 0 && !l.startsWith('#') && !l.startsWith('###'));

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
              recipe_id: recipe.id,
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

        if (recipeIngredients.length > 0) {
          // Insert
          const { error } = await supabase
            .from('recipe_ingredients')
            .upsert(recipeIngredients, { 
              onConflict: 'recipe_id,ingredient_id,raw_line'
            });

          if (error) {
            console.log(`⚠️  Error: ${error.message}`);
          } else {
            console.log(`✅ Created ${recipeIngredients.length} ingredient links!`);
          }
        } else {
          console.log('⚠️  No ingredients matched');
        }
        continue;
      }
    }

    // No ingredient text found
    console.log('❌ No ingredient text found in Notion');
    
    if (recipe.source_url) {
      console.log(`📎 Source URL: ${recipe.source_url}`);
    }

    // Check if user wants to add manually
    console.log('\n💡 Options:');
    console.log('   1. Add ingredients manually (paste ingredient list)');
    console.log('   2. Skip for now');
    
    const choice = await prompt('\nChoice (1/2): ');
    
    if (choice === '1') {
      console.log('\n📋 Paste ingredient list (one per line, press Enter twice when done):');
      
      const lines = [];
      let line = '';
      
      while (true) {
        line = await prompt('> ');
        if (line.trim() === '' && lines.length > 0) {
          break;
        }
        if (line.trim() !== '') {
          lines.push(line.trim());
        }
      }

      // Process and match
      const recipeIngredients = [];
      for (const line of lines) {
        const parsed = parseIngredientLine(line);
        if (!parsed || !parsed.name) {
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
            recipe_id: recipe.id,
            ingredient_id: ingredient.id,
            quantity: parsed.quantity,
            unit: parsed.unit || null,
            ingredient_name: parsed.name,
            raw_line: line,
            calculated_cost: cost > 0 ? Math.round(cost * 100) / 100 : null,
            matched_with_fuzzy: match.score < 100
          });
          console.log(`   ✅ ${parsed.name} -> ${ingredient.item}`);
        } else {
          console.log(`   ❌ No match: ${line}`);
        }
      }

      if (recipeIngredients.length > 0) {
        const { error } = await supabase
          .from('recipe_ingredients')
          .upsert(recipeIngredients, { 
            onConflict: 'recipe_id,ingredient_id,raw_line'
          });

        if (error) {
          console.log(`❌ Error: ${error.message}`);
        } else {
          console.log(`\n✅ Created ${recipeIngredients.length} ingredient links!`);
        }
      }
    } else {
      console.log('⏭️  Skipped');
    }
  }

  console.log('\n════════════════════════════════════════════════════════════');
  console.log('\n💡 Next: Run `node scripts/recalculate-all-recipe-costs.js`\n');
}

checkRecipes();
