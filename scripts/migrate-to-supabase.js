/**
 * Migrate Notion Data to Supabase
 * 
 * Imports all recipes and ingredients from Notion into Supabase.
 * Run this after creating the schema in Supabase SQL Editor.
 * 
 * Usage:
 *   node scripts/migrate-to-supabase.js
 */

import { createClient } from '@supabase/supabase-js';
import { fetchIngredients, fetchRecipes } from './fetch-notion-databases.js';
import { parseIngredientLine, matchIngredient } from './calculate-recipe-costs.js';
import { convertUnit } from '../backend/utils/unitConversions.js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_KEY required in .env\n');
  console.error('💡 Run: node scripts/setup-supabase.js first\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Import ingredients
 */
async function importIngredients(ingredients) {
  console.log('📦 Importing ingredients to Supabase...\n');
  
  const ingredientsToInsert = ingredients.map(ing => {
    // Calculate package price from PPU if missing
    let pricePerPackage = ing.pricePerPackage;
    if (!pricePerPackage && ing.pricePerBaseUnit && ing.packageSize) {
      let sizeForPricing = ing.packageSize;
      if (ing.packageUnit && ing.baseUnit && ing.packageUnit.toLowerCase() !== ing.baseUnit.toLowerCase()) {
        try {
          const converted = convertUnit(ing.packageSize, ing.packageUnit, ing.baseUnit);
          if (typeof converted === 'number' && Number.isFinite(converted) && converted > 0) {
            sizeForPricing = converted;
          }
        } catch (error) {
          console.warn(`⚠️  Unable to convert ${ing.packageSize}${ing.packageUnit} to ${ing.baseUnit} for ${ing.item}: ${error.message}`);
        }
      }
      pricePerPackage = ing.pricePerBaseUnit * sizeForPricing;
    }
    
    // Handle category array
    const category = Array.isArray(ing.category) ? ing.category[0] : ing.category;
    
    return {
      id: ing.id,
      item: ing.item,
      price_per_package: pricePerPackage,
      package_size: ing.packageSize,
      package_unit: ing.packageUnit,
      base_unit: ing.baseUnit,
      price_per_base_unit: ing.pricePerBaseUnit,
      category: category,
      notes: ing.notes,
      notion_url: ing.url
    };
  });
  
  // Insert in batches of 100 (Supabase limit)
  const batchSize = 100;
  let imported = 0;
  
  for (let i = 0; i < ingredientsToInsert.length; i += batchSize) {
    const batch = ingredientsToInsert.slice(i, i + batchSize);
    
    const { error } = await supabase
      .from('ingredients')
      .upsert(batch, { onConflict: 'id' });
    
    if (error) {
      console.error(`❌ Error importing batch ${i / batchSize + 1}:`, error.message);
      throw error;
    }
    
    imported += batch.length;
    console.log(`   Imported ${imported}/${ingredientsToInsert.length} ingredients...`);
  }
  
  console.log(`✅ Imported ${imported} ingredients\n`);
}

/**
 * Import recipes
 */
async function importRecipes(recipes) {
  console.log('🍳 Importing recipes to Supabase...\n');
  
  const recipesToInsert = recipes.map(recipe => {
    // Handle tags array
    const tags = Array.isArray(recipe.tags) 
      ? recipe.tags.join(', ') 
      : recipe.tags || null;
    
    return {
      id: recipe.id,
      name: recipe.recipeName,
      servings: recipe.servings,
      category: recipe.category,
      total_cost: recipe.cost || recipe.recipeCost || null,
      cost_per_serving: recipe.costPerServing,
      instructions: recipe.instructions,
      source_url: recipe.sourceUrl,
      tags: tags,
      notion_url: recipe.url
    };
  });
  
  // Insert in batches
  const batchSize = 100;
  let imported = 0;
  
  for (let i = 0; i < recipesToInsert.length; i += batchSize) {
    const batch = recipesToInsert.slice(i, i + batchSize);
    
    const { error } = await supabase
      .from('recipes')
      .upsert(batch, { onConflict: 'id' });
    
    if (error) {
      console.error(`❌ Error importing batch ${i / batchSize + 1}:`, error.message);
      throw error;
    }
    
    imported += batch.length;
    console.log(`   Imported ${imported}/${recipesToInsert.length} recipes...`);
  }
  
  console.log(`✅ Imported ${imported} recipes\n`);
}

/**
 * Link recipe ingredients
 */
async function linkRecipeIngredients(recipes, allIngredients) {
  console.log('🔗 Linking recipe ingredients...\n');
  
  const recipeIngredients = [];
  
  for (const recipe of recipes) {
    if (!recipe.recipeIngredients || recipe.recipeIngredients.includes('No ingredients')) {
      continue;
    }
    
    const lines = recipe.recipeIngredients.split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0 && !l.startsWith('#') && !l.startsWith('###'));
    
    for (const line of lines) {
      const parsed = parseIngredientLine(line);
      if (!parsed) continue;
      
      const match = matchIngredient(parsed, allIngredients);
      
      if (match.matched) {
        const ingredient = match.ingredient;
        
        // Simple cost calculation (will be refined with SQL)
        let cost = 0;
        if (ingredient.pricePerBaseUnit && parsed.quantity) {
          cost = parsed.quantity * ingredient.pricePerBaseUnit;
        }
        
        recipeIngredients.push({
          recipe_id: recipe.id,
          ingredient_id: ingredient.id,
          quantity: parsed.quantity,
          unit: parsed.unit,
          ingredient_name: parsed.name,
          raw_line: line,
          calculated_cost: cost,
          matched_with_fuzzy: match.score < 100
        });
      }
    }
  }
  
  console.log(`   Found ${recipeIngredients.length} ingredient links to import...\n`);
  
  // Insert in batches
  const batchSize = 100;
  let imported = 0;
  
  for (let i = 0; i < recipeIngredients.length; i += batchSize) {
    const batch = recipeIngredients.slice(i, i + batchSize);
    
    const { error } = await supabase
      .from('recipe_ingredients')
      .upsert(batch, { onConflict: 'recipe_id,ingredient_id,raw_line' });
    
    if (error) {
      console.error(`❌ Error importing batch ${i / batchSize + 1}:`, error.message);
      // Continue with other batches
      continue;
    }
    
    imported += batch.length;
    console.log(`   Imported ${imported}/${recipeIngredients.length} links...`);
  }
  
  console.log(`✅ Imported ${imported} recipe-ingredient links\n`);
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Migrating Notion Data to Supabase\n');
  console.log('═'.repeat(60) + '\n');
  
  try {
    // Test connection
    console.log('🔌 Testing Supabase connection...');
    const { error: testError } = await supabase.from('recipes').select('count').limit(1);
    
    if (testError && testError.code === 'PGRST116') {
      console.error('❌ Error: Schema not found!\n');
      console.error('💡 Please run the SQL schema first:');
      console.error('   1. Go to Supabase SQL Editor');
      console.error('   2. Copy SQL from docs/DATABASE_SCHEMA_SUPABASE.md');
      console.error('   3. Run it\n');
      process.exit(1);
    }
    
    console.log('✅ Connected to Supabase\n');
    
    // Fetch data from Notion
    console.log('📥 Fetching data from Notion...\n');
    const ingredients = await fetchIngredients();
    const recipes = await fetchRecipes();
    
    // Import data
    await importIngredients(ingredients);
    await importRecipes(recipes);
    await linkRecipeIngredients(recipes, ingredients);
    
    // Show summary
    const { count: recipeCount } = await supabase
      .from('recipes')
      .select('*', { count: 'exact', head: true });
    
    const { count: ingredientCount } = await supabase
      .from('ingredients')
      .select('*', { count: 'exact', head: true });
    
    const { count: linkCount } = await supabase
      .from('recipe_ingredients')
      .select('*', { count: 'exact', head: true });
    
    console.log('═'.repeat(60));
    console.log('\n📊 Migration Summary:\n');
    console.log(`   Recipes: ${recipeCount}`);
    console.log(`   Ingredients: ${ingredientCount}`);
    console.log(`   Recipe-Ingredient Links: ${linkCount}\n`);
    
    console.log('✅ Migration complete!\n');
    console.log('🌐 View your data at:');
    console.log(`   ${SUPABASE_URL.replace('/rest/v1', '')}/project/default\n`);
    console.log('📝 Next steps:');
    console.log('   1. Go to Supabase Table Editor to view data');
    console.log('   2. Try SQL queries from docs/SQL_QUERIES.md');
    console.log('   3. Run: node scripts/calculate-costs-sql.js\n');
    
  } catch (error) {
    console.error('\n❌ Migration error:', error.message);
    if (error.details) {
      console.error('   Details:', error.details);
    }
    console.error('\n💡 Check:');
    console.error('   - Schema is created in Supabase');
    console.error('   - SUPABASE_URL and SUPABASE_KEY are correct');
    console.error('   - You have internet connection\n');
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
