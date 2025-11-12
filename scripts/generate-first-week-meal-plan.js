/**
 * Generate First Week Meal Plan
 * 
 * Generates a meal plan for the current/upcoming week and saves it to Supabase
 * so it shows up in the frontend app
 * 
 * Usage: node scripts/generate-first-week-meal-plan.js
 */

import dotenv from 'dotenv';
import {createClient} from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase environment variables not configured');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function getWeekStartDate(date = new Date()) {
  // Get Sunday of the current week
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day; // Subtract days to get to Sunday
  const sunday = new Date(d.setDate(diff));
  sunday.setHours(0, 0, 0, 0);
  return sunday.toISOString().split('T')[0]; // Return YYYY-MM-DD format
}

function selectMealsWithRotation(recipes, options) {
  const selected = [];
  const usedProteins = [];
  let remainingBudget = options.budget;
  
  for (let i = 0; i < options.count; i++) {
    const candidate = recipes.find(recipe => {
      const cost = recipe.total_cost || 0;
      const protein = recipe.category;
      
      const fitsBudget = cost <= remainingBudget;
      const noRecentRepeat = !usedProteins.slice(-2).includes(protein);
      const notAlreadySelected = !selected.find(r => r.id === recipe.id);
      
      return fitsBudget && noRecentRepeat && notAlreadySelected;
    });
    
    if (candidate) {
      selected.push(candidate);
      usedProteins.push(candidate.category);
      remainingBudget -= (candidate.total_cost || 0);
    } else {
      // If no candidate found, try without protein rotation
      const fallback = recipes.find(recipe => {
        const cost = recipe.total_cost || 0;
        const fitsBudget = cost <= remainingBudget;
        const notAlreadySelected = !selected.find(r => r.id === recipe.id);
        return fitsBudget && notAlreadySelected;
      });
      
      if (fallback) {
        selected.push(fallback);
        usedProteins.push(fallback.category);
        remainingBudget -= (fallback.total_cost || 0);
      }
    }
  }
  
  return selected;
}

async function generateMealPlan() {
  console.log('🍽️  Generating First Week Meal Plan\n');
  
  const budget = 100;
  const servings = 4;
  const weekStartDate = getWeekStartDate();
  
  console.log(`📅 Week Start Date: ${weekStartDate}`);
  console.log(`💰 Budget: $${budget}`);
  console.log(`👥 Servings: ${servings}\n`);
  
  const budgetPerMeal = budget / 7;
  
  // Step 1: Get all available recipes within budget
  console.log('1. Loading recipes...');
  let { data: allRecipes, error: recipesError } = await supabase
    .from('recipes')
    .select('*')
    .lte('cost_per_serving', budgetPerMeal / servings)
    .not('total_cost', 'is', null)
    .not('cost_per_serving', 'is', null);
  
  if (recipesError) {
    console.error(`❌ Error loading recipes: ${recipesError.message}`);
    process.exit(1);
  }
  
  if (!allRecipes) allRecipes = [];
  
  // Filter out recipes without valid costs
  allRecipes = allRecipes.filter(r => r.total_cost > 0 && r.cost_per_serving > 0);
  
  console.log(`   ✅ Found ${allRecipes.length} recipes within budget\n`);
  
  if (allRecipes.length === 0) {
    console.error('❌ No recipes available within budget. Please add more recipes or increase your budget.');
    process.exit(1);
  }
  
  // Step 2: Check for pantry items and prioritize
  console.log('2. Checking pantry items...');
  const { data: pantryItems } = await supabase
    .from('user_pantry')
    .select('ingredient_id')
    .gt('quantity', 0);
  
  let prioritizedRecipes = allRecipes;
  let matchSource = 'standard';
  
  if (pantryItems && pantryItems.length > 0) {
    console.log(`   ✅ Found ${pantryItems.length} pantry items`);
    const pantryIngredientIds = pantryItems.map(p => p.ingredient_id).filter(Boolean);
    
    if (pantryIngredientIds.length > 0) {
      try {
        const { data: matches, error: rpcError } = await supabase.rpc('find_recipes_with_pantry_items', {
          pantry_ids: pantryIngredientIds
        });
        
        if (!rpcError && matches && matches.length > 0) {
          const matchedIds = new Set(matches.map(m => m.id));
          const nonMatched = allRecipes.filter(r => !matchedIds.has(r.id));
          prioritizedRecipes = [...matches, ...nonMatched];
          matchSource = 'pantry-first';
          console.log(`   ✅ Found ${matches.length} recipes using pantry items\n`);
        } else {
          console.log('   ℹ️  No pantry matches found, using all recipes\n');
        }
      } catch (error) {
        console.log(`   ⚠️  Pantry matching failed: ${error.message}`);
        console.log('   ℹ️  Using standard recipe selection\n');
      }
    }
  } else {
    console.log('   ℹ️  No pantry items found, using standard selection\n');
  }
  
  // Step 3: Select meals with rotation
  console.log('3. Selecting meals...');
  const selectedMeals = selectMealsWithRotation(prioritizedRecipes, {
    count: 5,
    budget: budgetPerMeal * 5,
    servings
  });
  
  if (selectedMeals.length < 5) {
    console.log(`   ⚠️  Only found ${selectedMeals.length} meals (need 5)`);
    console.log('   💡 Consider increasing budget or adding more recipes\n');
  } else {
    console.log(`   ✅ Selected ${selectedMeals.length} meals\n`);
  }
  
  // Step 4: Build 7-day plan
  const weekPlan = [
    { dayOfWeek: 0, dayName: 'Sunday', recipeId: null, isOrderOutNight: true },
    { dayOfWeek: 1, dayName: 'Monday', recipeId: selectedMeals[0]?.id },
    { dayOfWeek: 2, dayName: 'Tuesday', recipeId: selectedMeals[1]?.id },
    { dayOfWeek: 3, dayName: 'Wednesday', recipeId: selectedMeals[2]?.id },
    { dayOfWeek: 4, dayName: 'Thursday', recipeId: selectedMeals[3]?.id },
    { dayOfWeek: 5, dayName: 'Friday', recipeId: selectedMeals[4]?.id },
    { dayOfWeek: 6, dayName: 'Saturday', recipeId: null, isLeftoverNight: true },
  ];
  
  // Step 5: Calculate total cost
  const totalCost = selectedMeals.reduce((sum, meal) => sum + (meal.total_cost || 0), 0);
  
  // Step 6: Display plan
  console.log('4. Meal Plan:');
  console.log('─'.repeat(80));
  weekPlan.forEach((day, index) => {
    if (day.isOrderOutNight) {
      console.log(`   ${day.dayName}: 🍕 Order Out`);
    } else if (day.isLeftoverNight) {
      console.log(`   ${day.dayName}: 🍽️  Leftovers`);
    } else {
      const meal = selectedMeals[index - 1];
      if (meal) {
        console.log(`   ${day.dayName}: ${meal.name}`);
        console.log(`            $${meal.total_cost?.toFixed(2)} ($${meal.cost_per_serving?.toFixed(2)}/serving) - ${meal.category}`);
      }
    }
  });
  console.log('─'.repeat(80));
  console.log(`\n💰 Total Cost: $${totalCost.toFixed(2)} / $${budget.toFixed(2)}`);
  console.log(`📊 Match Source: ${matchSource}\n`);
  
  // Step 7: Save to database
  console.log('5. Saving to database...');
  
  // Delete existing plan for this week first (to avoid duplicates)
  const { error: deleteError } = await supabase
    .from('meal_plans')
    .delete()
    .eq('week_start_date', weekStartDate);
  
  if (deleteError) {
    console.log(`   ⚠️  Warning: Could not delete existing plan: ${deleteError.message}`);
  }
  
  // Insert new plan
  const entries = weekPlan.map(meal => ({
    week_start_date: weekStartDate,
    day_of_week: meal.dayOfWeek,
    meal_type: 'dinner',
    recipe_id: meal.recipeId,
    is_leftover_night: meal.isLeftoverNight || false,
    is_order_out_night: meal.isOrderOutNight || false,
    status: 'planned'
  }));
  
  const { error: insertError } = await supabase.from('meal_plans').insert(entries);
  
  if (insertError) {
    console.error(`❌ Error saving meal plan: ${insertError.message}`);
    process.exit(1);
  }
  
  console.log('   ✅ Meal plan saved successfully!\n');
  console.log('🎉 Your meal plan is now visible in the app!');
  console.log(`   Run: npm run dev`);
  console.log(`   Then navigate to the meal plan page\n`);
}

generateMealPlan().catch(error => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});

