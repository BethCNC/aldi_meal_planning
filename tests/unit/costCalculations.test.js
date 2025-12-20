import { computeRecipeCost } from '../../src/api/recipeCostCalculator.js';

// Mock helpers are not needed if computeRecipeCost is pure or uses injected dependencies.
// However, computeRecipeCost imports `calculateIngredientCost` from utils.
// Jest will use the real implementation by default which is fine for unit tests.

describe('Cost Calculations', () => {
  test('computes total cost and per serving cost correctly', () => {
    const recipe = {
      servings: 4
    };

    const ingredients = [
      {
        calculated_cost: 5.00
      },
      {
        calculated_cost: 3.50
      }
    ];

    const result = computeRecipeCost(recipe, ingredients);

    expect(result.totalCost).toBe(8.50);
    expect(result.costPerServing).toBe(2.13); // 8.5 / 4 = 2.125 -> round to 2.13
  });

  test('handles missing costs gracefully', () => {
    const recipe = { servings: 2 };
    const ingredients = [
      { calculated_cost: null }, // Should be 0
      { calculated_cost: 10 }
    ];

    const result = computeRecipeCost(recipe, ingredients);
    expect(result.totalCost).toBe(10);
    expect(result.costPerServing).toBe(5);
  });

  test('calculates cost dynamically if calculated_cost is missing but ingredient data exists', () => {
    // This tests the integration with calculateIngredientCost logic inside computeRecipeCost
    const recipe = { servings: 1 };
    const ingredients = [
      {
        quantity: 1,
        unit: 'lb',
        calculated_cost: null,
        ingredient: {
          price_per_package: 5.00,
          package_size: 1,
          package_unit: 'lb'
        }
      }
    ];

    const result = computeRecipeCost(recipe, ingredients);
    expect(result.totalCost).toBe(5.00);
  });
});

