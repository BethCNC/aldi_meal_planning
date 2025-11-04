import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEmptyRows() {
  console.log('\n🔍 Checking for Empty/Null Data\n');
  console.log('════════════════════════════════════════════════════════════\n');

  const issues = {
    recipes: [],
    ingredients: [],
    recipeIngredients: []
  };

  try {
    // Check Recipes
    console.log('📋 Checking Recipes...\n');
    const { data: recipes, error: recipesError } = await supabase
      .from('recipes')
      .select('*');

    if (recipesError) throw recipesError;

    recipes.forEach((recipe) => {
      const problems = [];
      
      if (!recipe.name || recipe.name.trim() === '') {
        problems.push('missing name');
      }
      if (!recipe.servings || recipe.servings === 0) {
        problems.push(`servings: ${recipe.servings || 'null'}`);
      }
      if (recipe.total_cost === null || recipe.total_cost === undefined) {
        problems.push('missing total_cost');
      }
      if (recipe.cost_per_serving === null || recipe.cost_per_serving === undefined) {
        problems.push('missing cost_per_serving');
      }
      
      if (problems.length > 0) {
        issues.recipes.push({ id: recipe.id, name: recipe.name, problems });
        console.log(`   ⚠️  ${recipe.name || '(no name)'}`);
        console.log(`      Issues: ${problems.join(', ')}\n`);
      }
    });

    // Check Ingredients
    console.log('🥕 Checking Ingredients...\n');
    const { data: ingredients, error: ingredientsError } = await supabase
      .from('ingredients')
      .select('*');

    if (ingredientsError) throw ingredientsError;

    ingredients.forEach((ingredient) => {
      const problems = [];
      
      if (!ingredient.item || ingredient.item.trim() === '') {
        problems.push('missing item name');
      }
      if (!ingredient.price_per_base_unit || ingredient.price_per_base_unit === 0) {
        problems.push(`price_per_base_unit: ${ingredient.price_per_base_unit || 'null'}`);
      }
      if (!ingredient.base_unit || ingredient.base_unit.trim() === '') {
        problems.push('missing base_unit');
      }
      
      if (problems.length > 0) {
        issues.ingredients.push({ id: ingredient.id, item: ingredient.item, problems });
        if (issues.ingredients.length <= 10) { // Only show first 10
          console.log(`   ⚠️  ${ingredient.item || '(no name)'}`);
          console.log(`      Issues: ${problems.join(', ')}\n`);
        }
      }
    });

    if (issues.ingredients.length > 10) {
      console.log(`   ... and ${issues.ingredients.length - 10} more ingredients with issues\n`);
    }

    // Check Recipe Ingredients
    console.log('🔗 Checking Recipe-Ingredient Links...\n');
    const { data: recipeIngredients, error: riError } = await supabase
      .from('recipe_ingredients')
      .select('*');

    if (riError) throw riError;

    recipeIngredients.forEach((ri) => {
      const problems = [];
      
      if (!ri.ingredient_name || ri.ingredient_name.trim() === '') {
        problems.push('missing ingredient_name');
      }
      if (!ri.quantity || ri.quantity === 0) {
        problems.push(`quantity: ${ri.quantity || 'null'}`);
      }
      if (ri.calculated_cost === null || ri.calculated_cost === undefined) {
        problems.push('missing calculated_cost');
      }
      
      if (problems.length > 0) {
        issues.recipeIngredients.push({ id: ri.id, recipe_id: ri.recipe_id, ingredient_name: ri.ingredient_name, problems });
        if (issues.recipeIngredients.length <= 10) { // Only show first 10
          console.log(`   ⚠️  Recipe ID: ${ri.recipe_id}, Ingredient: ${ri.ingredient_name || '(no name)'}`);
          console.log(`      Issues: ${problems.join(', ')}\n`);
        }
      }
    });

    if (issues.recipeIngredients.length > 10) {
      console.log(`   ... and ${issues.recipeIngredients.length - 10} more links with issues\n`);
    }

    // Summary
    console.log('\n📊 Summary:\n');
    console.log(`   Recipes with issues: ${issues.recipes.length}/${recipes.length}`);
    console.log(`   Ingredients with issues: ${issues.ingredients.length}/${ingredients.length}`);
    console.log(`   Recipe-Ingredient links with issues: ${issues.recipeIngredients.length}/${recipeIngredients.length}`);

    return issues;

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  }
}

async function fixRecipes(issues) {
  console.log('\n🔧 Fixing Recipes...\n');

  let fixed = 0;
  let skipped = 0;

  for (const recipe of issues.recipes) {
    const updates = {};

    // Try to calculate cost if missing
    if (recipe.problems.includes('missing total_cost') || recipe.problems.includes('missing cost_per_serving')) {
      const { data: ingredients, error } = await supabase
        .from('recipe_ingredients')
        .select('calculated_cost')
        .eq('recipe_id', recipe.id);

      if (!error && ingredients && ingredients.length > 0) {
        const totalCost = ingredients.reduce((sum, ri) => sum + (ri.calculated_cost || 0), 0);
        updates.total_cost = Math.round(totalCost * 100) / 100;

        // Get servings from recipe
        const { data: recipeData } = await supabase
          .from('recipes')
          .select('servings')
          .eq('id', recipe.id)
          .single();

        if (recipeData && recipeData.servings > 0) {
          updates.cost_per_serving = Math.round((totalCost / recipeData.servings) * 100) / 100;
        }
      }
    }

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from('recipes')
        .update(updates)
        .eq('id', recipe.id);

      if (error) {
        console.log(`   ❌ Failed to fix ${recipe.name}: ${error.message}`);
        skipped++;
      } else {
        console.log(`   ✅ Fixed ${recipe.name}`);
        fixed++;
      }
    } else {
      skipped++;
    }
  }

  console.log(`\n   ✅ Fixed: ${fixed}`);
  console.log(`   ⚠️  Skipped (needs manual fix): ${skipped}`);
}

async function fixRecipeIngredients(issues) {
  console.log('\n🔧 Fixing Recipe-Ingredient Links...\n');

  // Get all ingredients for matching
  const { data: allIngredients } = await supabase
    .from('ingredients')
    .select('*');

  const ingredientMap = {};
  if (allIngredients) {
    allIngredients.forEach(ing => {
      const key = ing.item?.toLowerCase().trim();
      if (key) ingredientMap[key] = ing;
    });
  }

  let fixed = 0;
  let skipped = 0;

  for (const ri of issues.recipeIngredients) {
    const updates = {};

    // Try to calculate cost if missing
    if (ri.problems.includes('missing calculated_cost')) {
      // Get the recipe ingredient row
      const { data: riData, error: fetchError } = await supabase
        .from('recipe_ingredients')
        .select('*, ingredients(*)')
        .eq('id', ri.id)
        .single();

      if (!fetchError && riData && riData.ingredients) {
        const ingredient = riData.ingredients;
        const quantity = riData.quantity || 0;
        const unit = riData.unit || ingredient.base_unit;

        // Simple cost calculation: quantity * price_per_base_unit
        // (This is simplified - real calculation needs unit conversion)
        if (ingredient.price_per_base_unit && quantity > 0) {
          updates.calculated_cost = Math.round((quantity * ingredient.price_per_base_unit) * 100) / 100;
        }
      }
    }

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from('recipe_ingredients')
        .update(updates)
        .eq('id', ri.id);

      if (error) {
        console.log(`   ❌ Failed to fix link ${ri.id}: ${error.message}`);
        skipped++;
      } else {
        fixed++;
      }
    } else {
      skipped++;
    }
  }

  console.log(`\n   ✅ Fixed: ${fixed}`);
  console.log(`   ⚠️  Skipped (needs manual fix): ${skipped}`);
}

async function main() {
  try {
    const issues = await checkEmptyRows();

    if (issues.recipes.length === 0 && issues.ingredients.length === 0 && issues.recipeIngredients.length === 0) {
      console.log('\n✅ No issues found! All data looks good.\n');
      return;
    }

    console.log('\n🔧 Attempting automatic fixes...\n');
    console.log('════════════════════════════════════════════════════════════\n');

    if (issues.recipes.length > 0) {
      await fixRecipes(issues);
    }

    if (issues.recipeIngredients.length > 0) {
      await fixRecipeIngredients(issues);
    }

    console.log('\n✅ Fix complete!\n');
    console.log('💡 Note: Some issues may require manual fixing (missing servings, etc.)');
    console.log('   Check Supabase Table Editor for remaining issues.\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
