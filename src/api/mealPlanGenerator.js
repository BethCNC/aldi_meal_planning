import { supabase } from '../lib/supabase';
import { generateAIWeeklyPlan } from './ai/plannerAgent';

/**
 * Generates a weekly meal plan with optimized logic for variety, waste reduction, and freshness.
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} - Generated plan details
 */
export async function generateWeeklyMealPlan(options) {
  // Optional: Use advanced AI Planner if requested
  if (options.useAI) {
    console.log('🤖 Using Advanced AI Meal Planner...');
    try {
      return await generateAIWeeklyPlan(options);
    } catch (error) {
      console.error('AI Planner failed, falling back to standard logic:', error);
      // Fallback to standard logic below
    }
  }

  const {
    budget = 100,
    servings = 4,
    weekStartDate,
    pantryItems = [],
    usePantryFirst = true
  } = options;
  
  const budgetPerMeal = budget / 7;
  
  // 1. Fetch Recipes with Ingredients for Overlap Calculation
  let { data: allRecipes, error: recipesError } = await supabase
    .from('recipes')
    .select('*, recipe_ingredients(ingredient_id)')
    .lte('cost_per_serving', budgetPerMeal / servings)
    .not('total_cost', 'is', null)
    .not('cost_per_serving', 'is', null);
  
  if (recipesError) {
    throw new Error(`Failed to load recipes: ${recipesError.message}`);
  }
  
  if (!allRecipes) allRecipes = [];
  
  // Filter valid costs and appropriate categories
  allRecipes = allRecipes.filter(r => {
    const hasCost = r.total_cost > 0 && r.cost_per_serving > 0;
    const invalidCategories = ['Dessert', 'Breakfast', 'Snack', 'Side', 'Beverage'];
    const isDinnerAppropriate = !invalidCategories.includes(r.category);
    return hasCost && isDinnerAppropriate;
  });
  
  if (allRecipes.length === 0) {
    throw new Error('No recipes available within budget. Please add more recipes or increase your budget.');
  }
  
  // 2. Prioritize Pantry Items (Base Scoring)
  // We'll assign a base score to every recipe.
  // Default score = Random(0-10) for variety
  // Pantry Match = +50
  
  const recipeScores = new Map();
  const pantryIds = new Set(pantryItems.map(i => i.id || i.ingredient_id));
  
  // Initialize scores with random noise for freshness
  allRecipes.forEach(recipe => {
    // Higher randomness = more variety between generations
    const baseRandom = Math.random() * 20; 
    recipeScores.set(recipe.id, baseRandom);
  });

  // Apply Pantry Bonus
  if (usePantryFirst && pantryIds.size > 0) {
    try {
      const { data: matches } = await supabase.rpc('find_recipes_with_pantry_items', {
        pantry_ids: Array.from(pantryIds)
      });
      
      if (matches) {
        matches.forEach(match => {
          const currentScore = recipeScores.get(match.id) || 0;
          // Boost score significantly for pantry matches
          recipeScores.set(match.id, currentScore + 50 + (match.match_percentage || 0));
        });
      }
    } catch (err) {
      console.warn('Pantry matching failed, skipping pantry boost', err);
    }
  }

  // 3. Select Meals with Smart Logic
  // We need 4 meals (Mon, Tue, Thu, Sat). 
  // Wed, Fri, Sun are Leftovers.
  
  const selectedMeals = [];
  const usedProteins = [];
  let remainingBudget = budget; 
  
  // Helper to get ingredient set for a recipe
  const getIngredients = (r) => new Set((r.recipe_ingredients || []).map(ri => ri.ingredient_id));
  
  // Track ingredients used in SELECTED meals to boost overlap
  const usedIngredients = new Set();

  for (let i = 0; i < 4; i++) {
    // Filter valid candidates
    const candidates = allRecipes.filter(r => !selectedMeals.find(s => s.id === r.id));
    
    let bestCandidate = null;
    let bestScore = -Infinity;
    
    for (const candidate of candidates) {
      let score = recipeScores.get(candidate.id);
      
      // Constraint: Budget
      if (candidate.total_cost > (remainingBudget / (4 - i)) * 1.5) {
        score -= 100; 
      }
      if (candidate.total_cost > remainingBudget) {
        continue; 
      }

      // Constraint: Protein Variety
      const protein = candidate.category;
      const recentProteins = usedProteins.slice(-2); 
      if (recentProteins.includes(protein)) {
        score -= 50; 
      }
      const proteinCount = usedProteins.filter(p => p === protein).length;
      if (proteinCount >= 2) {
        score -= 30; 
      }
      
      // Bonus: Ingredient Overlap
      if (usedIngredients.size > 0) {
        const candidateIngredients = getIngredients(candidate);
        let overlapCount = 0;
        candidateIngredients.forEach(id => {
          if (usedIngredients.has(id)) overlapCount++;
        });
        score += (overlapCount * 5); 
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestCandidate = candidate;
      }
    }
    
    if (bestCandidate) {
      selectedMeals.push(bestCandidate);
      usedProteins.push(bestCandidate.category);
      remainingBudget -= bestCandidate.total_cost;
      
      const ings = getIngredients(bestCandidate);
      ings.forEach(id => usedIngredients.add(id));
    }
  }
  
  // 4. Build Plan Structure (Custom Schedule)
  // Mon/Tue/Thu/Sat = Cook
  // Wed/Fri/Sun = Leftovers
  const weekPlan = [
    { dayOfWeek: 0, dayName: 'Sunday', recipeId: null, isLeftoverNight: true },
    { dayOfWeek: 1, dayName: 'Monday', recipeId: selectedMeals[0]?.id },
    { dayOfWeek: 2, dayName: 'Tuesday', recipeId: selectedMeals[1]?.id },
    { dayOfWeek: 3, dayName: 'Wednesday', recipeId: null, isLeftoverNight: true },
    { dayOfWeek: 4, dayName: 'Thursday', recipeId: selectedMeals[2]?.id },
    { dayOfWeek: 5, dayName: 'Friday', recipeId: null, isLeftoverNight: true },
    { dayOfWeek: 6, dayName: 'Saturday', recipeId: selectedMeals[3]?.id },
  ];
  
  // 5. Save & Return
  const totalCost = selectedMeals.reduce((sum, meal) => sum + (meal.total_cost || 0), 0);
  
  // Get current user ID
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated to create meal plans');
  }
  
  const entries = weekPlan.map(meal => ({
    user_id: user.id,
    week_start_date: weekStartDate,
    day_of_week: meal.dayOfWeek,
    meal_type: 'dinner',
    recipe_id: meal.recipeId,
    is_leftover_night: meal.isLeftoverNight || false,
    is_order_out_night: meal.isOrderOutNight || false,
    status: 'planned'
  }));
  
  // Clean up old plan (only for current user)
  await supabase
    .from('meal_plans')
    .delete()
    .eq('week_start_date', weekStartDate)
    .eq('user_id', user.id);
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
    matchSource: 'smart-scoring'
  };
}
