import express from 'express';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase client for JWT verification
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// OpenAI client (server-side only)
const openaiApiKey = process.env.OPENAI_API_KEY;
if (!openaiApiKey) {
  console.error('Missing OPENAI_API_KEY environment variable');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: openaiApiKey
});

// Middleware
app.use(express.json());
app.use(express.static(join(__dirname, '../dist')));

// JWT Verification Middleware
async function verifyAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.substring(7);

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth verification error:', err);
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

// AI Endpoint: Generate Weekly Meal Plan
app.post('/api/ai/plan', verifyAuth, async (req, res) => {
  try {
    const {
      budget = 100,
      servings = 4,
      weekStartDate,
      pantryItems = [],
      salesContext = []
    } = req.body;

    // Fetch recipes from Supabase (using service key for admin access)
    const { data: allRecipes } = await supabase
      .from('recipes')
      .select('*')
      .not('total_cost', 'is', null);

    const recipeCatalog = allRecipes.map(r => ({
      id: r.id,
      name: r.name,
      category: r.category,
      cost: r.total_cost,
      ingredients: []
    }));

    const pantryNames = pantryItems.map(i => i.ingredient?.item || i.item || 'Unknown');
    const salesNames = salesContext.map(s => s.item);

    const systemPrompt = `
      You are an expert meal planner optimizing for budget, variety, and waste reduction.
      
      Context:
      - Budget: $${budget} for the week
      - Servings: ${servings}
      - Schedule: Mon/Tue/Thu/Sat = Cook. Wed/Fri/Sun = Leftovers/Order Out. (4 meals total).
      
      Available Resources:
      - Pantry: ${pantryNames.join(', ')}
      - On Sale: ${salesNames.join(', ')}
      - Recipe Catalog (ID: Name - Cost - Category):
        ${recipeCatalog.map(r => `${r.id}: ${r.name} - $${r.cost} - ${r.category}`).join('\n      ')}
      
      Task:
      Select exactly 4 distinct recipes from the catalog for the cooking nights.
      Optimize for:
      1. Using pantry items (High priority)
      2. Using sale items (Medium priority)
      3. Protein variety (Don't repeat proteins back-to-back)
      4. Total cost under $${budget}
      
      Return JSON:
      {
        "plan": [
          { "day": "Monday", "recipeId": "..." },
          { "day": "Tuesday", "recipeId": "..." },
          { "day": "Thursday", "recipeId": "..." },
          { "day": "Saturday", "recipeId": "..." }
        ],
        "reasoning": "Brief explanation of the strategy used."
      }
    `;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: systemPrompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7
    });

    const result = JSON.parse(completion.choices[0].message.content);
    
    res.json({
      success: true,
      plan: result.plan || [],
      reasoning: result.reasoning || ''
    });
  } catch (error) {
    console.error('AI Plan Generation Error:', error);
    res.status(500).json({ 
      error: 'Failed to generate meal plan',
      message: error.message 
    });
  }
});

// AI Endpoint: Discover Recipes
app.post('/api/ai/discover', verifyAuth, async (req, res) => {
  try {
    const { query, count = 3 } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required' });
    }

    const prompt = `
      You are an expert budget chef specializing in Aldi ingredients.
      
      User Request: "${query}"
      
      Generate ${count} distinct, budget-friendly dinner recipes that satisfy the request.
      
      Constraints:
      - Ingredients must be common items found at Aldi.
      - Keep ingredient count reasonable (5-12 items).
      - Focus on cost-effectiveness (under $15 total estimated).
      
      Return a JSON object with this structure:
      {
        "recipes": [
          {
            "name": "Recipe Title",
            "description": "Short appetizing description",
            "servings": 4,
            "category": "Chicken" | "Beef" | "Pork" | "Seafood" | "Vegetarian" | "Other",
            "ingredients": [
              { "item": "Ingredient Name (e.g., Ground Beef)", "quantity": 1, "unit": "lb", "notes": "80/20" }
            ],
            "instructions": ["Step 1...", "Step 2..."],
            "estimated_total_cost": 12.50,
            "reasoning": "Why this fits the request"
          }
        ]
      }
    `;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7
    });

    const result = JSON.parse(completion.choices[0].message.content);
    
    res.json({
      success: true,
      recipes: result.recipes || []
    });
  } catch (error) {
    console.error('AI Recipe Discovery Error:', error);
    res.status(500).json({ 
      error: 'Failed to discover recipes',
      message: error.message 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve React app for all other routes (SPA routing)
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

