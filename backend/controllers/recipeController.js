// backend/controllers/recipeController.js
import { z } from 'zod';
import { updateRecipeRating } from '../supabase/recipeClient.js';

// Schema for validating the rating request
const ratingSchema = z.object({
  id: z.string().uuid(), // From URL params
  rating: z.number().min(1).max(5), // From request body
});

export async function rateRecipe(req, res) {
  try {
    // 1. Validate the request data
    const { id } = req.params;
    const { rating } = req.body;
    
    const validation = ratingSchema.safeParse({ id, rating });

    if (!validation.success) {
      return res.status(400).json({ status: 'error', message: 'Invalid input', details: validation.error.errors });
    }

    // 2. Call the Supabase client to update the rating
    // Note: We need to implement a more sophisticated rating system later (e.g., averaging user ratings).
    // For now, we will just overwrite the rating column with the new value.
    const updatedRecipe = await updateRecipeRating(id, rating);

    if (!updatedRecipe) {
      return res.status(404).json({ status: 'error', message: 'Recipe not found' });
    }

    // 3. Send a success response
    res.json({
      status: 'success',
      message: 'Recipe rating updated successfully.',
      data: updatedRecipe
    });

  } catch (error) {
    if (error instanceof z.ZodError) { // This is now handled by safeParse, but good for safety
      return res.status(400).json({ status: 'error', message: 'Invalid input', details: error.errors });
    }
    console.error('Recipe Rating Error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
}
