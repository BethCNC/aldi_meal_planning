import express from 'express';
import { getUserPreferences, upsertUserPreferences } from '../supabase/preferencesClient.js';

const router = express.Router();

// GET /api/v1/preferences?user_id=...
router.get('/', async (req, res) => {
  try {
    const userId = req.query.user_id || 'default';
    const prefs = await getUserPreferences(userId);
    res.json({ preferences: prefs });
  } catch (err) {
    console.error('Failed to load preferences:', err);
    res.status(500).json({ error: 'Failed to load preferences' });
  }
});

// POST /api/v1/preferences
// Body: { user_id, likes: [], dislikes: [], exclusions: [] }
router.post('/', async (req, res) => {
  try {
    const { user_id: userId = 'default', likes = [], dislikes = [], exclusions = [] } = req.body;

    const payload = {
      liked_ingredients: Array.isArray(likes) ? likes : (String(likes).split(',').map(s=>s.trim()).filter(Boolean)),
      disliked_ingredients: Array.isArray(dislikes) ? dislikes : (String(dislikes).split(',').map(s=>s.trim()).filter(Boolean)),
      dietary_tags: Array.isArray(exclusions) ? exclusions : (String(exclusions).split(',').map(s=>s.trim()).filter(Boolean))
    };

    const saved = await upsertUserPreferences(payload, userId);
    res.json({ preferences: saved });
  } catch (err) {
    console.error('Failed to save preferences:', err);
    res.status(500).json({ error: 'Failed to save preferences' });
  }
});

export default router;
