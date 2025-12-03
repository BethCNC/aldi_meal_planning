import { getRecipes } from '../supabase/recipeClient.js';
import { findBestRecipes } from './recipeMatching.js';
import { createMealPlan } from '../supabase/mealPlanClient.js';

export async function generateWeeklyMealPlan(options) {
  const {
    budget = 100,
    servings = 4,
    weekStartDate,
    pantryItems = [],
    usePantryFirst = true
  } = options;
  
  const budgetPerMeal = budget / 7;
  
  // Step 1: Get all available recipes within budget
  const allRecipes = await getRecipes({
    maxCostPerServing: budgetPerMeal / servings
  });
  
  // Step 2: If pantry items provided, prioritize matching recipes
  let prioritizedRecipes = allRecipes;
  let matchSource = 'standard';
  
  if (usePantryFirst && pantryItems.length > 0) {
    const { matches, source } = await findBestRecipes(pantryItems, options);
    
    // Put pantry-matched recipes first, then fill with others
    const matchedIds = new Set(matches.map(m => m.id));
    const nonMatched = allRecipes.filter(r => !matchedIds.has(r.id));
    prioritizedRecipes = [...matches, ...nonMatched];
    matchSource = source;
    
    console.log(`Using ${source} matching: ${matches.length} pantry-friendly recipes`);
  }
  
  // Step 3: Apply protein rotation and budget constraints
  // We need 4 meals for Mon/Tue/Thu/Sat (Wed/Fri/Sun are leftover nights)
  const selectedMeals = selectMealsWithRotation(prioritizedRecipes, {
    count: 4,
    budget: budgetPerMeal * 4, // 4 cooking nights
    servings
  });
  
  // Step 4: Build 7-day plan
  // Schedule: Mon/Tue/Thu/Sat = Cook, Wed/Fri/Sun = Leftovers
  const weekPlan = [
    { dayOfWeek: 0, dayName: 'Sunday', recipeId: null, isLeftoverNight: true },
    { dayOfWeek: 1, dayName: 'Monday', recipeId: selectedMeals[0]?.id },
    { dayOfWeek: 2, dayName: 'Tuesday', recipeId: selectedMeals[1]?.id },
    { dayOfWeek: 3, dayName: 'Wednesday', recipeId: null, isLeftoverNight: true },
    { dayOfWeek: 4, dayName: 'Thursday', recipeId: selectedMeals[2]?.id },
    { dayOfWeek: 5, dayName: 'Friday', recipeId: null, isLeftoverNight: true },
    { dayOfWeek: 6, dayName: 'Saturday', recipeId: selectedMeals[3]?.id },
  ];
  
  // Step 5: Calculate total cost
  const totalCost = selectedMeals.reduce((sum, meal) => sum + (meal.total_cost || 0), 0);
  
  // Step 6: Save to database
  await createMealPlan(weekStartDate, weekPlan);
  
  return {
    weekStartDate,
    days: weekPlan.map((day, index) => ({
      ...day,
      recipe: selectedMeals[index] || null
    })),
    totalCost,
    budget,
    underBudget: totalCost <= budget,
    matchSource
  };
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
      const notAlreadySelected = !selected.includes(recipe);
      
      return fitsBudget && noRecentRepeat && notAlreadySelected;
    });
    
    if (candidate) {
      selected.push(candidate);
      usedProteins.push(candidate.category);
      remainingBudget -= (candidate.total_cost || 0);
    }
  }
  
  return selected;
}
