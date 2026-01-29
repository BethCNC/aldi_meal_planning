import { z } from 'zod';
import { createMealPlan } from '../services/mealPlanService.js'; // New import for the service

// Request Schema
const generateSchema = z.object({
  day_count: z.number().int().min(1).max(14).default(7),
  user_id: z.string().uuid().optional(),
  budget: z.number().positive().optional(),
  sensory_preferences: z.object({
    avoid_texture: z.string().optional()
  }).optional()
});

export async function generatePlan(req, res) {
  try {
    // 1. Validate Request
    const validated = generateSchema.parse(req.body);

    // 2. Call the new meal plan service
    const result = await createMealPlan(validated);

    // 3. Send the response
    res.json(result);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ status: 'error', message: 'Invalid input', details: error.errors });
    }
    console.error('Plan Generation Error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
}

