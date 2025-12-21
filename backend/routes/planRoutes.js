import express from 'express';
import { generatePlan } from '../controllers/planController.js';

const router = express.Router();

router.post('/generate', generatePlan);

export default router;

