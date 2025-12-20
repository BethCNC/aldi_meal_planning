import express from 'express';
import { runWeeklyPlanGeneration } from '../backend/scheduled/weeklyPlanGenerator.js';
import { runPriceUpdate } from '../backend/scheduled/priceUpdater.js';

const router = express.Router();

// Middleware to verify cron secret (prevent unauthorized triggers)
const verifyCronSecret = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && (!authHeader || authHeader !== `Bearer ${cronSecret}`)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

router.post('/generate-plans', verifyCronSecret, async (req, res) => {
  try {
    // Run in background so we don't timeout the request
    runWeeklyPlanGeneration().catch(err => console.error('Background plan generation failed:', err));
    res.json({ message: 'Weekly plan generation started' });
  } catch (error) {
    console.error('Failed to trigger plan generation:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/update-prices', verifyCronSecret, async (req, res) => {
  try {
    runPriceUpdate().catch(err => console.error('Background price update failed:', err));
    res.json({ message: 'Price update started' });
  } catch (error) {
    console.error('Failed to trigger price update:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

