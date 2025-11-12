import { supabase } from '../lib/supabase';

export async function generateWeeklyMealPlan(options) {
  const {
    budget = 100,
    servings = 4,
    weekStartDate,
    pantryItems = [],
    usePantryFirst = true
  } = options;
  
  const budgetPerMeal = budget / 7;
  
  // Get all available recipes within budget
  // Filter out recipes without costs
  let { data: allRecipes, error: recipesError } = await supabase
    .from('recipes')
    .select('*')
    .lte('cost_per_serving', budgetPerMeal / servings)
    .not('total_cost', 'is', null)
    .not('cost_per_serving', 'is', null);
  
  if (recipesError) {
    throw new Error(`Failed to load recipes: ${recipesError.message}`);
  }
  
  if (!allRecipes) allRecipes = [];
  
  // Additional filter to ensure recipes have valid costs
  allRecipes = allRecipes.filter(r => r.total_cost > 0 && r.cost_per_serving > 0);
  
  if (allRecipes.length === 0) {
    throw new Error('No recipes available within budget. Please add more recipes or increase your budget.');
  }
  
  // If pantry items provided, prioritize matching recipes
  let prioritizedRecipes = allRecipes;
  let matchSource = 'standard';
  
  if (usePantryFirst && pantryItems.length > 0) {
    try {
      const pantryIngredientIds = pantryItems.map(item => item.id || item.ingredient_id).filter(Boolean);
      
      if (pantryIngredientIds.length > 0) {
        const { data: matches, error: rpcError } = await supabase.rpc('find_recipes_with_pantry_items', {
          pantry_ids: pantryIngredientIds
        });
        
        if (rpcError) {
          // RPC function might not exist or failed - fallback to standard selection
          console.warn('Pantry matching RPC failed, using standard selection:', rpcError.message);
          matchSource = 'standard';
        } else if (matches && matches.length > 0) {
          const matchedIds = new Set(matches.map(m => m.id));
          const nonMatched = allRecipes.filter(r => !matchedIds.has(r.id));
          prioritizedRecipes = [...matches, ...nonMatched];
          matchSource = 'rule-based';
        } else {
          // No matches found, use all recipes
          matchSource = 'standard';
        }
      }
    } catch (error) {
      console.error('Error finding pantry matches:', error);
      // Fallback to standard selection on any error
      matchSource = 'standard';
    }
  }
  
  // Apply protein rotation and budget constraints
  const selectedMeals = selectMealsWithRotation(prioritizedRecipes, {
    count: 5,
    budget: budgetPerMeal * 5,
    servings
  });
  
  // Build 7-day plan
  const weekPlan = [
    { dayOfWeek: 0, dayName: 'Sunday', recipeId: null, isOrderOutNight: true },
    { dayOfWeek: 1, dayName: 'Monday', recipeId: selectedMeals[0]?.id },
    { dayOfWeek: 2, dayName: 'Tuesday', recipeId: selectedMeals[1]?.id },
    { dayOfWeek: 3, dayName: 'Wednesday', recipeId: selectedMeals[2]?.id },
    { dayOfWeek: 4, dayName: 'Thursday', recipeId: selectedMeals[3]?.id },
    { dayOfWeek: 5, dayName: 'Friday', recipeId: selectedMeals[4]?.id },
    { dayOfWeek: 6, dayName: 'Saturday', recipeId: null, isLeftoverNight: true },
  ];
  
  // Calculate total cost
  const totalCost = selectedMeals.reduce((sum, meal) => sum + (meal.total_cost || 0), 0);
  
  // Save to database
  const entries = weekPlan.map(meal => ({
    week_start_date: weekStartDate,
    day_of_week: meal.dayOfWeek,
    meal_type: 'dinner',
    recipe_id: meal.recipeId,
    is_leftover_night: meal.isLeftoverNight || false,
    is_order_out_night: meal.isOrderOutNight || false,
    status: 'planned'
  }));
  
  // Delete existing plan for this week first (to avoid duplicates)
  await supabase
    .from('meal_plans')
    .delete()
    .eq('week_start_date', weekStartDate);
  
  // Insert new plan
  const { error: insertError } = await supabase.from('meal_plans').insert(entries);
  
  if (insertError) {
    throw new Error(`Failed to save meal plan: ${insertError.message}`);
  }
  
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
