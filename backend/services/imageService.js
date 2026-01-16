import { load as loadHtml } from 'cheerio';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// --- Helpers ---

const fetchHtml = async (url) => {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'AldiMealPlannerBot/1.0',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!response.ok) return null;
    return await response.text();
  } catch (error) {
    console.warn(`Failed to fetch ${url}: ${error.message}`);
    return null;
  }
};

const extractImageFromHtml = (html, sourceUrl) => {
  if (!html) return null;
  const $ = loadHtml(html);
  
  // Try Open Graph and Twitter Card tags
  const metaTags = [
    'meta[property="og:image"]',
    'meta[property="og:image:secure_url"]',
    'meta[name="twitter:image"]',
    'meta[name="twitter:image:src"]',
  ];

  for (const selector of metaTags) {
    const candidate = $(selector).attr('content');
    if (candidate) {
      try {
        return new URL(candidate, sourceUrl).href;
      } catch (e) { /* ignore invalid URLs */ }
    }
  }

  // Fallback to first large image (heuristic)
  const firstImg = $('img').first().attr('src');
  if (firstImg) {
    try {
      return new URL(firstImg, sourceUrl).href;
    } catch (e) { /* ignore */ }
  }

  return null;
};

// --- Main Functions ---

/**
 * Fetches an image URL from the recipe's source URL.
 * @param {string} sourceUrl - The URL of the recipe page.
 * @returns {Promise<string|null>} - The image URL or null if not found.
 */
export const fetchImageFromUrl = async (sourceUrl) => {
  if (!sourceUrl) return null;
  const html = await fetchHtml(sourceUrl);
  return extractImageFromHtml(html, sourceUrl);
};

/**
 * Generates an image using Gemini (Imagen) or falls back to a free generative service.
 * @param {string} prompt - The image description/prompt.
 * @returns {Promise<string>} - The URL of the generated image.
 */
export const generateImage = async (prompt) => {
  let enhancedPrompt = prompt;
  
  // 1. Try to enhance prompt with Gemini Text model first
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(`Create a detailed, appetizing image generation prompt for: "${prompt}". 
    Focus on lighting, texture, and professional food photography style. 
    Keep it under 30 words. Output ONLY the prompt.`);
    
    const text = result.response.text();
    if (text) enhancedPrompt = text.trim();
  } catch (e) {
    console.warn('Gemini prompt enhancement failed:', e);
  }

  // 2. Generate Image (using Imagen if available, or fallback)
  try {
    // Placeholder for Gemini Imagen implementation:
    // const model = genAI.getGenerativeModel({ model: "imagen-3.0-generate-001" });
    // const result = await model.generateImages({ prompt: enhancedPrompt });
    
    console.log(`Generating image for prompt: ${enhancedPrompt}`);
    const encodedPrompt = encodeURIComponent(enhancedPrompt);
    return `https://image.pollinations.ai/prompt/${encodedPrompt}`;

  } catch (error) {
    console.warn('Gemini image generation failed/not configured, falling back:', error);
    const encodedPrompt = encodeURIComponent(prompt);
    return `https://image.pollinations.ai/prompt/${encodedPrompt}`;
  }
};

/**
 * Fetches a "stock" image (using a free provider or fallback).
 * @param {string} query - The search query (e.g., "Chicken Parmesan").
 * @returns {Promise<string>}
 */
export const fetchStockImage = async (query) => {
  // 1. Try Unsplash Source (Deprecated but sometimes redirects) or Pexels if key exists.
  // Since we don't have a Pexels key in env, we'll use a reliable fallback.
  
  // 2. Pollinations.ai is actually great for "Stock-like" images too if prompted correctly.
  const stockPrompt = `high quality food photography of ${query}, appetizing, restaurant style`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(stockPrompt)}`;
};
