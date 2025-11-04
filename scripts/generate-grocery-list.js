/**
 * Grocery List Generator
 * 
 * Generates a consolidated grocery list from meal plan entries in Notion
 * Works with either drag-and-dropped meals OR auto-generated meal plans
 * 
 * Usage: 
 *   node scripts/generate-grocery-list.js --week 2025-01-27
 *   node scripts/generate-grocery-list.js --start 2025-01-27 --end 2025-02-02
 */

import {queryMealPlanEntries, queryRecipes} from '../src/notion/notionClient.js';
import {writeFile} from 'fs/promises';
import {readFile} from 'fs/promises';

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    startDate: null,
    endDate: null,
    week: null,
    output: 'grocery-list.txt'
  };
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--week' && args[i + 1]) {
      options.week = args[i + 1];
      i++;
    } else if (args[i] === '--start' && args[i + 1]) {
      options.startDate = args[i + 1];
      i++;
    } else if (args[i] === '--end' && args[i + 1]) {
      options.endDate = args[i + 1];
      i++;
    } else if (args[i] === '--output' && args[i + 1]) {
      options.output = args[i + 1];
      i++;
    }
  }
  
  // Calculate dates from week
  if (options.week) {
    const weekStart = new Date(options.week);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    options.startDate = weekStart.toISOString().split('T')[0];
    options.endDate = weekEnd.toISOString().split('T')[0];
  }
  
  // Default to current week if nothing specified
  if (!options.startDate) {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    options.startDate = startOfWeek.toISOString().split('T')[0];
    options.endDate = endOfWeek.toISOString().split('T')[0];
  }
  
  return options;
}

/**
 * Extract ingredient relations from recipe
 */
function getRecipeIngredients(recipe) {
  // Your database uses 'Aldi Ingredients' relation
  const relation = recipe.properties['Aldi Ingredients']?.relation || [];
  return relation.map(rel => rel.id);
}

/**
 * Get ingredient details
 */
async function getIngredientDetails(ingredientId, notionClient) {
  try {
    const ingredient = await notionClient.pages.retrieve({page_id: ingredientId});
    const name = ingredient.properties['Item']?.title?.[0]?.plain_text || 'Unknown';
    // Your database uses 'Price per Package ($)' not 'Cost'
    const cost = ingredient.properties['Price per Package ($)']?.number || 0;
    const unit = ingredient.properties['Unit']?.rich_text?.[0]?.plain_text ||
                 ingredient.properties['Price per unit']?.rich_text?.[0]?.plain_text ||
                 '';
    
    return {id: ingredientId, name, cost, unit};
  } catch (error) {
    console.error(`Error fetching ingredient ${ingredientId}:`, error.message);
    return null;
  }
}

/**
 * Aggregate ingredients from recipes
 */
async function aggregateIngredients(mealPlanEntries, notionClient) {
  const ingredientMap = new Map();
  const recipeIds = new Set();
  let totalCost = 0;
  
  console.log(`\n📋 Processing ${mealPlanEntries.length} meal plan entries...\n`);
  
  for (const entry of mealPlanEntries) {
      // Your database uses 'Dinner' not 'Meal'
      const mealRelation = entry.properties['Dinner']?.relation || 
                           entry.properties['Meal']?.relation || 
                           [];
    
    for (const mealRel of mealRelation) {
      if (!recipeIds.has(mealRel.id)) {
        recipeIds.add(mealRel.id);
        
        try {
          const recipe = await notionClient.pages.retrieve({page_id: mealRel.id});
          const recipeName = recipe.properties['Recipe Name']?.title?.[0]?.plain_text || 'Unknown';
          
          console.log(`  📝 ${recipeName}`);
          
          // Note: Your database uses 'Database Ingredients ' (with trailing space)
          const ingredientIds = getRecipeIngredients(recipe);
          
          for (const ingId of ingredientIds) {
            const ingredient = await getIngredientDetails(ingId, notionClient);
            
            if (ingredient) {
              const key = ingredient.name.toLowerCase().trim();
              
              if (ingredientMap.has(key)) {
                // Consolidate duplicate
                const existing = ingredientMap.get(key);
                existing.count = (existing.count || 1) + 1;
                existing.totalCost += ingredient.cost;
              } else {
                ingredientMap.set(key, {
                  name: ingredient.name,
                  cost: ingredient.cost,
                  unit: ingredient.unit,
                  count: 1,
                  totalCost: ingredient.cost
                });
              }
              
              totalCost += ingredient.cost;
            }
          }
        } catch (error) {
          console.error(`  ❌ Error processing recipe:`, error.message);
        }
      }
    }
  }
  
  return {
    ingredients: Array.from(ingredientMap.values()),
    totalCost,
    recipeCount: recipeIds.size
  };
}

/**
 * Format grocery list for output
 */
function formatGroceryList(data, startDate, endDate) {
  const {ingredients, totalCost, recipeCount} = data;
  
  // Sort by category (simple heuristic based on name)
  const categorized = {
    meat: [],
    produce: [],
    dairy: [],
    pantry: [],
    other: []
  };
  
  for (const ing of ingredients) {
    const name = ing.name.toLowerCase();
    if (name.match(/(beef|chicken|pork|turkey|fish|shrimp|sausage|bacon|ham)/)) {
      categorized.meat.push(ing);
    } else if (name.match(/(lettuce|tomato|onion|pepper|carrot|celery|spinach|kale|cabbage|zucchini|avocado|potato)/)) {
      categorized.produce.push(ing);
    } else if (name.match(/(cheese|milk|butter|yogurt|cream|egg)/)) {
      categorized.dairy.push(ing);
    } else if (name.match(/(rice|pasta|flour|sugar|salt|pepper|oil|vinegar|sauce|beans)/)) {
      categorized.pantry.push(ing);
    } else {
      categorized.other.push(ing);
    }
  }
  
  let output = '🛒 GROCERY LIST\n';
  output += '='.repeat(50) + '\n';
  output += `Week: ${startDate} to ${endDate}\n`;
  output += `Recipes: ${recipeCount}\n\n`;
  
  if (categorized.meat.length > 0) {
    output += '🥩 MEAT\n';
    categorized.meat.forEach(ing => {
      output += `  • ${ing.name}`;
      if (ing.count > 1) output += ` (x${ing.count})`;
      if (ing.unit) output += ` - ${ing.unit}`;
      output += ` - $${ing.totalCost.toFixed(2)}\n`;
    });
    output += '\n';
  }
  
  if (categorized.produce.length > 0) {
    output += '🥦 PRODUCE\n';
    categorized.produce.forEach(ing => {
      output += `  • ${ing.name}`;
      if (ing.count > 1) output += ` (x${ing.count})`;
      if (ing.unit) output += ` - ${ing.unit}`;
      output += ` - $${ing.totalCost.toFixed(2)}\n`;
    });
    output += '\n';
  }
  
  if (categorized.dairy.length > 0) {
    output += '🧀 DAIRY\n';
    categorized.dairy.forEach(ing => {
      output += `  • ${ing.name}`;
      if (ing.count > 1) output += ` (x${ing.count})`;
      if (ing.unit) output += ` - ${ing.unit}`;
      output += ` - $${ing.totalCost.toFixed(2)}\n`;
    });
    output += '\n';
  }
  
  if (categorized.pantry.length > 0) {
    output += '🥫 PANTRY\n';
    categorized.pantry.forEach(ing => {
      output += `  • ${ing.name}`;
      if (ing.count > 1) output += ` (x${ing.count})`;
      if (ing.unit) output += ` - ${ing.unit}`;
      output += ` - $${ing.totalCost.toFixed(2)}\n`;
    });
    output += '\n';
  }
  
  if (categorized.other.length > 0) {
    output += '📦 OTHER\n';
    categorized.other.forEach(ing => {
      output += `  • ${ing.name}`;
      if (ing.count > 1) output += ` (x${ing.count})`;
      if (ing.unit) output += ` - ${ing.unit}`;
      output += ` - $${ing.totalCost.toFixed(2)}\n`;
    });
    output += '\n';
  }
  
  output += '='.repeat(50) + '\n';
  output += `💰 TOTAL ESTIMATED COST: $${totalCost.toFixed(2)}\n`;
  output += '='.repeat(50) + '\n';
  
  return output;
}

/**
 * Main function
 */
async function main() {
  const options = parseArgs();
  const notionClient = (await import('../src/notion/notionClient.js')).default;
  
  console.log('🛒 Grocery List Generator\n');
  console.log(`📅 Week: ${options.startDate} to ${options.endDate}`);
  
  try {
    // Query meal plan entries
    const mealPlanEntries = await queryMealPlanEntries(options.startDate, options.endDate);
    
    if (mealPlanEntries.length === 0) {
      console.log('\n⚠️  No meal plan entries found for this week.');
      console.log('   You can:');
      console.log('   1. Add meals manually in Notion Meal Planner database');
      console.log('   2. Or run generate-meal-plan.js to auto-generate');
      return;
    }
    
    // Aggregate ingredients
    const data = await aggregateIngredients(mealPlanEntries, notionClient);
    
    // Format and save
    const formatted = formatGroceryList(data, options.startDate, options.endDate);
    
    await writeFile(options.output, formatted, 'utf-8');
    
    console.log('\n✅ Grocery list generated!');
    console.log(`📄 Saved to: ${options.output}`);
    console.log(`💰 Total estimated cost: $${data.totalCost.toFixed(2)}`);
    console.log(`\n📋 Preview:\n`);
    console.log(formatted);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code === 'object_not_found') {
      console.error('   Make sure NOTION_ALDI_WEEKLY_MEAL_PLANNING_DB_ID is set in .env');
    }
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
