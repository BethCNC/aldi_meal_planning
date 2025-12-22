import { createMealPlan } from '../backend/services/mealPlanService.js';
import dotenv from 'dotenv';

dotenv.config();

async function test() {
  try {
    const result = await createMealPlan({
      day_count: 3,
      user_id: '00000000-0000-0000-0000-000000000000', // Mock UUID
      budget: 50
    });
    console.log('Plan Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error generating plan:', error);
  }
}

test();
