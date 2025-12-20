# LangChain Implementation Guide

Complete technical guide for implementing AI-powered meal planning using LangChain.js and Google Gemini.

## Table of Contents

1. [Installation](#installation)
2. [Core Concepts](#core-concepts)
3. [Meal Planning Agent](#meal-planning-agent)
4. [Supabase Tools](#supabase-tools)
5. [Structured Outputs](#structured-outputs)
6. [Error Handling](#error-handling)
7. [Testing](#testing)
8. [Deployment](#deployment)

---

## Installation

### 1. Install Dependencies

```bash
npm install langchain @langchain/google-genai @langchain/community @langchain/core zod
```

**Versions:**
- `langchain`: ^0.3.0
- `@langchain/google-genai`: ^0.1.0
- `zod`: ^3.23.0

### 2. Environment Variables

Add to `.env`:

```bash
# Google AI (Gemini)
GOOGLE_API_KEY=your_gemini_api_key_here

# Existing Supabase vars (keep these)
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

Get Gemini API key: https://aistudio.google.com/apikey

### 3. Verify Installation

```bash
node -e "import('@langchain/google-genai').then(m => console.log('✅ LangChain installed'))"
```

---

## Core Concepts

### LangChain Architecture

```
┌─────────────────┐
│  Express Route  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  LangChain      │
│  Agent/Chain    │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐ ┌───────┐
│ Tools │ │  LLM  │
│(Supa) │ │(Gemini│
└───────┘ └───────┘
    │         │
    └────┬────┘
         ▼
    ┌─────────┐
    │ Zod     │
    │ Schema  │
    └────┬────┘
         │
         ▼
    ┌─────────┐
    │ Output  │
    │ (JSON)  │
    └─────────┘
```

### Key Components

1. **LLM (Language Model):** Gemini 1.5 Pro - the brain that reasons
2. **Prompts:** Instructions that guide the LLM
3. **Tools:** Functions the LLM can call (query Supabase, calculate costs)
4. **Chains:** Sequences of operations (prompt → LLM → parse)
5. **Agents:** Autonomous decision-makers that use tools
6. **Parsers:** Convert LLM text output to structured data (JSON)
7. **Memory:** Store conversation history or user preferences

---

## Meal Planning Agent

### Basic Implementation

**File:** `backend/ai/agents/mealPlanningAgent.js`

```javascript
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StructuredOutputParser } from "langchain/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";

// 1. Define strict output schema with Zod
const mealSchema = z.object({
  day: z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]),
  recipe_id: z.string().uuid(),
  recipe_name: z.string(),
  estimated_cost: z.number().positive(),
  category: z.string(),
  reasoning: z.string().min(10).describe("Why this recipe was chosen")
});

const mealPlanSchema = z.object({
  meals: z.array(mealSchema).length(7).describe("Exactly 7 meals, one per day"),
  total_cost: z.number().positive(),
  budget_remaining: z.number(),
  variety_analysis: z.string().describe("Summary of protein/category distribution across the week")
});

// 2. Create output parser
const outputParser = StructuredOutputParser.fromZodSchema(mealPlanSchema);

// 3. Define prompt template
const MEAL_PLANNING_PROMPT = `You are an expert meal planner specializing in budget-friendly, healthy dinners using Aldi ingredients.

MISSION: Create a 7-day meal plan that maximizes variety, nutrition, and value while staying within budget.

CONSTRAINTS:
- Weekly budget: {budget} USD (MUST NOT EXCEED)
- Must select exactly 7 recipes (one per day: Monday-Sunday)
- Avoid repeating the same protein category 2 days in a row
- DO NOT use recipes from the past 4 weeks: {recent_recipe_ids}
- Prioritize pantry items with expiration dates if they fit

USER PREFERENCES:
{preferences}

AVAILABLE RECIPES:
{recipes}

MUST-USE PANTRY ITEMS (expiring soon):
{must_use_items}

INSTRUCTIONS:
Think step-by-step:

1. ANALYZE available recipes by cost and category
2. IDENTIFY which recipes use must-use pantry items
3. SELECT 7 recipes that:
   - Stay under ${"{budget}"} total
   - Include variety (different proteins across the week)
   - Use must-use items if possible
   - Match user preferences
4. EXPLAIN your reasoning for each selection

Remember:
- Each recipe must include a recipe_id from the available recipes list
- Cost estimates should be realistic based on recipe data
- Variety is important but budget is CRITICAL

{format_instructions}

Generate the meal plan now:`;

const promptTemplate = PromptTemplate.fromTemplate(MEAL_PLANNING_PROMPT);

// 4. Create the agent function
export async function generateMealPlan({ userId, weekStart, budget }) {
  console.log(`🤖 Generating meal plan for user ${userId}, week of ${weekStart}, budget $${budget}`);

  // Import database clients
  const { getAvailableRecipes } = await import('../../supabase/recipeClient.js');
  const { getRecentPlans } = await import('../../supabase/mealPlanClient.js');
  const { getPreferences } = await import('../../supabase/preferencesClient.js');
  const { getMustUseItems } = await import('../../supabase/pantryClient.js');

  // Fetch context from database
  const [recipes, pastPlans, preferences, pantryItems] = await Promise.all([
    getAvailableRecipes({
      maxCost: budget / 5, // Target ~$15 per meal for $75 budget
      minRating: 3.0,
      limit: 50 // Only give LLM top 50 options to reduce token usage
    }),
    getRecentPlans({ userId, weeks: 4 }),
    getPreferences({ userId }),
    getMustUseItems({ userId, expiringWithinDays: 7 })
  ]);

  // Extract recipe IDs to avoid
  const recentRecipeIds = pastPlans
    .flatMap(plan => plan.meals || [])
    .map(meal => meal.recipe_id)
    .filter(Boolean);

  // Format recipes for prompt (reduce token usage)
  const recipesFormatted = recipes.map(r => ({
    id: r.id,
    name: r.name,
    category: r.category,
    cost: r.cost_per_serving,
    servings: r.servings,
    avg_rating: r.avg_rating || 'N/A'
  }));

  console.log(`📊 Context: ${recipes.length} recipes, ${recentRecipeIds.length} recent recipes to avoid, ${pantryItems.length} pantry items`);

  // Initialize LLM
  const model = new ChatGoogleGenerativeAI({
    modelName: "gemini-1.5-pro",
    temperature: 0.8, // Allow creativity while staying structured
    maxOutputTokens: 4096,
    apiKey: process.env.GOOGLE_API_KEY
  });

  // Format the prompt
  const formattedPrompt = await promptTemplate.format({
    budget: budget,
    recipes: JSON.stringify(recipesFormatted, null, 2),
    recent_recipe_ids: recentRecipeIds.join(", ") || "none",
    preferences: JSON.stringify(preferences, null, 2),
    must_use_items: JSON.stringify(pantryItems.slice(0, 5), null, 2), // Limit to top 5
    format_instructions: outputParser.getFormatInstructions()
  });

  console.log(`📝 Prompt length: ${formattedPrompt.length} characters`);

  try {
    // Invoke the LLM
    console.log(`🚀 Calling Gemini API...`);
    const response = await model.invoke(formattedPrompt);

    console.log(`✅ Gemini response received (${response.content.length} chars)`);

    // Parse structured output
    const plan = await outputParser.parse(response.content);

    console.log(`✅ Parsed meal plan: ${plan.meals.length} meals, $${plan.total_cost.toFixed(2)} total`);

    // Validate budget constraint (critical!)
    if (plan.total_cost > budget) {
      console.warn(`⚠️  Plan exceeds budget ($${plan.total_cost} > $${budget}), retrying...`);
      // Could implement retry logic here
      throw new Error(`Generated plan exceeds budget: $${plan.total_cost} > $${budget}`);
    }

    // Save to database
    const { createMealPlan } = await import('../../supabase/mealPlanClient.js');

    const savedPlan = await createMealPlan({
      userId,
      weekStart,
      meals: plan.meals,
      totalCost: plan.total_cost,
      metadata: {
        variety_analysis: plan.variety_analysis,
        budget_remaining: plan.budget_remaining,
        generated_by: 'langchain_agent',
        model: 'gemini-1.5-pro',
        prompt_version: '1.0'
      }
    });

    console.log(`💾 Saved meal plan to database: ${savedPlan.id}`);

    return {
      success: true,
      plan: savedPlan,
      aiAnalysis: {
        variety_analysis: plan.variety_analysis,
        budget_remaining: plan.budget_remaining
      }
    };

  } catch (error) {
    console.error(`❌ Meal planning failed:`, error);

    // Log for monitoring
    await logError({
      userId,
      action: 'generate_meal_plan',
      error: error.message,
      context: { budget, weekStart }
    });

    throw new Error(`Failed to generate meal plan: ${error.message}`);
  }
}

// Helper for error logging
async function logError({ userId, action, error, context }) {
  // TODO: Implement proper error logging (Sentry, CloudWatch, etc.)
  console.error(`[ERROR LOG] User: ${userId}, Action: ${action}, Error: ${error}`, context);
}
```

### Usage in Express Route

**File:** `server/index.js`

```javascript
import express from 'express';
import { generateMealPlan } from './backend/ai/agents/mealPlanningAgent.js';

const app = express();
app.use(express.json());

app.post('/api/meal-plan/generate', async (req, res) => {
  try {
    const { userId, weekStart, budget } = req.body;

    // Validation
    if (!userId || !weekStart || !budget) {
      return res.status(400).json({
        error: 'Missing required fields: userId, weekStart, budget'
      });
    }

    if (budget < 20 || budget > 500) {
      return res.status(400).json({
        error: 'Budget must be between $20 and $500'
      });
    }

    // Generate plan using AI
    const result = await generateMealPlan({ userId, weekStart, budget });

    res.json(result);

  } catch (error) {
    console.error('Meal plan generation error:', error);
    res.status(500).json({
      error: 'Failed to generate meal plan',
      message: error.message
    });
  }
});

app.listen(3000, () => console.log('🚀 Server running on port 3000'));
```

---

## Supabase Tools

LangChain tools allow the LLM to query your database.

**File:** `backend/ai/tools/supabaseTool.js`

```javascript
import { DynamicTool } from "@langchain/core/tools";
import { getAvailableRecipes } from "../../supabase/recipeClient.js";

export const recipeSearchTool = new DynamicTool({
  name: "search_recipes",
  description: "Search for recipes by category, max cost, or ingredient. Returns recipe metadata including cost and ingredients.",
  func: async (input) => {
    try {
      const params = JSON.parse(input);
      const recipes = await getAvailableRecipes(params);
      return JSON.stringify(recipes);
    } catch (error) {
      return `Error searching recipes: ${error.message}`;
    }
  }
});

export const pantryCheckTool = new DynamicTool({
  name: "check_pantry",
  description: "Check if user has specific ingredients in their pantry. Returns quantity and expiration info.",
  func: async (input) => {
    try {
      const { userId, ingredientName } = JSON.parse(input);
      const { getPantryItem } = await import("../../supabase/pantryClient.js");
      const item = await getPantryItem({ userId, ingredientName });
      return JSON.stringify(item || { available: false });
    } catch (error) {
      return `Error checking pantry: ${error.message}`;
    }
  }
});
```

### Using Tools in Agents

```javascript
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import { recipeSearchTool, pantryCheckTool } from "../tools/supabaseTool.js";

const tools = [recipeSearchTool, pantryCheckTool];

const model = new ChatGoogleGenerativeAI({
  modelName: "gemini-1.5-pro",
  temperature: 0
});

const agent = await createToolCallingAgent({
  llm: model,
  tools,
  prompt: "You are a recipe discovery assistant..."
});

const executor = new AgentExecutor({ agent, tools });

const result = await executor.invoke({
  input: "Find vegetarian recipes under $5 that use ingredients I already have"
});
```

---

## Structured Outputs

### Why Use Structured Outputs?

LLMs naturally produce text, but we need JSON. Structured output parsing ensures:
- Valid JSON every time
- Type safety with TypeScript/Zod
- Automatic retry on malformed output
- Clear error messages

### Zod Schemas

```javascript
import { z } from "zod";

// Simple schema
const recipeSchema = z.object({
  name: z.string(),
  cost: z.number().positive(),
  category: z.enum(["Chicken", "Beef", "Vegetarian", "Pork", "Seafood"])
});

// Nested schema
const groceryListSchema = z.object({
  categories: z.array(z.object({
    name: z.string(),
    items: z.array(z.object({
      ingredient: z.string(),
      quantity: z.number(),
      unit: z.string(),
      estimated_cost: z.number()
    }))
  })),
  total_cost: z.number(),
  total_items: z.number()
});

// Schema with validation
const mealSchema = z.object({
  recipe_id: z.string().uuid("Must be a valid UUID"),
  cost: z.number().min(1).max(50, "Cost must be between $1 and $50"),
  day: z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"])
});
```

### Parser Usage

```javascript
import { StructuredOutputParser } from "langchain/output_parsers";

const parser = StructuredOutputParser.fromZodSchema(groceryListSchema);

// Get formatting instructions for prompt
const formatInstructions = parser.getFormatInstructions();
// Add this to your prompt so LLM knows the expected format

// Parse LLM output
const parsed = await parser.parse(llmResponse.content);
// Throws error if output doesn't match schema
```

---

## Error Handling

### Common Errors

1. **Invalid JSON from LLM**
```javascript
try {
  const plan = await outputParser.parse(response.content);
} catch (error) {
  if (error instanceof OutputParserException) {
    console.error("LLM produced invalid JSON:", error.message);
    // Retry with more explicit instructions
  }
}
```

2. **LLM Timeout**
```javascript
const model = new ChatGoogleGenerativeAI({
  modelName: "gemini-1.5-pro",
  timeout: 30000 // 30 seconds
});

try {
  const response = await model.invoke(prompt);
} catch (error) {
  if (error.message.includes('timeout')) {
    // Fall back to cached plan or simpler algorithm
  }
}
```

3. **Budget Constraint Violation**
```javascript
const plan = await outputParser.parse(response.content);

if (plan.total_cost > budget) {
  // Retry with stricter budget constraint
  const retryPrompt = `CRITICAL: Previous attempt exceeded budget.
  Budget is ${budget}, you MUST stay under this amount.
  Suggest cheaper recipes.`;
}
```

### Retry Logic

```javascript
async function generateWithRetry(params, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await generateMealPlan(params);
    } catch (error) {
      console.warn(`Attempt ${attempt} failed:`, error.message);

      if (attempt === maxRetries) {
        throw new Error(`Failed after ${maxRetries} attempts: ${error.message}`);
      }

      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}
```

---

## Testing

### Unit Test Example

**File:** `backend/ai/agents/__tests__/mealPlanningAgent.test.js`

```javascript
import { describe, it, expect, vi } from 'vitest';
import { generateMealPlan } from '../mealPlanningAgent.js';

// Mock Supabase clients
vi.mock('../../supabase/recipeClient.js', () => ({
  getAvailableRecipes: vi.fn(() => Promise.resolve([
    { id: '123', name: 'Chicken Stir Fry', cost_per_serving: 4.50, category: 'Chicken' },
    { id: '456', name: 'Beef Tacos', cost_per_serving: 5.00, category: 'Beef' }
  ]))
}));

describe('Meal Planning Agent', () => {
  it('should generate a 7-day meal plan within budget', async () => {
    const result = await generateMealPlan({
      userId: 'test-user',
      weekStart: '2025-01-06',
      budget: 75
    });

    expect(result.success).toBe(true);
    expect(result.plan.meals).toHaveLength(7);
    expect(result.plan.totalCost).toBeLessThanOrEqual(75);
  });

  it('should avoid recent recipes', async () => {
    // Test that recipes from past 4 weeks aren't repeated
  });

  it('should handle insufficient budget', async () => {
    await expect(
      generateMealPlan({ userId: 'test', weekStart: '2025-01-06', budget: 10 })
    ).rejects.toThrow('insufficient budget');
  });
});
```

### Integration Test

```javascript
describe('End-to-End Meal Plan Generation', () => {
  it('should generate plan, save to DB, and return valid response', async () => {
    const response = await fetch('http://localhost:3000/api/meal-plan/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'test-user',
        weekStart: '2025-01-06',
        budget: 75
      })
    });

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.plan.id).toBeDefined();
  });
});
```

---

## Deployment

### Environment Variables (Production)

```bash
# Vercel/Netlify/Railway
GOOGLE_API_KEY=your_production_key
SUPABASE_URL=your_production_url
SUPABASE_KEY=your_production_key

# Optional: Monitoring
SENTRY_DSN=your_sentry_dsn
LANGSMITH_API_KEY=your_langsmith_key # For LangChain tracing
```

### Cost Optimization

**Gemini 1.5 Pro Pricing (as of Dec 2024):**
- Input: $3.50 per 1M tokens
- Output: $10.50 per 1M tokens

**Typical meal plan generation:**
- Input: ~3,000 tokens (prompt + recipes)
- Output: ~500 tokens (meal plan JSON)
- Cost: ~$0.006 per generation

**Optimization strategies:**
1. Cache frequent queries (same user, similar budgets)
2. Use Gemini Flash for simple tasks ($0.35/$1.05 per 1M tokens)
3. Limit recipe list to top 50 (not all 500)
4. Reuse meal plans for similar budgets

### Monitoring

```javascript
import { LangSmith } from "langchain/smith";

// Initialize tracing
const tracer = new LangSmith({
  apiKey: process.env.LANGSMITH_API_KEY
});

// Wrap agent calls
await tracer.trace("meal_plan_generation", async () => {
  return await generateMealPlan(params);
});
```

### Performance Tips

1. **Parallel fetching:** Use `Promise.all()` for DB queries
2. **Streaming:** For long responses, use streaming instead of waiting
3. **Caching:** Cache recipe lists, user preferences
4. **Lazy loading:** Only import agents when needed

---

## Next Steps

1. ✅ Implement basic meal planning agent
2. ⏳ Add recipe discovery agent
3. ⏳ Add grocery optimizer agent
4. ⏳ Implement memory system
5. ⏳ Add monitoring and logging
6. ⏳ Optimize costs and performance

---

## Resources

- [LangChain.js Docs](https://js.langchain.com/docs/)
- [Google Gemini API](https://ai.google.dev/)
- [Zod Documentation](https://zod.dev/)
- [LangSmith (monitoring)](https://smith.langchain.com/)

---

**Last Updated:** 2025-12-20
**Version:** 1.0
