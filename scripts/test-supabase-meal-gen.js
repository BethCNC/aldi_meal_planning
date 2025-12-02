import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function generateTestPlan() {
  console.log('🧪 Testing Meal Plan Generation Logic...');
  
  const options = {
    budget: 100,
    servings: 4,
    weekStartDate: '2025-02-03', // Next Monday
    usePantryFirst: true
  };

  const budgetPerMeal = options.budget / 7;
  console.log(`💰 Budget per meal: $${budgetPerMeal.toFixed(2)} (Total: $${options.budget})`);

  // 1. Fetch Recipes
  let { data: allRecipes, error } = await supabase
    .from('recipes')
    .select('*')
    .lte('cost_per_serving', budgetPerMeal / options.servings)
    .not('total_cost', 'is', null)
    .not('cost_per_serving', 'is', null);

  if (error) {
    console.error('❌ Error fetching recipes:', error);
    return;
  }

  // Filter valid costs
  allRecipes = allRecipes.filter(r => r.total_cost > 0 && r.cost_per_serving > 0);
  console.log(`📚 Found ${allRecipes.length} candidate recipes within budget.`);

  if (allRecipes.length === 0) {
    console.error('❌ No recipes found! Check cost calculations.');
    return;
  }

  // 2. Simulate Pantry (Optional)
  // Fetch some ingredients to simulate pantry items
  const { data: sampleIngredients } = await supabase.from('ingredients').select('id').limit(5);
  const pantryItems = sampleIngredients.map(i => ({ ingredient_id: i.id }));
  
  console.log(`🥫 Simulating ${pantryItems.length} pantry items...`);

  let prioritizedRecipes = allRecipes;
  let matchSource = 'standard';

  if (options.usePantryFirst && pantryItems.length > 0) {
    const pantryIds = pantryItems.map(i => i.ingredient_id);
    const { data: matches, error: rpcError } = await supabase.rpc('find_recipes_with_pantry_items', {
      pantry_ids: pantryIds
    });

    if (rpcError) {
      console.warn('⚠️ RPC Error:', rpcError.message);
    } else if (matches && matches.length > 0) {
      console.log(`✨ Found ${matches.length} recipes matching pantry items.`);
      const matchedIds = new Set(matches.map(m => m.id));
      const nonMatched = allRecipes.filter(r => !matchedIds.has(r.id));
      prioritizedRecipes = [...matches, ...nonMatched];
      matchSource = 'rule-based';
    } else {
      console.log('ℹ️ No recipes matched pantry items.');
    }
  }

  // 3. Selection Logic
  const selectedMeals = selectMealsWithRotation(prioritizedRecipes, {
    count: 5,
    budget: budgetPerMeal * 5,
    servings: options.servings
  });

  console.log('\n🍽️  Selected Meals:');
  selectedMeals.forEach((m, i) => {
    console.log(`   ${i + 1}. ${m.name} ($${m.total_cost.toFixed(2)}) - ${m.category}`);
  });

  const totalCost = selectedMeals.reduce((sum, m) => sum + (m.total_cost || 0), 0);
  console.log(`\n💵 Total Cost: $${totalCost.toFixed(2)}`);
  console.log(`✅ Within Budget: ${totalCost <= options.budget}`);

  if (selectedMeals.length < 5) {
    console.error(`❌ Failed to fill 5 slots! Only got ${selectedMeals.length}.`);
    console.log('   Possible causes: Strict budget per meal, protein rotation constraints, or insufficient recipe variety.');
  }
}

function selectMealsWithRotation(recipes, options) {
  const selected = [];
  const usedProteins = [];
  let remainingBudget = options.budget;
  
  // Debugging pool
  // console.log('Selection Pool Size:', recipes.length);

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

generateTestPlan();

