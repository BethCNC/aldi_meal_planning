/**
 * Meal Plan Generator
 * 
 * Automatically generates weekly meal plans within budget constraints
 * OR reads existing meal plan from Notion if you've drag-and-dropped meals
 * 
 * Usage:
 *   node scripts/generate-meal-plan.js --budget 75 --servings 4
 *   node scripts/generate-meal-plan.js --budget 75 --start-date 2025-01-27
 *   node scripts/generate-meal-plan.js --read-only  # Just read existing plan
 */

import {queryRecipes, createMealPlanEntry, queryMealPlanEntries} from '../src/notion/notionClient.js';

/**
 * Calculate ingredient overlap score between recipes
 */
function calculateOverlapScore(recipe1, recipe2) {
  // Your database uses 'Aldi Ingredients' relation
  const getIngredients = (recipe) => {
    return (recipe.properties['Aldi Ingredients']?.relation || []).map(rel => rel.id);
  };
  
  const ing1 = new Set(getIngredients(recipe1));
  const ing2 = new Set(getIngredients(recipe2));
  
  const intersection = new Set([...ing1].filter(id => ing2.has(id)));
  const union = new Set([...ing1, ...ing2]);
  
  // Jaccard similarity
  return union.size > 0 ? intersection.size / union.size : 0;
}

/**
 * Select optimal meal plan within budget
 */
function selectMealPlan(recipes, budget, servings, days = 7) {
  // Filter recipes that fit budget per serving
  const budgetPerMeal = budget / days;
  const budgetPerServing = budgetPerMeal / (servings || 4);
  
  const affordable = recipes.filter(recipe => {
    const costPerServing = recipe.properties['Cost per Serving ($)']?.number;
    const totalCost = recipe.properties['Recipe Cost']?.number || 
                     recipe.properties['Cost ($)']?.number;
    
    if (!costPerServing && !totalCost) return false;
    
    const servingCost = costPerServing || (totalCost / (recipe.properties['Servings']?.number || servings));
    
    return servingCost * (servings || 4) <= budgetPerMeal * 1.2; // 20% buffer
  });
  
  if (affordable.length < days) {
    console.log(`⚠️  Warning: Only ${affordable.length} affordable recipes found (need ${days})`);
    console.log(`   Consider increasing budget or adding more budget-friendly recipes`);
  }
  
  // Sort by cost efficiency and overlap
  const selected = [];
  const usedCategories = new Set();
  const usedRecipeIds = new Set();
  
  // Try to get one from each category first
  const categories = ['Chicken', 'Beef', 'Pork', 'Vegetarian', 'Seafood', 'Other'];
  
  for (const category of categories) {
    const categoryRecipes = affordable
      .filter(r => r.properties['Category']?.select?.name === category)
      .sort((a, b) => {
        const aCost = a.properties['Cost per Serving ($)']?.number || 
                     (a.properties['Cost ($)']?.number / (a.properties['Servings']?.number || servings));
        const bCost = b.properties['Cost per Serving ($)']?.number || 
                     (b.properties['Cost ($)']?.number / (b.properties['Servings']?.number || servings));
        return aCost - bCost;
      });
    
    if (categoryRecipes.length > 0 && selected.length < days) {
      const recipe = categoryRecipes[0];
      if (!usedRecipeIds.has(recipe.id)) {
        selected.push(recipe);
        usedRecipeIds.add(recipe.id);
        usedCategories.add(category);
      }
    }
  }
  
  // Fill remaining slots with best cost-efficiency recipes
  const remaining = affordable.filter(r => !usedRecipeIds.has(r.id));
  remaining.sort((a, b) => {
    const aCost = a.properties['Cost per Serving ($)']?.number || 
                 (a.properties['Cost ($)']?.number / (a.properties['Servings']?.number || servings));
    const bCost = b.properties['Cost per Serving ($)']?.number || 
                 (b.properties['Cost ($)']?.number / (b.properties['Servings']?.number || servings));
    return aCost - bCost;
  });
  
  while (selected.length < days && remaining.length > 0) {
    selected.push(remaining.shift());
  }
  
  // Add one leftover night
  if (selected.length >= days - 1) {
    selected.push(null); // Leftovers placeholder
  }
  
  return selected.slice(0, days);
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    budget: 75,
    servings: 4,
    days: 7,
    startDate: null,
    readOnly: false
  };
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--budget' && args[i + 1]) {
      options.budget = parseFloat(args[i + 1]);
      i++;
    } else if (args[i] === '--servings' && args[i + 1]) {
      options.servings = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--days' && args[i + 1]) {
      options.days = parseInt(args[i + 1]);
      i++;
    } else if ((args[i] === '--start-date' || args[i] === '--start') && args[i + 1]) {
      options.startDate = args[i + 1];
      i++;
    } else if (args[i] === '--read-only') {
      options.readOnly = true;
    }
  }
  
  // Calculate start date if not provided
  if (!options.startDate) {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);
    options.startDate = startOfWeek.toISOString().split('T')[0];
  }
  
  return options;
}

/**
 * Format date as day name
 */
function getDayName(dateString) {
  const date = new Date(dateString);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}

/**
 * Main function
 */
async function main() {
  const options = parseArgs();
  
  console.log('🎯 Meal Plan Generator\n');
  console.log(`📅 Week starting: ${options.startDate}`);
  console.log(`💰 Budget: $${options.budget}`);
  console.log(`👥 Servings: ${options.servings}`);
  console.log(`📆 Days: ${options.days}\n`);
  
  try {
    // Check if meal plan already exists
    const endDate = new Date(options.startDate);
    endDate.setDate(endDate.getDate() + options.days - 1);
    const endDateStr = endDate.toISOString().split('T')[0];
    
    const existingEntries = await queryMealPlanEntries(options.startDate, endDateStr);
    
    if (existingEntries.length > 0 && !options.readOnly) {
      console.log(`⚠️  Found ${existingEntries.length} existing meal plan entries for this week`);
      console.log(`   Use --read-only to just view, or delete existing entries in Notion first\n`);
    }
    
    if (options.readOnly && existingEntries.length > 0) {
      console.log('📋 Current Meal Plan:\n');
      
      let totalCost = 0;
      for (const entry of existingEntries) {
        const date = entry.properties['Date']?.date?.start;
        const dayName = date ? getDayName(date) : 'Unknown';
        // Your database uses 'Dinner' not 'Meal'
        const mealRelation = entry.properties['Dinner']?.relation || 
                             entry.properties['Meal']?.relation || 
                             [];
        
        if (mealRelation.length > 0) {
          const {default: notion} = await import('../src/notion/notionClient.js');
          const recipe = await notion.pages.retrieve({page_id: mealRelation[0].id});
          const recipeName = recipe.properties['Recipe Name']?.title?.[0]?.plain_text;
          const cost = recipe.properties['Cost ($)']?.number || 0;
          totalCost += cost;
          
          console.log(`  ${dayName}: ${recipeName} - $${cost.toFixed(2)}`);
        } else {
          console.log(`  ${dayName}: (no meal assigned)`);
        }
      }
      
      console.log(`\n💰 Total: $${totalCost.toFixed(2)} / $${options.budget}`);
      console.log(`   Remaining: $${(options.budget - totalCost).toFixed(2)}`);
      return;
    }
    
    if (options.readOnly) {
      console.log('⚠️  No existing meal plan found');
      return;
    }
    
    // Query available recipes
    console.log('🔍 Finding affordable recipes...\n');
    const allRecipes = await queryRecipes();
    
    if (allRecipes.length === 0) {
      console.log('❌ No recipes found in Notion');
      console.log('   Add recipes first using: node scripts/add-recipe-interactive.js');
      process.exit(1);
    }
    
    // Filter recipes with cost data
    const recipesWithCost = allRecipes.filter(r => {
      const cost = r.properties['Cost ($)']?.number;
      const costPerServing = r.properties['Cost per Serving ($)']?.number;
      return cost !== null && cost !== undefined || costPerServing !== null && costPerServing !== undefined;
    });
    
    console.log(`✅ Found ${recipesWithCost.length} recipes with cost data`);
    
    if (recipesWithCost.length < options.days) {
      console.log(`⚠️  Warning: Need at least ${options.days} recipes for ${options.days} days`);
    }
    
    // Select optimal meal plan
    const selected = selectMealPlan(recipesWithCost, options.budget, options.servings, options.days);
    
    // Calculate total cost
    let totalCost = 0;
    const mealPlan = [];
    
    console.log('\n📅 Generated Meal Plan:\n');
    
    for (let i = 0; i < options.days; i++) {
      const date = new Date(options.startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = getDayName(dateStr);
      
      const recipe = selected[i];
      
      if (recipe) {
        const recipeName = recipe.properties['Recipe Name']?.title?.[0]?.plain_text;
        const cost = recipe.properties['Cost ($)']?.number || 0;
        const category = recipe.properties['Category']?.select?.name || 'Other';
        
        totalCost += cost;
        
        console.log(`  ${dayName}: ${recipeName} - $${cost.toFixed(2)} (${category})`);
        
        mealPlan.push({
          date: dateStr,
          dayOfWeek: dayName,
          recipeId: recipe.id,
          recipeName,
          cost
        });
      } else {
        console.log(`  ${dayName}: Leftovers - $0.00`);
        mealPlan.push({
          date: dateStr,
          dayOfWeek: dayName,
          recipeId: null,
          recipeName: 'Leftovers',
          cost: 0
        });
      }
    }
    
    console.log(`\n💰 Total: $${totalCost.toFixed(2)} / $${options.budget}`);
    console.log(`   Remaining: $${(options.budget - totalCost).toFixed(2)}`);
    
    // Confirm before creating
    if (existingEntries.length > 0) {
      console.log('\n⚠️  Existing entries will be skipped (they already exist)');
    }
    
    console.log('\n✨ Creating meal plan entries in Notion...\n');
    
    let created = 0;
    let skipped = 0;
    
    for (const meal of mealPlan) {
      // Check if entry already exists for this date
      const existing = existingEntries.find(e => {
        const entryDate = e.properties['Date']?.date?.start;
        return entryDate === meal.date;
      });
      
      if (existing) {
        console.log(`  ⏭️  ${meal.dayOfWeek}: Skipped (already exists)`);
        skipped++;
        continue;
      }
      
      try {
        await createMealPlanEntry({
          date: meal.date,
          dayOfWeek: meal.dayOfWeek,
          mealRecipeId: meal.recipeId
          // Note: Your database doesn't have 'Week Number' property
        });
        
        console.log(`  ✅ ${meal.dayOfWeek}: ${meal.recipeName}`);
        created++;
      } catch (error) {
        console.error(`  ❌ ${meal.dayOfWeek}: Error - ${error.message}`);
      }
    }
    
    console.log('\n✅ Meal plan complete!');
    console.log(`   Created: ${created}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`\n📝 Next steps:`);
    console.log(`   1. Review meal plan in Notion`);
    console.log(`   2. Run: node scripts/generate-grocery-list.js --week ${options.startDate}`);
    console.log(`   3. Shop and cook! 🍳`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.message.includes('Meal Planner database ID')) {
      console.error('\n💡 Make sure NOTION_ALDI_WEEKLY_MEAL_PLANNING_DB_ID is set in .env');
    }
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
