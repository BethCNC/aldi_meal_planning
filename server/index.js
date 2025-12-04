import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
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

// Gemini client (server-side only)
const geminiApiKey = process.env.GEMINI_API_KEY;
if (!geminiApiKey) {
  console.error('Missing GEMINI_API_KEY environment variable');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(geminiApiKey);

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

    // 1. Fetch recipes from Supabase
    const { data: allRecipes } = await supabase
      .from('recipes')
      .select('*')
      .not('total_cost', 'is', null);

    // 2. Get recipe usage history for variety tracking
    const fourWeeksAgo = new Date(weekStartDate);
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    
    const { data: recentMealPlans } = await supabase
      .from('meal_plans')
      .select('recipe_id, week_start_date')
      .eq('user_id', req.user.id)
      .gte('week_start_date', fourWeeksAgo.toISOString().split('T')[0])
      .lt('week_start_date', weekStartDate)
      .not('recipe_id', 'is', null);

    // Build map of recently used recipes
    const recentlyUsedRecipes = new Set();
    if (recentMealPlans) {
      recentMealPlans.forEach(plan => {
        recentlyUsedRecipes.add(plan.recipe_id);
      });
    }

    // 3. Check if we need more variety - discover new recipes if needed
    const availableRecipes = allRecipes.filter(r => !recentlyUsedRecipes.has(r.id));
    const needsMoreVariety = availableRecipes.length < 10; // Less than 10 unused recipes

    let newRecipes = [];
    if (needsMoreVariety) {
      console.log(`🔍 Low recipe variety (${availableRecipes.length} unused). Discovering new recipes...`);
      
      // Use AI to discover new budget-friendly recipes
      const pantryNames = pantryItems.map(i => i.ingredient?.item || i.item || 'Unknown').join(', ');
      const discoverPrompt = `
        Generate 3-5 new, budget-friendly dinner recipes using Aldi ingredients.
        
        Requirements:
        - Budget: Under $${budget / 4} per recipe (for ${servings} servings)
        - Use common Aldi ingredients
        - Avoid recipes that might already exist in this catalog: ${allRecipes.slice(0, 20).map(r => r.name).join(', ')}
        - Focus on variety: different proteins, cuisines, cooking methods
        ${pantryNames ? `- Prioritize using: ${pantryNames}` : ''}
        
        Return JSON:
        {
          "recipes": [
            {
              "name": "Recipe Name",
              "category": "Chicken|Beef|Pork|Seafood|Vegetarian|Other",
              "servings": ${servings},
              "ingredients": [
                {"item": "Ingredient Name", "quantity": 1, "unit": "lb"}
              ],
              "instructions": ["Step 1", "Step 2"],
              "estimated_total_cost": 12.50,
              "reasoning": "Why this recipe adds variety"
            }
          ]
        }
      `;

      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
        const discoveryResult = await model.generateContent(discoverPrompt);
        const response = await discoveryResult.response;
        const text = response.text();
        
        // Extract JSON from response (handle markdown code blocks if present)
        let jsonText = text.trim();
        if (jsonText.startsWith('```json')) {
          jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        } else if (jsonText.startsWith('```')) {
          jsonText = jsonText.replace(/```\n?/g, '');
        }
        
        const discoveryData = JSON.parse(jsonText);
        newRecipes = discoveryData.recipes || [];

        // Save new recipes to database
        const savedNewRecipes = [];
        for (const recipe of newRecipes) {
          try {
            const { data: savedRecipe } = await supabase
              .from('recipes')
              .insert({
                name: recipe.name,
                category: recipe.category,
                servings: recipe.servings || servings,
                instructions: recipe.instructions?.join('\n') || '',
                total_cost: recipe.estimated_total_cost || 0,
                cost_per_serving: (recipe.estimated_total_cost || 0) / (recipe.servings || servings),
                source_url: 'AI Discovered',
                tags: 'AI Discovered, Budget Friendly'
              })
              .select()
              .single();

            if (savedRecipe) {
              console.log(`✅ Discovered and saved: ${savedRecipe.name} (ID: ${savedRecipe.id})`);
              // Add to available recipes list
              allRecipes.push(savedRecipe);
              savedNewRecipes.push(savedRecipe);
            }
          } catch (saveError) {
            console.warn(`Failed to save discovered recipe ${recipe.name}:`, saveError.message);
          }
        }
        // Update newRecipes to reference saved recipes
        newRecipes = savedNewRecipes;
      } catch (discoverError) {
        console.warn('Recipe discovery failed, continuing with existing recipes:', discoverError.message);
      }
    }

    // 4. Build recipe catalog for AI selection
    const recipeCatalog = allRecipes.map(r => ({
      id: r.id,
      name: r.name,
      category: r.category,
      cost: r.total_cost,
      recentlyUsed: recentlyUsedRecipes.has(r.id),
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
      - Recently Used: Avoid recipes marked as "recentlyUsed: true" unless absolutely necessary.
      ${newRecipes.length > 0 ? `- 🆕 NEW RECIPES JUST DISCOVERED (Prioritize these for maximum variety!): ${newRecipes.map(r => `${r.name} (ID: ${r.id})`).join(', ')}` : ''}
      
      Available Resources:
      - Pantry: ${pantryNames.join(', ')}
      - On Sale: ${salesNames.join(', ')}
      - Recipe Catalog (ID: Name - Cost - Category - RecentlyUsed):
        ${recipeCatalog.map(r => `${r.id}: ${r.name} - $${r.cost} - ${r.category}${r.recentlyUsed ? ' [USED RECENTLY - AVOID]' : ''}`).join('\n      ')}
      
      Task:
      Select exactly 4 distinct recipes from the catalog for the cooking nights.
      Optimize for:
      1. VARIETY FIRST: Prioritize recipes NOT marked as recently used
      2. Using pantry items (High priority)
      3. Using sale items (Medium priority)
      4. Protein variety (Don't repeat proteins back-to-back)
      5. Total cost under $${budget}
      ${newRecipes.length > 0 ? '6. Include at least 1-2 of the newly discovered recipes for freshness' : ''}
      
      Return JSON:
      {
        "plan": [
          { "day": "Monday", "recipeId": "..." },
          { "day": "Tuesday", "recipeId": "..." },
          { "day": "Thursday", "recipeId": "..." },
          { "day": "Saturday", "recipeId": "..." }
        ],
        "reasoning": "Brief explanation of the strategy used, including variety considerations."
      }
    `;

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    const planResult = await model.generateContent(systemPrompt);
    const planResponse = await planResult.response;
    const planText = planResponse.text();
    
    // Extract JSON from response (handle markdown code blocks if present)
    let jsonText = planText.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }

    const result = JSON.parse(jsonText);
    
    // Log variety stats
    const selectedRecipeIds = (result.plan || []).map(p => p.recipeId);
    const newRecipeIds = new Set(newRecipes.map(r => r.id));
    const newRecipesUsed = selectedRecipeIds.filter(id => newRecipeIds.has(id)).length;
    
    console.log(`🎯 AI Meal Plan Generated:`);
    console.log(`   • Recipes discovered this session: ${newRecipes.length}`);
    console.log(`   • New recipes in plan: ${newRecipesUsed}/4`);
    console.log(`   • Recipes from last 4 weeks avoided: ${selectedRecipeIds.filter(id => recentlyUsedRecipes.has(id)).length}/4`);
    
    res.json({
      success: true,
      plan: result.plan || [],
      reasoning: result.reasoning || '',
      varietyStats: {
        newRecipesDiscovered: newRecipes.length,
        newRecipesInPlan: newRecipesUsed,
        totalRecipesAvailable: allRecipes.length
      }
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

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    const discoverResult = await model.generateContent(prompt);
    const discoverResponse = await discoverResult.response;
    const discoverText = discoverResponse.text();
    
    // Extract JSON from response (handle markdown code blocks if present)
    let jsonText = discoverText.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }

    const result = JSON.parse(jsonText);
    
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

