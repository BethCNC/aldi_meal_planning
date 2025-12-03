import express from 'express';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
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

// Gemini client (optional - for two-step pipeline)
const geminiApiKey = process.env.GEMINI_API_KEY;
let genAI = null;

if (geminiApiKey) {
  genAI = new GoogleGenerativeAI(geminiApiKey);
  console.log('✓ Gemini AI initialized');
} else {
  console.warn('⚠ GEMINI_API_KEY not set. Gemini features will be unavailable.');
}

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

// =============================================================================
// GEMINI TWO-STEP PIPELINE ENDPOINTS
// =============================================================================

/**
 * Helper: Clean JSON output (removes markdown code blocks)
 */
function cleanJson(text) {
  if (!text) return '';
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
  return cleaned.trim();
}

/**
 * Gemini JSON Schema for Meal Plans
 */
const weeklyPlanSchema = {
  type: SchemaType.OBJECT,
  properties: {
    weeklyPlan: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          day: { type: SchemaType.STRING, description: 'Day of the week' },
          mealType: { type: SchemaType.STRING, description: 'Type of meal' },
          recipeName: { type: SchemaType.STRING, nullable: true },
          recipeId: { type: SchemaType.STRING, nullable: true },
          estimatedCost: { type: SchemaType.NUMBER, nullable: true }
        },
        required: ['day', 'mealType']
      }
    },
    groceryList: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          item: { type: SchemaType.STRING },
          quantity: { type: SchemaType.NUMBER },
          unit: { type: SchemaType.STRING },
          estimatedPrice: { type: SchemaType.NUMBER },
          category: { type: SchemaType.STRING },
          usedInRecipes: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
        },
        required: ['item', 'quantity', 'unit', 'estimatedPrice', 'category']
      }
    },
    totalEstimatedCost: { type: SchemaType.NUMBER },
    reasoning: { type: SchemaType.STRING }
  },
  required: ['weeklyPlan', 'groceryList', 'totalEstimatedCost', 'reasoning']
};

/**
 * Step A: Context Gathering with Google Search (5s timeout)
 */
async function gatherAldiContext() {
  if (!genAI) throw new Error('Gemini not initialized');

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
    tools: [{ googleSearch: {} }]
  });

  const searchPrompt = `What are the current best budget meal trends and specific item prices at Aldi for this month? Focus on ingredients for cheap dinners like beans, rice, seasonal vegetables, pasta, chicken thighs, and ground beef.`;

  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Search timeout')), 5000)
    );
    const searchPromise = model.generateContent(searchPrompt);
    const result = await Promise.race([searchPromise, timeoutPromise]);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.warn('Context gathering timed out, using defaults');
    return 'Default budget meal staples: beans ($1/can), rice ($2/lb), pasta ($1/box), ground beef ($4/lb), chicken thighs ($2/lb).';
  }
}

/**
 * POST /api/ai/gemini/plan
 * Two-Step AI Pipeline: Search context → Structured generation
 */
app.post('/api/ai/gemini/plan', verifyAuth, async (req, res) => {
  if (!genAI) {
    return res.status(503).json({ error: 'Gemini not configured. Set GEMINI_API_KEY.' });
  }

  try {
    const {
      budget = 100,
      peopleCount = 2,
      weekStartDate,
      pantryItems = [],
      salesContext = []
    } = req.body;

    // Fetch recipes from Supabase
    const { data: allRecipes } = await supabase
      .from('recipes')
      .select('*')
      .not('total_cost', 'is', null);

    const recipeCatalog = allRecipes.map(r => ({
      id: r.id,
      name: r.name,
      category: r.category,
      cost: r.total_cost
    }));

    // Step A: Gather context
    console.log('🔍 Step A: Gathering context...');
    const searchContext = await gatherAldiContext();

    // Step B: Structured generation
    console.log('🤖 Step B: Generating plan...');
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: weeklyPlanSchema,
        temperature: 0.7
      }
    });

    const pantryNames = pantryItems.map(i => i.ingredient?.item || i.item || '').filter(Boolean);
    const salesNames = salesContext.map(s => s.item || '').filter(Boolean);
    const pantryStaples = ['Oil', 'Spices', 'Flour', 'Sugar', 'Salt', 'Pepper', 'Butter'];

    const recipeCatalogText = recipeCatalog
      .map(r => `- ${r.name} (ID: ${r.id}, Cost: $${r.cost}, Category: ${r.category})`)
      .join('\n');

    const prompt = `You are a master budget meal planner expert in Aldi products.

CURRENT MARKET CONTEXT (from real-time search):
${searchContext}

BUDGET CONSTRAINTS:
- Total Weekly Budget: STRICTLY $${budget}
- People to Feed: ${peopleCount}
- Days: 7 (Monday-Sunday)

AVAILABLE RESOURCES:
Pantry Staples (DO NOT include in grocery list): ${pantryStaples.join(', ')}
Current Pantry Items: ${pantryNames.length > 0 ? pantryNames.join(', ') : 'None'}
Items on Sale: ${salesNames.length > 0 ? salesNames.join(', ') : 'Check context'}

RECIPE CATALOG:
${recipeCatalogText}

ALGORITHMIC CONSTRAINTS (CRITICAL):
1. BUDGET: STRICTLY stay within $${budget}
2. CROSS-UTILIZE: If you buy spinach for Tuesday, use it Thursday too
3. LEFTOVERS: Lunch often = leftovers from previous dinner
4. SCHEDULE: Mon/Tue/Thu/Sat = Fresh dinners. Wed/Fri = Leftovers. Sun = Order out.
5. FILTER PANTRY STAPLES: DO NOT list ${pantryStaples.join(', ')} in grocery list
6. PROTEIN ROTATION: Don't repeat same protein 3x in a row
7. OPTIMIZE: Use seasonal items and sales from context

Generate a complete 7-day meal plan with consolidated grocery list. Ensure total cost ≤ $${budget}.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let jsonText = cleanJson(response.text());
    const parsed = JSON.parse(jsonText);

    res.json({
      success: true,
      weeklyPlan: parsed.weeklyPlan || [],
      groceryList: parsed.groceryList || [],
      totalEstimatedCost: parsed.totalEstimatedCost || 0,
      reasoning: parsed.reasoning || '',
      budget
    });
  } catch (error) {
    console.error('Gemini Plan Generation Error:', error);
    res.status(500).json({
      error: 'Failed to generate meal plan with Gemini',
      message: error.message
    });
  }
});

/**
 * POST /api/ai/gemini/chat
 * Contextual chat with meal plan injection
 */
app.post('/api/ai/gemini/chat', verifyAuth, async (req, res) => {
  if (!genAI) {
    return res.status(503).json({ error: 'Gemini not configured. Set GEMINI_API_KEY.' });
  }

  try {
    const { message, mealPlanContext = null } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: { temperature: 0.9, maxOutputTokens: 1024 }
    });

    let systemInstruction = 'You are a helpful cooking assistant for a budget-conscious meal planner.';
    if (mealPlanContext) {
      systemInstruction += `\n\nCURRENT MEAL PLAN CONTEXT:\n${JSON.stringify(mealPlanContext, null, 2)}`;
    }

    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: systemInstruction }]
        },
        {
          role: 'model',
          parts: [{ text: 'I understand. Ready to help!' }]
        }
      ]
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;

    res.json({
      success: true,
      response: response.text()
    });
  } catch (error) {
    console.error('Gemini Chat Error:', error);
    res.status(500).json({
      error: 'Chat failed',
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

