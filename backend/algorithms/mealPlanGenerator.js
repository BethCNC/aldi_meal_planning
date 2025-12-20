import { getRecipes } from '../supabase/recipeClient.js';
import { findBestRecipes } from './recipeMatching.js';
import { createMealPlan } from '../supabase/mealPlanClient.js';
import { getUserRatings } from '../supabase/ratingClient.js';

export async function generateWeeklyMealPlan(options) {
  const {
    budget = 100,
    servings = 4,
    weekStartDate,
    pantryItems = [],
    usePantryFirst = true,
    userId
  } = options;
  
  const budgetPerMeal = budget / 7;

  // Fetch preferences (likes, dislikes, tags)
  let preferences = {};
  if (userId) {
    try {
      const { data } = await supabase
        .from('user_preferences')
        .select('liked_ingredients, disliked_ingredients, dietary_tags')
        .eq('user_id', userId)
        .single();
      preferences = data || {};
    } catch (e) {
      console.warn('Failed to fetch user preferences:', e);
    }
  }
  const { liked_ingredients: likes = [], disliked_ingredients: dislikes = [], dietary_tags: tags = [] } = preferences;

  // Fetch ratings if userId provided
  const ratingsMap = new Map();
  if (userId) {
    try {
      const ratings = await getUserRatings(userId);
      ratings.forEach(r => ratingsMap.set(r.recipe_id, r.rating));
    } catch (e) {
      console.warn('Failed to fetch ratings:', e);
    }
  }
  
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
  
  // Step 3: Apply protein rotation, budget constraints, and RATINGS/PREFERENCES
  // We need 4 meals for Mon/Tue/Thu/Sat (Wed/Fri/Sun are leftover nights)
  const selectedMeals = selectMealsWithRotation(prioritizedRecipes, {
    count: 4,
    budget: budgetPerMeal * 4, // 4 cooking nights
    servings,
    ratingsMap,
    preferences: { likes, dislikes, tags }
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
  if (userId) {
    await createMealPlan(weekStartDate, weekPlan, userId);
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
  const ratingsMap = options.ratingsMap || new Map();
  const { likes = [], dislikes = [], tags = [] } = options.preferences || {};
  
  // Helper to check for ingredient match
  const hasIngredient = (recipe, list) => {
    if (!list || list.length === 0) return false;
    const recipeText = JSON.stringify(recipe).toLowerCase();
    return list.some(item => recipeText.includes(item.toLowerCase()));
  };

  // Sort recipes by rating score first (descending)
  // This is a simple greedy approach. A weighted random choice would be better for variety.
  const scoredRecipes = recipes.map(r => {
    let score = 0;
    
    // Rating Score
    const rating = ratingsMap.get(r.id);
    if (rating) {
      if (rating === 5) score += 50;
      else if (rating === 4) score += 20;
      else if (rating <= 2) score -= 100;
    }
    
    // Preference Score
    if (hasIngredient(r, likes)) score += 30; // Boost liked items
    if (hasIngredient(r, dislikes)) score -= 1000; // Heavily penalize disliked items
    
    // Dietary Tags (Simple heuristic based on name/category/ingredients)
    // In a real app, recipes should have tags. Here we check text.
    if (tags.length > 0) {
      const recipeText = JSON.stringify(r).toLowerCase();
      // If user is Vegan/Vegetarian and recipe is Meat, penalize
      const isVeg = tags.some(t => ['vegan', 'vegetarian'].includes(t.toLowerCase()));
      const isMeat = ['Beef', 'Chicken', 'Pork', 'Seafood'].includes(r.category);
      if (isVeg && isMeat) score -= 1000;
    }

    // Add random factor for variety
    score += Math.random() * 10;
    return { ...r, _score: score };
  }).sort((a, b) => b._score - a._score);

  for (let i = 0; i < options.count; i++) {
    const candidate = scoredRecipes.find(recipe => {
      // Skip if score is too low (hard filter for dislikes/dietary)
      if (recipe._score < -500) return false;

      const cost = recipe.total_cost || 0;
      const protein = recipe.category;
      
      const fitsBudget = cost <= remainingBudget;
      const noRecentRepeat = !usedProteins.slice(-2).includes(protein);
      const notAlreadySelected = !selected.find(s => s.id === recipe.id);
      
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
