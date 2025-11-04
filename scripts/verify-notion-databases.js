/**
 * Verify Notion Database Structure
 * 
 * This script checks:
 * 1. Database IDs are configured in .env
 * 2. Databases exist and are accessible
 * 3. Property names match expected schema
 * 4. Meal Planner database exists (or needs to be created)
 */

import {Client} from '@notionhq/client';
import dotenv from 'dotenv';

dotenv.config();

const notion = new Client({auth: process.env.NOTION_API_KEY});

// Expected database IDs from .env
// Note: Check both naming conventions
const DB_IDS = {
  ingredients: process.env.NOTION_ALDI_INGREDIENTS_DB_ID || process.env.NOTION_INGREDIENTS_DB_ID,
  recipes: process.env.NOTION_ALDI_RECIPES_DB_ID || process.env.NOTION_RECIPES_DB_ID,
  mealPlanner: process.env.NOTION_ALDI_WEEKLY_MEAL_PLANNING_DB_ID || process.env.NOTION_MEAL_PLANNER_DB_ID
};

/**
 * Get database schema (properties)
 */
async function getDatabaseSchema(databaseId, name) {
  try {
    const database = await notion.databases.retrieve({database_id: databaseId});
    
    console.log(`\n📊 ${name} Database Schema:`);
    console.log(`   ID: ${databaseId}`);
    console.log(`   Title: ${database.title?.[0]?.plain_text || 'N/A'}`);
    console.log(`   Properties:`);
    
    const properties = Object.entries(database.properties);
    for (const [propName, propDef] of properties) {
      const type = propDef.type;
      console.log(`     - ${propName}: ${type}`);
      if (type === 'select' && propDef.select?.options) {
        console.log(`       Options: ${propDef.select.options.map(o => o.name).join(', ')}`);
      }
      if (type === 'relation' && propDef.relation) {
        console.log(`       Related DB: ${propDef.relation.database_id}`);
      }
    }
    
    return database;
  } catch (error) {
    console.error(`❌ Error accessing ${name} database:`, error.message);
    if (error.code === 'object_not_found') {
      console.error(`   Database ID may be incorrect or database not shared with integration`);
    }
    return null;
  }
}

/**
 * Check if database ID is configured
 */
function checkEnvConfig() {
  console.log('🔍 Checking .env configuration...\n');
  
  const missing = [];
  
  if (!process.env.NOTION_API_KEY) {
    missing.push('NOTION_API_KEY');
  } else {
    console.log('✅ NOTION_API_KEY: configured');
  }
  
  if (!DB_IDS.ingredients) {
    missing.push('NOTION_ALDI_INGREDIENTS_DB_ID or NOTION_INGREDIENTS_DB_ID');
  } else {
    console.log(`✅ Ingredients DB ID: ${DB_IDS.ingredients}`);
    console.log(`   (from ${process.env.NOTION_ALDI_INGREDIENTS_DB_ID ? 'NOTION_ALDI_INGREDIENTS_DB_ID' : 'NOTION_INGREDIENTS_DB_ID'})`);
  }
  
  if (!DB_IDS.recipes) {
    missing.push('NOTION_ALDI_RECIPES_DB_ID or NOTION_RECIPES_DB_ID');
  } else {
    console.log(`✅ Recipes DB ID: ${DB_IDS.recipes}`);
    console.log(`   (from ${process.env.NOTION_ALDI_RECIPES_DB_ID ? 'NOTION_ALDI_RECIPES_DB_ID' : 'NOTION_RECIPES_DB_ID'})`);
  }
  
  if (!DB_IDS.mealPlanner) {
    console.log(`⚠️  Meal Planner DB ID: NOT CONFIGURED`);
    console.log(`   Expected: NOTION_ALDI_WEEKLY_MEAL_PLANNING_DB_ID or NOTION_MEAL_PLANNER_DB_ID`);
    console.log(`   You may need to create this database in Notion first`);
  } else {
    console.log(`✅ Meal Planner DB ID: ${DB_IDS.mealPlanner}`);
    console.log(`   (from ${process.env.NOTION_ALDI_WEEKLY_MEAL_PLANNING_DB_ID ? 'NOTION_ALDI_WEEKLY_MEAL_PLANNING_DB_ID' : 'NOTION_MEAL_PLANNER_DB_ID'})`);
  }
  
  if (missing.length > 0) {
    console.log(`\n❌ Missing required environment variables: ${missing.join(', ')}`);
    return false;
  }
  
  return true;
}

/**
 * Compare expected vs actual properties
 */
function compareProperties(expected, actual, dbName) {
  console.log(`\n🔍 Comparing ${dbName} properties...`);
  
  const actualProps = Object.keys(actual);
  const expectedProps = Object.keys(expected);
  
  const missing = expectedProps.filter(prop => !actualProps.includes(prop));
  const extra = actualProps.filter(prop => !expectedProps.includes(prop));
  
  if (missing.length > 0) {
    console.log(`   ⚠️  Missing properties: ${missing.join(', ')}`);
  }
  
  if (extra.length > 0) {
    console.log(`   ℹ️  Extra properties: ${extra.join(', ')}`);
  }
  
  // Check property name matches
  for (const [expectedName, expectedType] of Object.entries(expected)) {
    if (actualProps.includes(expectedName)) {
      const actualType = actual[expectedName]?.type;
      if (actualType !== expectedType) {
        console.log(`   ⚠️  Property "${expectedName}": expected ${expectedType}, got ${actualType}`);
      } else {
        console.log(`   ✅ Property "${expectedName}": ${expectedType}`);
      }
    }
  }
}

/**
 * Expected schemas based on documentation
 */
const EXPECTED_SCHEMAS = {
  ingredients: {
    'Line Item': 'title',
    'Item': 'title', // Alternative name
    'Average Unit Price ($)': 'number',
    'Cost': 'number', // Alternative name
    'Unit': 'rich_text',
    'Category': 'select',
    'Last Priced At': 'date'
  },
  recipes: {
    'Recipe Name': 'title',
    'Category': 'select',
    'Cost ($)': 'number',
    'Cost per Serving ($)': 'number',
    'Servings': 'number',
    'Recipe Ingredients': 'rich_text',
    'Instructions': 'rich_text',
    'Source/Link': 'url',
    'Database Ingredients': 'relation',
    'Tags': 'multi_select',
    'Rating': 'select'
  },
  mealPlanner: {
    'Date': 'date',
    'Meal': 'relation',
    'Day of Week': 'select',
    'Week Number': 'number',
    'Notes': 'rich_text'
  }
};

/**
 * Main verification function
 */
async function main() {
  console.log('🔍 Notion Database Verification\n');
  console.log('='.repeat(50));
  
  // Check .env configuration
  const envOk = checkEnvConfig();
  if (!envOk) {
    console.log('\n❌ Environment configuration incomplete. Please check your .env file.');
    process.exit(1);
  }
  
  // Verify Ingredients Database
  if (DB_IDS.ingredients) {
    console.log('\n' + '='.repeat(50));
    const ingredientsDb = await getDatabaseSchema(DB_IDS.ingredients, 'Ingredients');
    if (ingredientsDb) {
      compareProperties(EXPECTED_SCHEMAS.ingredients, ingredientsDb.properties, 'Ingredients');
    }
  }
  
  // Verify Recipes Database
  if (DB_IDS.recipes) {
    console.log('\n' + '='.repeat(50));
    const recipesDb = await getDatabaseSchema(DB_IDS.recipes, 'Recipes');
    if (recipesDb) {
      compareProperties(EXPECTED_SCHEMAS.recipes, recipesDb.properties, 'Recipes');
    }
  }
  
  // Verify Meal Planner Database
  if (DB_IDS.mealPlanner) {
    console.log('\n' + '='.repeat(50));
    const mealPlannerDb = await getDatabaseSchema(DB_IDS.mealPlanner, 'Meal Planner');
    if (mealPlannerDb) {
      compareProperties(EXPECTED_SCHEMAS.mealPlanner, mealPlannerDb.properties, 'Meal Planner');
    }
  } else {
    console.log('\n' + '='.repeat(50));
    console.log('\n⚠️  Meal Planner Database not configured');
    console.log('   You will need to:');
    console.log('   1. Create a database in Notion with the meal planner schema');
    console.log('   2. Share it with your integration');
    console.log('   3. Add NOTION_MEAL_PLANNER_DB_ID to .env');
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('\n✅ Verification complete!');
  console.log('\nNext steps:');
  console.log('1. Review any property name mismatches above');
  console.log('2. Update code to match actual property names if needed');
  console.log('3. Create Meal Planner database if missing');
  console.log('4. Begin building automation scripts');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('\n❌ Verification failed:', error.message);
    process.exit(1);
  });
}

export {getDatabaseSchema, checkEnvConfig};
