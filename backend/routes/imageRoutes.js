import express from 'express';
import { fetchImageFromUrl, generateImage, fetchStockImage } from '../services/imageService.js';

const router = express.Router();

// GET /api/v1/images/extract?url=...
router.get('/extract', async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  try {
    const imageUrl = await fetchImageFromUrl(url);
    if (imageUrl) {
      res.json({ imageUrl });
    } else {
      res.status(404).json({ error: 'No image found on the provided URL' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to extract image' });
  }
});

// POST /api/v1/images/generate
router.post('/generate', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt parameter' });
  }

  try {
    // Generate an image URL (using Pollinations.ai or Gemini fallback)
    const imageUrl = await generateImage(prompt);
    res.json({ imageUrl });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate image' });
  }
});

// GET /api/v1/images/stock?query=...
router.get('/stock', async (req, res) => {
  const { query } = req.query;
  if (!query) {
    return res.status(400).json({ error: 'Missing query parameter' });
  }

  try {
    const imageUrl = await fetchStockImage(query);
    res.json({ imageUrl });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stock image' });
  }
});

export default router;
