import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function generateSmartPlan(weekNum) {
  const options = {
    budget: 100,
    servings: 4
  };
  const budgetPerMeal = options.budget / 7;

  // 1. Fetch Recipes
  let { data: allRecipes } = await supabase
    .from('recipes')
    .select('*, recipe_ingredients(ingredient_id)')
    .lte('cost_per_serving', budgetPerMeal / options.servings)
    .not('total_cost', 'is', null)
    .not('cost_per_serving', 'is', null);

  // Filter valid costs and appropriate categories
  allRecipes = (allRecipes || []).filter(r => {
    const hasCost = r.total_cost > 0 && r.cost_per_serving > 0;
    const invalidCategories = ['Dessert', 'Breakfast', 'Snack', 'Side', 'Beverage'];
    const isDinnerAppropriate = !invalidCategories.includes(r.category);
    return hasCost && isDinnerAppropriate;
  });

  // 2. Scoring Setup
  const recipeScores = new Map();
  
  // Random Noise (0-20)
  allRecipes.forEach(recipe => {
    recipeScores.set(recipe.id, Math.random() * 20);
  });

  // 3. Selection
  const selectedMeals = [];
  const usedProteins = [];
  let remainingBudget = options.budget;
  const usedIngredients = new Set();

  const getIngredients = (r) => new Set((r.recipe_ingredients || []).map(ri => ri.ingredient_id));

  for (let i = 0; i < 4; i++) {
    const candidates = allRecipes.filter(r => !selectedMeals.find(s => s.id === r.id));
    let bestCandidate = null;
    let bestScore = -Infinity;

    for (const candidate of candidates) {
      let score = recipeScores.get(candidate.id);

      // Budget Penalty
      if (candidate.total_cost > (remainingBudget / (4 - i)) * 1.5) score -= 100;
      if (candidate.total_cost > remainingBudget) continue;

      // Protein Rotation
      const protein = candidate.category;
      const recentProteins = usedProteins.slice(-2);
      if (recentProteins.includes(protein)) score -= 50;
      const proteinCount = usedProteins.filter(p => p === protein).length;
      if (proteinCount >= 2) score -= 30;

      // Ingredient Overlap Bonus
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

  // Output
  console.log(`\n📅 WEEK ${weekNum} PLAN:`);
  console.log('------------------------------------------------');
  weekPlan.forEach(day => {
    if (day.isLeftoverNight) {
      console.log(`${day.dayName.padEnd(10)}: Leftovers / Order Out`);
    } else {
      const m = allRecipes.find(r => r.id === day.recipeId);
      if (m) {
        console.log(`${day.dayName.padEnd(10)}: ${m.name.padEnd(35)} | $${m.total_cost.toFixed(2)} | ${m.category}`);
      }
    }
  });
  const total = selectedMeals.reduce((sum, m) => sum + m.total_cost, 0);
  console.log('------------------------------------------------');
  console.log(`Total: $${total.toFixed(2)} | Proteins: ${usedProteins.join(', ')}`);
}

async function runSimulation() {
  console.log('🤖 Simulating 5 Weeks of Smart Meal Planning...\n');
  for (let i = 1; i <= 5; i++) {
    await generateSmartPlan(i);
  }
}

runSimulation();

