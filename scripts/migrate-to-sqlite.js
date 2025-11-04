/**
 * Migrate Notion Data to SQLite Database
 * 
 * Creates a SQLite database with proper schema and migrates all data
 * from Notion databases. This enables fast, accurate cost calculations.
 * 
 * Usage:
 *   node scripts/migrate-to-sqlite.js
 * 
 * This will:
 * 1. Create database schema
 * 2. Import ingredients from Notion
 * 3. Import recipes from Notion
 * 4. Parse recipe ingredients and link to database
 * 5. Calculate costs using SQL
 */

import Database from 'better-sqlite3';
import {fetchIngredients, fetchRecipes} from './fetch-notion-databases.js';
import {parseIngredientLine, matchIngredient} from './calculate-recipe-costs.js';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'aldi_meal_planning.db');

/**
 * Create database schema
 */
function createSchema(db) {
  console.log('📐 Creating database schema...\n');
  
  // Drop existing tables if they exist (for clean migration)
  db.exec(`
    DROP TABLE IF EXISTS recipe_ingredients;
    DROP TABLE IF EXISTS recipes;
    DROP TABLE IF EXISTS ingredients;
    DROP TABLE IF EXISTS unit_conversions;
    DROP TABLE IF EXISTS units;
    DROP VIEW IF EXISTS recipe_cost_summary;
  `);
  
  // Create ingredients table
  db.exec(`
    CREATE TABLE ingredients (
      id TEXT PRIMARY KEY,
      item TEXT NOT NULL,
      price_per_package REAL,
      package_size REAL,
      package_unit TEXT,
      base_unit TEXT NOT NULL,
      price_per_base_unit REAL NOT NULL,
      category TEXT,
      notes TEXT,
      notion_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX idx_ingredients_item ON ingredients(item);
    CREATE INDEX idx_ingredients_category ON ingredients(category);
  `);
  
  // Create recipes table
  db.exec(`
    CREATE TABLE recipes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      servings INTEGER,
      category TEXT,
      total_cost REAL,
      cost_per_serving REAL,
      instructions TEXT,
      source_url TEXT,
      tags TEXT,
      notion_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX idx_recipes_name ON recipes(name);
    CREATE INDEX idx_recipes_category ON recipes(category);
    CREATE INDEX idx_recipes_cost ON recipes(cost_per_serving);
  `);
  
  // Create recipe_ingredients junction table
  db.exec(`
    CREATE TABLE recipe_ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_id TEXT NOT NULL,
      ingredient_id TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT,
      ingredient_name TEXT NOT NULL,
      raw_line TEXT,
      calculated_cost REAL,
      matched_with_fuzzy BOOLEAN DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (recipe_id) REFERENCES recipes(id),
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
    );
    
    CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
    CREATE INDEX idx_recipe_ingredients_ingredient ON recipe_ingredients(ingredient_id);
  `);
  
  // Create units table
  db.exec(`
    CREATE TABLE units (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      unit TEXT NOT NULL UNIQUE,
      unit_type TEXT NOT NULL,
      is_base_unit BOOLEAN DEFAULT 0
    );
    
    CREATE INDEX idx_units_type ON units(unit_type);
  `);
  
  // Create unit_conversions table
  db.exec(`
    CREATE TABLE unit_conversions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_unit TEXT NOT NULL,
      to_unit TEXT NOT NULL,
      conversion_factor REAL NOT NULL,
      ingredient_type TEXT,
      notes TEXT
    );
    
    CREATE INDEX idx_conversions_from ON unit_conversions(from_unit);
    CREATE INDEX idx_conversions_to ON unit_conversions(to_unit);
  `);
  
  // Insert standard units
  const insertUnit = db.prepare(`
    INSERT INTO units (unit, unit_type, is_base_unit) 
    VALUES (?, ?, ?)
  `);
  
  const units = [
    ['lb', 'weight', 1],
    ['oz', 'weight', 1],
    ['g', 'weight', 0],
    ['cup', 'volume', 1],
    ['fl oz', 'volume', 1],
    ['tbsp', 'volume', 0],
    ['tsp', 'volume', 0],
    ['each', 'count', 1],
    ['can', 'count', 0],
    ['packet', 'count', 0],
    ['pint', 'volume', 0],
    ['quart', 'volume', 0],
    ['ml', 'volume', 0],
    ['l', 'volume', 0]
  ];
  
  units.forEach(([unit, type, isBase]) => {
    insertUnit.run(unit, type, isBase);
  });
  
  // Insert unit conversions
  const insertConversion = db.prepare(`
    INSERT INTO unit_conversions (from_unit, to_unit, conversion_factor, ingredient_type, notes)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  const conversions = [
    ['lb', 'oz', 16.0, null, 'Standard weight conversion'],
    ['oz', 'lb', 0.0625, null, 'Standard weight conversion'],
    ['cup', 'fl oz', 8.0, null, 'Standard volume conversion'],
    ['tbsp', 'tsp', 3.0, null, 'Standard volume conversion'],
    ['tsp', 'tbsp', 0.3333, null, 'Standard volume conversion'],
    ['cup', 'oz', 8.6, 'milk', 'Liquid volume to weight'],
    ['cup', 'oz', 7.0, 'rice', 'Rice volume to weight'],
    ['cup', 'oz', 4.25, 'flour', 'Flour volume to weight'],
    ['pint', 'fl oz', 16.0, null, 'Pint to fluid ounces'],
    ['quart', 'fl oz', 32.0, null, 'Quart to fluid ounces']
  ];
  
  conversions.forEach(([from, to, factor, ingredient, notes]) => {
    insertConversion.run(from, to, factor, ingredient, notes);
  });
  
  // Create view for recipe cost summary
  db.exec(`
    CREATE VIEW recipe_cost_summary AS
    SELECT 
      r.id,
      r.name,
      r.servings,
      r.category,
      COALESCE(SUM(ri.calculated_cost), 0) AS total_cost,
      CASE 
        WHEN r.servings > 0 
        THEN COALESCE(SUM(ri.calculated_cost), 0) / r.servings 
        ELSE 0 
      END AS cost_per_serving,
      COUNT(ri.id) AS ingredient_count,
      SUM(CASE WHEN ri.matched_with_fuzzy = 1 THEN 1 ELSE 0 END) AS fuzzy_matched_count
    FROM recipes r
    LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
    GROUP BY r.id, r.name, r.servings, r.category;
  `);
  
  console.log('✅ Schema created successfully\n');
}

/**
 * Import ingredients
 */
function importIngredients(db, ingredients) {
  console.log('📦 Importing ingredients...');
  
  const insert = db.prepare(`
    INSERT INTO ingredients (
      id, item, price_per_package, package_size, package_unit,
      base_unit, price_per_base_unit, category, notes, notion_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const insertMany = db.transaction((ingredients) => {
    for (const ing of ingredients) {
      // Calculate package price from PPU if missing
      let pricePerPackage = ing.pricePerPackage;
      if (!pricePerPackage && ing.pricePerBaseUnit && ing.packageSize) {
        pricePerPackage = ing.pricePerBaseUnit * ing.packageSize;
      }
      
      // Handle category array (convert to string)
      const category = Array.isArray(ing.category) 
        ? ing.category[0] 
        : ing.category;
      
      insert.run(
        ing.id,
        ing.item,
        pricePerPackage,
        ing.packageSize,
        ing.packageUnit,
        ing.baseUnit,
        ing.pricePerBaseUnit,
        category,
        ing.notes,
        ing.url
      );
    }
  });
  
  insertMany(ingredients);
  console.log(`✅ Imported ${ingredients.length} ingredients\n`);
}

/**
 * Import recipes
 */
function importRecipes(db, recipes) {
  console.log('🍳 Importing recipes...');
  
  const insert = db.prepare(`
    INSERT INTO recipes (
      id, name, servings, category, total_cost, cost_per_serving,
      instructions, source_url, tags, notion_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const insertMany = db.transaction((recipes) => {
    for (const recipe of recipes) {
      // Handle tags array (convert to comma-separated string)
      const tags = Array.isArray(recipe.tags) 
        ? recipe.tags.join(', ') 
        : recipe.tags || null;
      
      insert.run(
        recipe.id,
        recipe.recipeName,
        recipe.servings,
        recipe.category,
        recipe.cost || recipe.recipeCost || null,
        recipe.costPerServing,
        recipe.instructions,
        recipe.sourceUrl,
        tags,
        recipe.url
      );
    }
  });
  
  insertMany(recipes);
  console.log(`✅ Imported ${recipes.length} recipes\n`);
}

/**
 * Parse and link recipe ingredients
 */
async function linkRecipeIngredients(db, recipes, allIngredients) {
  console.log('🔗 Linking recipe ingredients...\n');
  
  const insert = db.prepare(`
    INSERT INTO recipe_ingredients (
      recipe_id, ingredient_id, quantity, unit, ingredient_name,
      raw_line, calculated_cost, matched_with_fuzzy
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  let totalLinked = 0;
  let totalUnmatched = 0;
  
  for (const recipe of recipes) {
    if (!recipe.recipeIngredients || recipe.recipeIngredients.includes('No ingredients')) {
      continue;
    }
    
    const lines = recipe.recipeIngredients.split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0 && !l.startsWith('#'));
    
    for (const line of lines) {
      const parsed = parseIngredientLine(line);
      if (!parsed) continue;
      
      const match = matchIngredient(parsed, allIngredients);
      
      if (match.matched) {
        // Calculate cost - simplified version
        // Full calculation will be done via SQL
        const ingredient = match.ingredient;
        let cost = 0;
        
        if (ingredient.pricePerBaseUnit && parsed.quantity) {
          // Simple calculation: quantity * PPU
          // This will be refined with unit conversions in SQL
          cost = parsed.quantity * ingredient.pricePerBaseUnit;
        }
        
        insert.run(
          recipe.id,
          ingredient.id,
          parsed.quantity,
          parsed.unit,
          parsed.name,
          line,
          cost,
          match.score < 100 ? 1 : 0
        );
        
        totalLinked++;
      } else {
        totalUnmatched++;
      }
    }
  }
  
  console.log(`✅ Linked ${totalLinked} ingredients`);
  console.log(`⚠️  ${totalUnmatched} ingredients could not be matched\n`);
}

/**
 * Main migration function
 */
async function main() {
  console.log('🚀 Migrating Notion Data to SQLite\n');
  console.log('═'.repeat(60) + '\n');
  
  // Create database directory if needed
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, {recursive: true});
  }
  
  // Open database
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL'); // Better performance
  
  try {
    // Create schema
    createSchema(db);
    
    // Fetch data from Notion
    console.log('📥 Fetching data from Notion...\n');
    const ingredients = await fetchIngredients();
    const recipes = await fetchRecipes();
    
    // Import data
    importIngredients(db, ingredients);
    importRecipes(db, recipes);
    
    // Link recipe ingredients
    await linkRecipeIngredients(db, recipes, ingredients);
    
    // Show summary
    const recipeCount = db.prepare('SELECT COUNT(*) as count FROM recipes').get();
    const ingredientCount = db.prepare('SELECT COUNT(*) as count FROM ingredients').get();
    const linkCount = db.prepare('SELECT COUNT(*) as count FROM recipe_ingredients').get();
    
    console.log('═'.repeat(60));
    console.log('\n📊 Migration Summary:\n');
    console.log(`   Recipes: ${recipeCount.count}`);
    console.log(`   Ingredients: ${ingredientCount.count}`);
    console.log(`   Recipe-Ingredient Links: ${linkCount.count}`);
    console.log(`\n💾 Database saved to: ${DB_PATH}\n`);
    
    console.log('✅ Migration complete!\n');
    console.log('📝 Next steps:');
    console.log('   1. Run: node scripts/calculate-costs-sql.js');
    console.log('   2. Try SQL queries from docs/SQL_QUERIES.md');
    console.log('   3. Use DB Browser for SQLite to explore data\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  } finally {
    db.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { DB_PATH };
