// backend/services/budgetEnforcer.js

/**
 * Enforces a budget constraint on a list of selected recipes.
 * If the current plan is over budget, it attempts to swap expensive recipes
 * with cheaper alternatives from the full recipe catalog.
 *
 * @param {Array<Object>} selectedRecipes - Array of full recipe objects currently in the plan.
 * @param {Array<Object>} allRecipes - Full catalog of all available recipe objects.
 * @param {number} budget - The target budget.
 * @returns {Array<Object>} An array of recipe objects that are within budget (or the closest possible).
 */
export function enforceBudget(selectedRecipes, allRecipes, budget) {
  let currentTotalCost = selectedRecipes.reduce((sum, r) => sum + (r.totalCost || 0), 0);
  console.log(`
💰 [Budget Enforcer] Initial plan cost: $${currentTotalCost.toFixed(2)} vs Budget: $${budget.toFixed(2)}`);

  if (currentTotalCost <= budget) {
    console.log('💰 [Budget Enforcer] Plan is already within budget.');
    return selectedRecipes;
  }

  console.log('💰 [Budget Enforcer] Plan is over budget. Attempting to swap recipes...');

  let plan = [...selectedRecipes];
  let availableCheaperRecipes = allRecipes
    .filter(r => !plan.some(p => p.id === r.id)) // Exclude recipes already in plan
    .sort((a, b) => (a.totalCost || 0) - (b.totalCost || 0)); // Sort by cost, cheapest first

  // Loop to try and bring the plan within budget
  while (currentTotalCost > budget && plan.length > 0) {
    // Find the most expensive recipe in the current plan
    const mostExpensiveInPlan = plan.reduce((max, r) => (r.totalCost || 0) > (max.totalCost || 0) ? r : max, { totalCost: -1 });

    // If no expensive recipe found (e.g., all costs are 0) or no more cheaper alternatives
    if (!mostExpensiveInPlan || (mostExpensiveInPlan.totalCost || 0) === 0) {
      console.warn('💰 [Budget Enforcer] Could not find a suitable recipe to swap or no more cheaper options.');
      break;
    }

    // Find a cheaper replacement that is not already in the plan
    const cheaperReplacementIndex = availableCheaperRecipes.findIndex(
      r => (r.totalCost || 0) < (mostExpensiveInPlan.totalCost || 0)
    );

    if (cheaperReplacementIndex === -1) {
      console.warn('💰 [Budget Enforcer] No cheaper replacement found for the most expensive recipe.');
      break; // No suitable cheaper replacements available
    }

    const replacement = availableCheaperRecipes[cheaperReplacementIndex];
    availableCheaperRecipes.splice(cheaperReplacementIndex, 1); // Remove replacement from available pool

    // Swap the recipe
    plan = plan.map(r => (r.id === mostExpensiveInPlan.id ? replacement : r));
    currentTotalCost = plan.reduce((sum, r) => sum + (r.totalCost || 0), 0);

    console.log(`💰 [Budget Enforcer] Swapped '${mostExpensiveInPlan.name}' for '${replacement.name}'. New cost: $${currentTotalCost.toFixed(2)}`);
  }

  if (currentTotalCost > budget) {
    console.warn(`💰 [Budget Enforcer] Final plan still over budget: $${currentTotalCost.toFixed(2)}`);
  } else {
    console.log(`💰 [Budget Enforcer] Final plan within budget: $${currentTotalCost.toFixed(2)}`);
  }

  return plan;
}
