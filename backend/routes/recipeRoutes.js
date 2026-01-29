// backend/routes/recipeRoutes.js
import express from 'express';
import { rateRecipe } from '../controllers/recipeController.js';

const router = express.Router();

// Route to submit a rating for a recipe
// POST /api/v1/recipes/:id/rate
router.post('/:id/rate', rateRecipe);

export default router;
