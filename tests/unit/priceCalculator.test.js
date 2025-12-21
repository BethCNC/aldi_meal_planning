import { jest } from '@jest/globals';

// Mock client.js BEFORE importing anything else that might use it
jest.unstable_mockModule('../../backend/supabase/client.js', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// Mock other dependencies
jest.unstable_mockModule('../../backend/supabase/recipeClient.js', () => ({
  getRecipeIngredients: jest.fn(),
}));
jest.unstable_mockModule('../../backend/supabase/ingredientClient.js', () => ({
  getIngredientById: jest.fn(),
}));
jest.unstable_mockModule('../../backend/utils/unitConversions.js', () => ({
  convertUnit: (qty, from, to) => {
    if (from === 'oz' && to === 'lb') return qty / 16;
    if (from === 'lb' && to === 'oz') return qty * 16;
    return qty; // Identity
  }
}));

// Import the module under test using dynamic import to ensure mocks apply
const { calculateRecipeCost, calculatePlanCost, aggregateIngredients } = await import('../../backend/services/priceCalculator.js');
const { getRecipeIngredients } = await import('../../backend/supabase/recipeClient.js');

describe('Price Calculator Service', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('aggregateIngredients', () => {
    it('should sum quantities for the same ingredient', async () => {
      const mockIngredient = { 
        id: 'ing-1', 
        item: 'Beans', 
        packageUnit: 'oz',
        packageSize: 16
      };

      getRecipeIngredients.mockResolvedValueOnce([
        { ingredient_id: 'ing-1', quantity: 10, unit: 'oz', ingredient: mockIngredient }
      ]);
      getRecipeIngredients.mockResolvedValueOnce([
        { ingredient_id: 'ing-1', quantity: 10, unit: 'oz', ingredient: mockIngredient }
      ]);

      const result = await aggregateIngredients(['r1', 'r2']);
      
      expect(result).toHaveLength(1);
      expect(result[0].totalQuantity).toBe(20);
      expect(result[0].unit).toBe('oz');
    });

    it('should convert units to package unit', async () => {
      const mockIngredient = { 
        id: 'ing-beef', 
        item: 'Ground Beef', 
        packageUnit: 'lb',
        packageSize: 1
      };

      // 1 lb + 16 oz (= 1 lb)
      getRecipeIngredients.mockResolvedValueOnce([
        { ingredient_id: 'ing-beef', quantity: 1, unit: 'lb', ingredient: mockIngredient }
      ]);
      getRecipeIngredients.mockResolvedValueOnce([
        { ingredient_id: 'ing-beef', quantity: 16, unit: 'oz', ingredient: mockIngredient }
      ]);

      const result = await aggregateIngredients(['r1', 'r2']);
      
      expect(result).toHaveLength(1);
      expect(result[0].totalQuantity).toBe(2); // 1 + 1
      expect(result[0].unit).toBe('lb');
    });
  });

  describe('calculatePlanCost', () => {
    it('should calculate total cost rounding up packages', async () => {
      const mockIngredient = { 
        id: 'ing-1', 
        item: 'Beans', 
        packageUnit: 'oz', 
        packageSize: 15,
        aldiPriceCents: 100 // $1.00
      };

      // Needs 20oz total (1.33 packages -> 2 packages -> $2.00)
      getRecipeIngredients.mockResolvedValueOnce([
        { ingredient_id: 'ing-1', quantity: 20, unit: 'oz', ingredient: mockIngredient }
      ]);

      const result = await calculatePlanCost(['r1']);
      
      expect(result.totalCost).toBe(2.00);
      expect(result.groceryList[0].packagesToBuy).toBe(2);
    });
  });
});
