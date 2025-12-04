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
  
  // Get current user ID (needed for history and preferences)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated to create meal plans');
  }

  // Get user dietary preferences
  const { data: preferences } = await supabase
    .from('user_preferences')
    .select('dietary_restrictions')
    .eq('user_id', user.id)
    .maybeSingle();

  let dietaryRestrictions = null;
  if (preferences?.dietary_restrictions) {
    try {
      dietaryRestrictions = typeof preferences.dietary_restrictions === 'string' 
        ? JSON.parse(preferences.dietary_restrictions)
        : preferences.dietary_restrictions;
    } catch (e) {
      console.warn('Failed to parse dietary restrictions:', e);
    }
  }

  const chickenBreastOnly = dietaryRestrictions?.chicken_breast_only || dietaryRestrictions?.no_dark_meat_chicken;

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
    
    // Apply dietary restrictions: Filter out dark meat chicken recipes if preference is set
    if (chickenBreastOnly && r.category === 'Chicken') {
      const recipeName = (r.name || '').toLowerCase();
      const instructions = (r.instructions || '').toLowerCase();
      const hasDarkMeat = recipeName.includes('thigh') || recipeName.includes('drumstick') || 
                          recipeName.includes('leg') || recipeName.includes('wing') ||
                          instructions.includes('thigh') || instructions.includes('drumstick') ||
                          instructions.includes('leg') || instructions.includes('wing');
      
      if (hasDarkMeat) {
        console.log(`🚫 Filtered out recipe with dark meat: ${r.name}`);
        return false; // Exclude dark meat chicken recipes
      }
    }
    
    return hasCost && isDinnerAppropriate;
  });
  
  if (allRecipes.length === 0) {
    throw new Error('No recipes available within budget. Please add more recipes or increase your budget.');
  }
  
  // 2. Get Recipe Usage History (for variety tracking)
  // Query meal plans from last 4 weeks to avoid repeats
  
  const fourWeeksAgo = new Date(weekStartDate);
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  
  const { data: recentMealPlans } = await supabase
    .from('meal_plans')
    .select('recipe_id, week_start_date')
    .eq('user_id', user.id) // Only look at current user's history
    .gte('week_start_date', fourWeeksAgo.toISOString().split('T')[0])
    .lt('week_start_date', weekStartDate)
    .not('recipe_id', 'is', null);
  
  // Build map of recipe usage frequency (how many times used in last 4 weeks)
  const recipeUsageCount = new Map();
  const recipeLastUsed = new Map(); // Track most recent week used
  
  if (recentMealPlans) {
    recentMealPlans.forEach(plan => {
      const recipeId = plan.recipe_id;
      recipeUsageCount.set(recipeId, (recipeUsageCount.get(recipeId) || 0) + 1);
      // Track most recent week
      const currentLastUsed = recipeLastUsed.get(recipeId);
      if (!currentLastUsed || plan.week_start_date > currentLastUsed) {
        recipeLastUsed.set(recipeId, plan.week_start_date);
      }
    });
  }
  
  // 3. Prioritize Pantry Items (Base Scoring)
  // We'll assign a base score to every recipe.
  // Default score = Random(0-20) for variety
  // Pantry Match = +50
  // Variety Bonus = +30 for unused recipes, -50 for used last week
  
  const recipeScores = new Map();
  const pantryIds = new Set(pantryItems.map(i => i.id || i.ingredient_id));
  
  // Initialize scores with random noise for freshness
  allRecipes.forEach(recipe => {
    // Base random score for variety
    const baseRandom = Math.random() * 20; 
    let score = baseRandom;
    
    // Variety Intelligence: Penalize recently used recipes
    const usageCount = recipeUsageCount.get(recipe.id) || 0;
    const lastUsedWeek = recipeLastUsed.get(recipe.id);
    
    if (usageCount > 0) {
      // Calculate weeks since last use
      let weeksSinceLastUse = 999;
      if (lastUsedWeek) {
        const lastUsed = new Date(lastUsedWeek);
        const currentWeek = new Date(weekStartDate);
        weeksSinceLastUse = Math.floor((currentWeek - lastUsed) / (1000 * 60 * 60 * 24 * 7));
      }
      
      // Heavy penalty for recipes used last week
      if (weeksSinceLastUse === 0) {
        score -= 100; // Strongly avoid last week's recipes
      } else if (weeksSinceLastUse === 1) {
        score -= 50; // Moderate penalty for 2 weeks ago
      } else if (weeksSinceLastUse === 2) {
        score -= 20; // Light penalty for 3 weeks ago
      }
      
      // Additional penalty for high usage frequency
      if (usageCount >= 3) {
        score -= 30; // Used 3+ times in last 4 weeks
      } else if (usageCount === 2) {
        score -= 15; // Used twice
      }
    } else {
      // Bonus for recipes never used (or not used in last 4 weeks)
      score += 30; // Encourage trying new/forgotten recipes
    }
    
    recipeScores.set(recipe.id, score);
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

  // 4. Select Meals with Smart Logic
  // Fixed Schedule: Mon/Tue/Thu/Sat = Cook (4 meals), Wed/Fri/Sun = Leftovers (no cooking)
  
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

      // Constraint: Protein Variety (avoid same protein 2 days in a row)
      const protein = candidate.category;
      const recentProteins = usedProteins.slice(-2); 
      if (recentProteins.includes(protein)) {
        score -= 50; 
      }
      const proteinCount = usedProteins.filter(p => p === protein).length;
      if (proteinCount >= 2) {
        score -= 30; 
      }
      
      // Bonus: Ingredient Overlap (reduce waste by reusing ingredients)
      if (usedIngredients.size > 0) {
        const candidateIngredients = getIngredients(candidate);
        let overlapCount = 0;
        candidateIngredients.forEach(id => {
          if (usedIngredients.has(id)) overlapCount++;
        });
        score += (overlapCount * 5); 
      }
      
      // Additional Variety Intelligence: Check if recipe was used recently
      const wasUsedLastWeek = recipeLastUsed.get(candidate.id);
      if (wasUsedLastWeek) {
        const lastUsed = new Date(wasUsedLastWeek);
        const currentWeek = new Date(weekStartDate);
        const weeksSince = Math.floor((currentWeek - lastUsed) / (1000 * 60 * 60 * 24 * 7));
        
        // Extra penalty if used very recently (within scoring already done, but reinforce)
        if (weeksSince === 0) {
          score -= 200; // Absolutely avoid if used last week
        }
      }

      // Bonus: Prioritize newly added recipes (from this session or recently added)
      // Check if recipe name matches the new recipes we just added
      const newRecipeNames = [
        'Lemon Garlic Butter Chicken and Asparagus',
        'Copycat Crunchwraps',
        'Teriyaki Chicken and Crispy Brussel Sprout & Broccoli Bowls',
        'One Pot Creamy Cheesy Beef Pasta'
      ];
      if (newRecipeNames.some(name => candidate.name.includes(name) || name.includes(candidate.name))) {
        score += 100; // Big bonus for new recipes
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
  
  // 5. Build Plan Structure (Custom Schedule)
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
  
  // 6. Log Variety Intelligence Results
  const newRecipesCount = selectedMeals.filter(m => !recipeUsageCount.has(m.id)).length;
  const lastWeekRecipesCount = selectedMeals.filter(m => {
    const lastUsed = recipeLastUsed.get(m.id);
    if (!lastUsed) return false;
    const lastUsedDate = new Date(lastUsed);
    const currentWeekDate = new Date(weekStartDate);
    const weeksSince = Math.floor((currentWeekDate - lastUsedDate) / (1000 * 60 * 60 * 24 * 7));
    return weeksSince === 0;
  }).length;
  
  console.log('🎯 Variety Intelligence Results:');
  console.log(`   • New recipes this week: ${newRecipesCount}/4`);
  console.log(`   • Recipes from last week: ${lastWeekRecipesCount}/4 (avoided)`);
  console.log(`   • Recipes used in last 4 weeks: ${Array.from(recipeUsageCount.keys()).length} unique recipes`);
  
  // 7. Save & Return
  const totalCost = selectedMeals.reduce((sum, meal) => sum + (meal.total_cost || 0), 0);
  
  // User is already defined at the top of the function
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
  
  // Delete existing meal plans for this week and user first
  // This prevents unique constraint violations when inserting new plans
  const { error: deleteError } = await supabase
    .from('meal_plans')
    .delete()
    .eq('week_start_date', weekStartDate)
    .eq('user_id', user.id);
  
  if (deleteError) {
    console.warn('Warning: Failed to delete existing meal plans:', deleteError.message);
    // Continue anyway - upsert will handle conflicts
  }
  
  // Insert new meal plan entries
  // Using upsert as a fallback in case delete didn't catch everything
  const { error: insertError } = await supabase
    .from('meal_plans')
    .upsert(entries, {
      onConflict: 'user_id,week_start_date,day_of_week,meal_type'
    });
  
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
    matchSource: 'smart-scoring',
    varietyInfo: {
      recipesUsedLastWeek: Array.from(recipeUsageCount.keys()).length,
      newRecipesThisWeek: selectedMeals.filter(m => !recipeUsageCount.has(m.id)).length,
      totalRecipesAvailable: allRecipes.length
    }
  };
}

/**
 * Replaces a recipe in an existing meal plan with a new one.
 * @param {string} mealPlanId - The ID of the meal plan entry to update
 * @returns {Promise<Object>} - The new recipe object
 */
export async function replaceMealPlanRecipe(mealPlanId) {
  // 1. Get current meal plan entry details
  const { data: currentPlan, error: fetchError } = await supabase
    .from('meal_plans')
    .select('week_start_date, user_id, recipe_id')
    .eq('id', mealPlanId)
    .single();

  if (fetchError || !currentPlan) {
    throw new Error('Could not find meal plan entry');
  }

  // 2. Get all other recipes used in this week to avoid duplicates
  const { data: weekPlans } = await supabase
    .from('meal_plans')
    .select('recipe_id')
    .eq('week_start_date', currentPlan.week_start_date)
    .eq('user_id', currentPlan.user_id)
    .neq('id', mealPlanId); // Exclude current

  const usedRecipeIds = new Set(weekPlans?.map(p => p.recipe_id).filter(Boolean) || []);
  if (currentPlan.recipe_id) usedRecipeIds.add(currentPlan.recipe_id);

  // 3. Fetch potential replacement recipes
  // Limit to recipes with cost <= $15 (arbitrary budget guard) and not "Side", "Dessert", etc.
  const { data: candidates, error: candidateError } = await supabase
    .from('recipes')
    .select('*')
    .lte('total_cost', 15)
    .not('category', 'in', '("Side","Dessert","Beverage","Breakfast","Snack")')
    .not('total_cost', 'is', null);

  if (candidateError || !candidates) {
    throw new Error('Failed to fetch replacement candidates');
  }

  // 4. Filter out used recipes
  const validCandidates = candidates.filter(r => !usedRecipeIds.has(r.id));

  if (validCandidates.length === 0) {
    throw new Error('No other suitable recipes found to swap.');
  }

  // 5. Pick a random winner
  const randomIndex = Math.floor(Math.random() * validCandidates.length);
  const newRecipe = validCandidates[randomIndex];

  // 6. Update Meal Plan
  const { error: updateError } = await supabase
    .from('meal_plans')
    .update({ recipe_id: newRecipe.id })
    .eq('id', mealPlanId);

  if (updateError) {
    throw new Error('Failed to update meal plan with new recipe');
  }

  return newRecipe;
}
