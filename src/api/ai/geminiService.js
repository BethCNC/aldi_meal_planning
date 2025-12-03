import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

// Initialize Gemini client
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.warn('Missing VITE_GEMINI_API_KEY. Gemini features may not work.');
}

const genAI = new GoogleGenerativeAI(apiKey || 'placeholder');

/**
 * JSON Schema for Weekly Meal Plan
 * Enforces strict structure for machine-readable output
 */
const weeklyPlanSchema = {
  type: SchemaType.OBJECT,
  properties: {
    weeklyPlan: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          day: {
            type: SchemaType.STRING,
            enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            description: 'Day of the week'
          },
          mealType: {
            type: SchemaType.STRING,
            enum: ['dinner', 'leftover', 'order-out'],
            description: 'Type of meal'
          },
          recipeName: {
            type: SchemaType.STRING,
            description: 'Name of the recipe',
            nullable: true
          },
          recipeId: {
            type: SchemaType.STRING,
            description: 'Recipe ID from catalog',
            nullable: true
          },
          estimatedCost: {
            type: SchemaType.NUMBER,
            description: 'Estimated cost for this meal',
            nullable: true
          }
        },
        required: ['day', 'mealType']
      }
    },
    groceryList: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          item: {
            type: SchemaType.STRING,
            description: 'Ingredient name'
          },
          quantity: {
            type: SchemaType.NUMBER,
            description: 'Quantity needed'
          },
          unit: {
            type: SchemaType.STRING,
            description: 'Unit of measurement'
          },
          estimatedPrice: {
            type: SchemaType.NUMBER,
            description: 'Estimated price at Aldi'
          },
          category: {
            type: SchemaType.STRING,
            enum: ['Produce', 'Meat', 'Dairy', 'Pantry', 'Frozen', 'Bakery'],
            description: 'Store category/aisle'
          },
          usedInRecipes: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            description: 'Which recipes use this ingredient (for cross-utilization tracking)'
          }
        },
        required: ['item', 'quantity', 'unit', 'estimatedPrice', 'category']
      }
    },
    totalEstimatedCost: {
      type: SchemaType.NUMBER,
      description: 'Total cost of all groceries'
    },
    reasoning: {
      type: SchemaType.STRING,
      description: 'Brief explanation of the meal plan strategy'
    }
  },
  required: ['weeklyPlan', 'groceryList', 'totalEstimatedCost', 'reasoning']
};

/**
 * Helper: Clean JSON output
 * Strips markdown code blocks that AI models often add
 */
export function cleanJson(text) {
  if (!text) return '';

  // Remove markdown code blocks (```json and ```)
  let cleaned = text.trim();

  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }

  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }

  return cleaned.trim();
}

/**
 * Step A: Context Gathering (Grounding)
 * Uses Gemini 2.5 Flash with googleSearch tool to get real-time context
 * Race against 5-second timeout to prevent freezing
 */
export async function gatherAldiContext() {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
    tools: [{ googleSearch: {} }] // Enable Google Search grounding
  });

  const searchPrompt = `What are the current best budget meal trends and specific item prices at Aldi for this month? Focus on ingredients for cheap dinners like beans, rice, seasonal vegetables, pasta, chicken thighs, and ground beef. Include any current sales or seasonal produce that would help reduce meal costs.`;

  try {
    // Race the search against a 5-second timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Search timeout')), 5000)
    );

    const searchPromise = model.generateContent(searchPrompt);

    const result = await Promise.race([searchPromise, timeoutPromise]);
    const response = await result.response;
    const searchContext = response.text();

    console.log('✓ Context gathered from Google Search');
    return searchContext;
  } catch (error) {
    console.warn('⚠ Context gathering timed out or failed, using defaults:', error.message);
    // Fallback context if search fails
    return `Default budget meal staples: beans ($1/can), rice ($2/lb), pasta ($1/box), ground beef ($4/lb), chicken thighs ($2/lb), eggs ($2/dozen), frozen vegetables ($1.50/bag), seasonal produce varies.`;
  }
}

/**
 * Step B: Structured Generation (Core Logic)
 * Uses Gemini 2.5 Flash with strict JSON schema
 * Implements frugal meal planning logic with algorithmic constraints
 */
export async function generateFrugalMealPlan(options) {
  const {
    budget = 100,
    peopleCount = 2,
    searchContext = '',
    pantryStaples = ['Oil', 'Spices', 'Flour', 'Sugar', 'Salt', 'Pepper', 'Butter'],
    recipeCatalog = [],
    pantryItems = [],
    salesContext = []
  } = options;

  // Configure model with strict JSON schema
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: weeklyPlanSchema,
      temperature: 0.7
    }
  });

  // Build the sophisticated prompt with algorithmic constraints
  const pantryNames = pantryItems.map(i => i.ingredient?.item || i.item || '').filter(Boolean);
  const salesNames = salesContext.map(s => s.item || s.name || '').filter(Boolean);

  const recipeCatalogText = recipeCatalog.length > 0
    ? recipeCatalog.map(r => `- ${r.name} (ID: ${r.id}, Cost: $${r.cost}, Category: ${r.category})`).join('\n')
    : 'No recipe catalog provided. Generate recipes from common Aldi ingredients.';

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
Items on Sale at Aldi: ${salesNames.length > 0 ? salesNames.join(', ') : 'Check context above'}

RECIPE CATALOG:
${recipeCatalogText}

ALGORITHMIC CONSTRAINTS (CRITICAL - MUST FOLLOW):

1. BUDGET ENFORCEMENT:
   - STRICTLY stay within $${budget} total
   - Track cumulative cost as you plan
   - If approaching limit, choose cheaper meals

2. INGREDIENT CROSS-UTILIZATION:
   - If you buy spinach for Tuesday, MUST use remaining spinach for Thursday
   - If you buy chicken thighs for Monday, use extras for Wednesday
   - Minimize single-use ingredients
   - Track ingredient overlap in "usedInRecipes" field

3. LUNCH STRATEGY:
   - Lunch should OFTEN be "Leftovers" from previous dinner
   - This reduces ingredient count and saves money
   - Plan dinner portions to accommodate leftovers

4. MEAL SCHEDULE LOGIC:
   - Monday, Tuesday, Thursday, Saturday: Fresh cooked dinners
   - Wednesday, Friday: Leftover nights (use "leftover" mealType)
   - Sunday: Order out or simple (use "order-out" mealType)

5. PANTRY STAPLE FILTERING:
   - DO NOT list pantry staples (${pantryStaples.join(', ')}) in grocery list
   - These are assumed to be on hand
   - Only list ingredients that need to be purchased

6. PROTEIN ROTATION:
   - Don't repeat same protein 3 times in a row
   - Variety: chicken → beef → pork → vegetarian → repeat

7. SEASONAL & SALE OPTIMIZATION:
   - Prioritize ingredients from search context (current sales/seasonal items)
   - Use items already in pantry first

OUTPUT INSTRUCTIONS:
- Generate a complete 7-day meal plan
- Generate a consolidated grocery list with cross-utilization tracking
- Ensure total cost ≤ $${budget}
- Provide reasoning explaining your strategy

Return the plan in the exact JSON schema format specified.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let jsonText = response.text();

    // Clean any markdown formatting
    jsonText = cleanJson(jsonText);

    // Parse and validate
    const parsed = JSON.parse(jsonText);

    console.log('✓ Meal plan generated with Gemini');
    console.log(`Total Cost: $${parsed.totalEstimatedCost} / Budget: $${budget}`);

    return parsed;
  } catch (error) {
    console.error('Gemini Generation Error:', error);
    throw new Error(`Failed to generate meal plan: ${error.message}`);
  }
}

/**
 * Main Two-Step Pipeline
 * Combines context gathering + structured generation
 */
export async function generateTwoStepMealPlan(options) {
  console.log('🔍 Step A: Gathering context from Google Search...');
  const searchContext = await gatherAldiContext();

  console.log('🤖 Step B: Generating structured meal plan...');
  const mealPlan = await generateFrugalMealPlan({
    ...options,
    searchContext
  });

  return mealPlan;
}

/**
 * Contextual Chat Assistant
 * Uses Gemini 3 Pro with meal plan injected into system instructions
 */
export async function chatWithMealPlan(userMessage, currentMealPlan = null) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp', // Using flash for speed; upgrade to pro if available
    generationConfig: {
      temperature: 0.9, // Higher temp for conversational variety
      maxOutputTokens: 1024
    }
  });

  // Inject current meal plan into system context
  let systemInstruction = 'You are a helpful cooking assistant for a budget-conscious meal planner.';

  if (currentMealPlan) {
    systemInstruction += `\n\nCURRENT MEAL PLAN CONTEXT:\n${JSON.stringify(currentMealPlan, null, 2)}\n\nUse this context to answer questions about the meal plan, recipes, cooking instructions, ingredient substitutions, etc.`;
  }

  const chat = model.startChat({
    history: [
      {
        role: 'user',
        parts: [{ text: systemInstruction }]
      },
      {
        role: 'model',
        parts: [{ text: 'I understand. I have the current meal plan context and am ready to help!' }]
      }
    ]
  });

  try {
    const result = await chat.sendMessage(userMessage);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Chat Error:', error);
    throw new Error(`Chat failed: ${error.message}`);
  }
}

export default {
  gatherAldiContext,
  generateFrugalMealPlan,
  generateTwoStepMealPlan,
  chatWithMealPlan,
  cleanJson
};
