import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Mock DB client first
jest.unstable_mockModule('../../backend/supabase/client.js', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// Mock other dependencies
jest.unstable_mockModule('../../backend/ai/agents/mealPlanningAgent.js', () => ({
  selectRecipes: jest.fn(),
}));
jest.unstable_mockModule('../../backend/services/fallbackMealPlan.js', () => ({
  generateFallbackPlan: jest.fn(),
}));
jest.unstable_mockModule('../../backend/supabase/recipeClient.js', () => ({
  getRecipeById: jest.fn(),
  getRecipeIngredients: jest.fn(), // If needed by priceCalculator
}));
jest.unstable_mockModule('../../backend/supabase/ingredientClient.js', () => ({
  getIngredientById: jest.fn(),
}));
jest.unstable_mockModule('../../backend/supabase/userHistoryClient.js', () => ({
  addToHistory: jest.fn(),
  getRecentRecipeIds: jest.fn(),
}));

// Dynamic imports to ensure mocks apply
const planRoutes = (await import('../../backend/routes/planRoutes.js')).default;
const { selectRecipes } = await import('../../backend/ai/agents/mealPlanningAgent.js');
const { getRecipeById, getRecipeIngredients } = await import('../../backend/supabase/recipeClient.js');

const app = express();
app.use(express.json());
app.use('/api/v1/plan', planRoutes);

describe('POST /api/v1/plan/generate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should generate a meal plan successfully', async () => {
    // Mock AI response
    selectRecipes.mockResolvedValue(['r1', 'r2']);

    // Mock DB responses
    getRecipeById.mockImplementation((id) => Promise.resolve({
      id,
      name: `Recipe ${id}`,
      costPerServing: 5.00,
      imageUrl: 'http://example.com/img.jpg',
      proteinCategory: 'beef',
      textureProfile: 'chewy',
      prepEffortLevel: 'medium'
    }));

    // Mock recipe ingredients for price calc
    getRecipeIngredients.mockResolvedValue([
      { 
        ingredient_id: 'i1', 
        quantity: 1, 
        unit: 'lb',
        ingredient: { 
          id: 'i1', 
          item: 'Beef', 
          category: 'Meat', 
          packageSize: 1, 
          packageUnit: 'lb', 
          aldiPriceCents: 500 
        } 
      }
    ]);

    const res = await request(app)
      .post('/api/v1/plan/generate')
      .send({
        day_count: 2,
        user_id: '00000000-0000-0000-0000-000000000000'
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.meta.generated_by).toBe('gemini-1.5-pro');
    expect(res.body.plan).toHaveLength(2);
    expect(res.body.plan[0].recipe.title).toBe('Recipe r1');
    expect(res.body.grocery_list).toHaveProperty('Meat');
  });

  it('should return 400 for invalid input', async () => {
    const res = await request(app)
      .post('/api/v1/plan/generate')
      .send({
        day_count: 20 // Max is 14
      });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
  });
});
