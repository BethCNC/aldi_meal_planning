# Gemini AI Integration - Two-Step Pipeline

## Overview

This application now supports **Google Gemini AI** as an alternative AI provider, implementing a sophisticated **two-step pipeline** for budget meal planning with real-time context gathering and structured generation.

## Features

### 1. Two-Step AI Pipeline

The Gemini integration uses a unique two-step approach that ensures both accuracy and cost-effectiveness:

#### **Step A: Context Gathering (Grounding)**
- Uses **Gemini 2.5 Flash** with the **googleSearch** tool
- Performs real-time searches for:
  - Current Aldi prices and sales
  - Seasonal produce availability
  - Budget meal trends
- **5-second timeout** safety mechanism prevents app freezing
- Falls back to default assumptions if search times out

#### **Step B: Structured Generation**
- Uses **Gemini 2.5 Flash** with strict JSON schema enforcement
- Configured with `responseMimeType: "application/json"`
- Implements advanced prompt engineering with algorithmic constraints

### 2. Frugal Planning Logic

The system enforces these constraints through prompt engineering:

1. **Budget Enforcement**: Strictly adheres to the $100 weekly budget
2. **Ingredient Cross-Utilization**: Tracks ingredient reuse across meals
   - Example: Spinach bought for Tuesday is reused for Thursday
3. **Leftover Strategy**: Plans dinners with portions for next-day lunch
4. **Meal Schedule Logic**:
   - Mon/Tue/Thu/Sat: Fresh cooked dinners
   - Wed/Fri: Leftover nights
   - Sun: Order out or simple meal
5. **Pantry Staple Filtering**: Excludes assumed staples (oil, spices, etc.) from grocery list
6. **Protein Rotation**: Prevents same protein 3 times in a row
7. **Seasonal Optimization**: Prioritizes ingredients from search context

### 3. Data Processing & Sanitization

- **JSON Cleaning**: Strips markdown code blocks (```json, ```) from AI responses
- **Type Validation**: Casts parsed JSON to TypeScript interfaces
- **Error Handling**: Graceful fallbacks for API failures and timeouts

### 4. Contextual Chat Assistant

A floating chat widget powered by Gemini that:
- Injects current meal plan into system context
- Answers questions about recipes, cooking instructions, and substitutions
- Persists conversation history during session
- Accessible via floating button on Weekly Plan page

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                         │
├─────────────────────────────────────────────────────────────┤
│  • WeeklyPlanView.jsx                                       │
│    - AI provider selection (OpenAI vs Gemini)               │
│    - Meal plan generation trigger                           │
│  • ChatAssistant.jsx                                        │
│    - Floating chat widget                                   │
│    - Context injection                                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                Frontend Services                            │
├─────────────────────────────────────────────────────────────┤
│  • src/api/ai/geminiService.js                              │
│    - gatherAldiContext()     [Step A: Search with timeout]  │
│    - generateFrugalMealPlan() [Step B: Structured gen]     │
│    - chatWithMealPlan()      [Chat assistant logic]        │
│    - cleanJson()             [JSON sanitization]           │
│  • src/api/ai/geminiPlannerAgent.js                         │
│    - Orchestrates two-step flow                             │
│    - Saves to database                                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Backend API (Express.js)                       │
├─────────────────────────────────────────────────────────────┤
│  • POST /api/ai/gemini/plan                                 │
│    - Runs two-step pipeline server-side                    │
│    - Returns structured JSON meal plan                     │
│  • POST /api/ai/gemini/chat                                 │
│    - Handles chat with context injection                   │
│    - Streams responses to frontend                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Google Gemini API                          │
├─────────────────────────────────────────────────────────────┤
│  • gemini-2.0-flash-exp                                     │
│    - Fast, cost-effective                                   │
│    - Supports Google Search grounding                       │
│    - Structured output with JSON schemas                    │
└─────────────────────────────────────────────────────────────┘
```

## Setup

### 1. Install Dependencies

```bash
npm install @google/generative-ai
```

### 2. Environment Variables

Add to your `.env` file:

```bash
# Gemini API Key (get from: https://makersuite.google.com/app/apikey)
GEMINI_API_KEY=your_gemini_api_key_here
VITE_GEMINI_API_KEY=your_gemini_api_key_here  # For frontend (optional)
```

### 3. API Key Setup

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key and add it to your `.env` file

**Note**: The frontend Gemini service can work client-side, but for production, always use the backend API endpoints for security.

## Usage

### Generating a Meal Plan with Gemini

1. Navigate to the **Weekly Plan** page
2. Check **"Use Advanced AI"**
3. Select **"Gemini 2.5 Flash ⚡"** from the radio options
4. Click **"Generate Meal Plan"**

The system will:
1. Show "🔍 Gemini AI: Searching for deals & planning..."
2. Run Step A (context gathering) with 5s timeout
3. Run Step B (structured generation) with full context
4. Save the meal plan and grocery list to the database

### Using the Chat Assistant

1. Look for the floating **"Chat Assistant"** button (bottom-right)
2. Click to open the chat window
3. Ask questions like:
   - "How do I cook Tuesday's dinner?"
   - "Can I substitute chicken with tofu?"
   - "What ingredients are used multiple times this week?"
4. The assistant has full context of your current meal plan

## Comparison: OpenAI vs Gemini

| Feature | OpenAI GPT-4o | Gemini 2.5 Flash |
|---------|---------------|------------------|
| **Speed** | ~5-10 seconds | ~3-7 seconds (with search) |
| **Cost** | Higher | Lower |
| **Context Gathering** | None (static knowledge) | Real-time Google Search |
| **Structured Output** | JSON mode | Native JSON schema enforcement |
| **Frugal Constraints** | Prompt-based | Algorithmic + prompt-based |
| **Meal Plan Logic** | Good variety | Cross-utilization + leftovers |
| **Best For** | Creative variety | Budget optimization |

## JSON Schema

The Gemini service uses a strict schema to ensure structured output:

```typescript
{
  weeklyPlan: [
    {
      day: "Monday" | "Tuesday" | ...,
      mealType: "dinner" | "leftover" | "order-out",
      recipeName: string | null,
      recipeId: string | null,
      estimatedCost: number | null
    }
  ],
  groceryList: [
    {
      item: string,
      quantity: number,
      unit: string,
      estimatedPrice: number,
      category: "Produce" | "Meat" | "Dairy" | "Pantry" | "Frozen" | "Bakery",
      usedInRecipes: string[]  // Tracks cross-utilization
    }
  ],
  totalEstimatedCost: number,
  reasoning: string
}
```

## Error Handling

The system handles several failure scenarios gracefully:

1. **Search Timeout**: Falls back to default ingredient prices
2. **API Failure**: Shows error message, doesn't crash app
3. **Malformed JSON**: Cleaning function strips markdown, retries parse
4. **Missing API Key**: Backend returns 503 with clear error message
5. **Auth Failure**: Requires user login, prompts appropriately

## Performance Considerations

- **Search Timeout**: 5 seconds maximum to prevent UX degradation
- **Caching**: Consider implementing Redis cache for search results (15-minute TTL)
- **Rate Limiting**: Gemini has generous free tier (60 requests/minute)
- **Cost**: Significantly cheaper than GPT-4o for similar quality

## Future Enhancements

Potential improvements:

1. **Streaming Responses**: Show meal plan as it's being generated
2. **Voice Input**: Use Gemini's multimodal capabilities for voice queries
3. **Image Understanding**: Analyze pantry photos for automatic inventory
4. **Multi-week Planning**: Optimize ingredient purchases across multiple weeks
5. **Dietary Restrictions**: Add advanced filtering (gluten-free, vegan, etc.)

## Troubleshooting

### "Gemini not configured" Error
- Check that `GEMINI_API_KEY` is set in your `.env` file
- Restart your development server after adding the key

### "Search timeout" Warnings
- This is normal and expected - the app continues with defaults
- If happening frequently, check your internet connection

### JSON Parse Errors
- The `cleanJson()` function should handle most cases
- If persisting, check the model's raw output in server logs

### Chat Assistant Not Responding
- Ensure you're logged in (authentication required)
- Check browser console for network errors
- Verify backend server is running

## License

Same as the main application license.

## Credits

- **Gemini API**: Google AI
- **Implementation**: Based on frugal meal planning logic
- **Inspiration**: Real-world budget meal planning constraints
