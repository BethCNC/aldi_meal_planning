/**
 * Test Notion Database Queries
 * 
 * Quick tests to verify database connectivity and structure
 */

import {queryRecipes, queryMealPlanEntries, searchIngredient} from '../src/notion/notionClient.js';
import notion from '../src/notion/notionClient.js';

async function testRecipesQuery() {
  console.log('\n📋 Test 1: Query Recipes Database\n');
  
  try {
    const recipes = await queryRecipes();
    console.log(`✅ Successfully queried Recipes database`);
    console.log(`   Found ${recipes.length} recipes`);
    
    if (recipes.length > 0) {
      const first = recipes[0];
      const name = first.properties['Recipe Name']?.title?.[0]?.plain_text || 'Unknown';
      const cost = first.properties['Cost ($)']?.number;
      const servings = first.properties['Servings']?.number;
      const category = first.properties['Category']?.select?.name || 'N/A';
      
      console.log(`\n   Example recipe:`);
      console.log(`     Name: ${name}`);
      console.log(`     Category: ${category}`);
      console.log(`     Cost: $${cost || 'N/A'}`);
      console.log(`     Servings: ${servings || 'N/A'}`);
      
      // Check ingredient relations
      const ingredients = first.properties['Database Ingredients ']?.relation || 
                         first.properties['Database Ingredients']?.relation || 
                         [];
      console.log(`     Linked Ingredients: ${ingredients.length}`);
    }
    
    return true;
  } catch (error) {
    console.log(`❌ Error querying recipes: ${error.message}`);
    return false;
  }
}

async function testIngredientsSearch() {
  console.log('\n🔍 Test 2: Search Ingredients\n');
  
  try {
    // Try searching for common ingredients
    const searchTerms = ['chicken', 'beef', 'rice', 'onion'];
    
    for (const term of searchTerms) {
      const ingredient = await searchIngredient(term);
      if (ingredient) {
        const name = ingredient.properties['Item']?.title?.[0]?.plain_text || 'Unknown';
        const cost = ingredient.properties['Cost']?.number || 0;
        console.log(`   ✅ Found: ${name} ($${cost.toFixed(2)})`);
        break; // Just show first match
      }
    }
    
    if (!await searchIngredient('test')) {
      console.log('   ✅ Search function working (no match for "test" - expected)');
    }
    
    return true;
  } catch (error) {
    console.log(`❌ Error searching ingredients: ${error.message}`);
    return false;
  }
}

async function testMealPlannerQuery() {
  console.log('\n📅 Test 3: Query Meal Planner Database\n');
  
  try {
    // Get current week dates
    const today = new Date();
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    const startStr = startOfWeek.toISOString().split('T')[0];
    const endStr = endOfWeek.toISOString().split('T')[0];
    
    console.log(`   Querying: ${startStr} to ${endStr}`);
    
    const entries = await queryMealPlanEntries(startStr, endStr);
    console.log(`✅ Successfully queried Meal Planner database`);
    console.log(`   Found ${entries.length} entries for this week`);
    
    if (entries.length > 0) {
      const first = entries[0];
      const date = first.properties['Date']?.date?.start;
      const day = first.properties['Day']?.select?.name || 'N/A';
      const dinner = first.properties['Dinner']?.relation || [];
      const name = first.properties['Name']?.title?.[0]?.plain_text || 'N/A';
      
      console.log(`\n   Example entry:`);
      console.log(`     Date: ${date}`);
      console.log(`     Day: ${day}`);
      console.log(`     Name: ${name}`);
      console.log(`     Dinner recipes: ${dinner.length}`);
    }
    
    return true;
  } catch (error) {
    console.log(`❌ Error querying meal planner: ${error.message}`);
    if (error.message.includes('not configured')) {
      console.log(`   💡 Make sure NOTION_ALDI_WEEKLY_MEAL_PLANNING_DB_ID is set in .env`);
    }
    return false;
  }
}

async function testDatabaseSchema() {
  console.log('\n🏗️  Test 4: Verify Database Schemas\n');
  
  try {
    const {default: notion} = await import('../src/notion/notionClient.js');
    const dotenv = await import('dotenv');
    dotenv.config();
    
    const DB_IDS = {
      ingredients: process.env.NOTION_ALDI_INGREDIENTS_DB_ID || process.env.NOTION_INGREDIENTS_DB_ID,
      recipes: process.env.NOTION_ALDI_RECIPES_DB_ID || process.env.NOTION_RECIPES_DB_ID,
      mealPlanner: process.env.NOTION_ALDI_WEEKLY_MEAL_PLANNING_DB_ID || process.env.NOTION_MEAL_PLANNER_DB_ID
    };
    
    // Test Ingredients
    if (DB_IDS.ingredients) {
      const ingDb = await notion.databases.retrieve({database_id: DB_IDS.ingredients});
      const hasItem = 'Item' in ingDb.properties;
      const hasCost = 'Cost' in ingDb.properties;
      console.log(`   Ingredients DB: ${hasItem && hasCost ? '✅' : '❌'} Required properties found`);
    }
    
    // Test Recipes
    if (DB_IDS.recipes) {
      const recipesDb = await notion.databases.retrieve({database_id: DB_IDS.recipes});
      const hasRecipeName = 'Recipe Name' in recipesDb.properties;
      const hasDinnerRel = 'Database Ingredients ' in recipesDb.properties || 'Database Ingredients' in recipesDb.properties;
      console.log(`   Recipes DB: ${hasRecipeName && hasDinnerRel ? '✅' : '❌'} Required properties found`);
    }
    
    // Test Meal Planner
    if (DB_IDS.mealPlanner) {
      const mealDb = await notion.databases.retrieve({database_id: DB_IDS.mealPlanner});
      const hasDate = 'Date' in mealDb.properties;
      const hasDinner = 'Dinner' in mealDb.properties;
      const hasDay = 'Day' in mealDb.properties;
      console.log(`   Meal Planner DB: ${hasDate && hasDinner && hasDay ? '✅' : '❌'} Required properties found`);
    }
    
    return true;
  } catch (error) {
    console.log(`❌ Error verifying schemas: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🧪 Running Notion Database Tests\n');
  console.log('='.repeat(60));
  
  const results = {
    recipes: false,
    ingredients: false,
    mealPlanner: false,
    schema: false
  };
  
  // Run tests
  results.recipes = await testRecipesQuery();
  results.ingredients = await testIngredientsSearch();
  results.mealPlanner = await testMealPlannerQuery();
  results.schema = await testDatabaseSchema();
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Results Summary:\n');
  
  console.log(`   Recipes Query:     ${results.recipes ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Ingredients Search: ${results.ingredients ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Meal Planner Query: ${results.mealPlanner ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Schema Verification: ${results.schema ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = Object.values(results).every(r => r === true);
  
  if (allPassed) {
    console.log('\n✅ All tests passed! Your Notion integration is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
  }
  
  console.log('\n' + '='.repeat(60));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('\n❌ Test suite error:', error.message);
    process.exit(1);
  });
}
