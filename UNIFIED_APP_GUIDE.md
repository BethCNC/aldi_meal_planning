# Unified Aldi Meal Planning App - Complete Guide

## 🎯 Core Mission

**Generate the lowest-cost weekly meal plans and grocery lists for 2 people at Aldi, staying under $100/week.**

## ✨ Key Features

### 1. Budget-Optimized Meal Planning
- **Target Budget**: $100/week for 2 people
- **Two AI Options**:
  - **Gemini 2.5 Flash** (Recommended): Budget-focused with real-time price search
  - **OpenAI GPT-4o**: Creative variety and flavor pairings

### 2. Printable PDFs
- **Meal Plan PDF**: Complete weekly schedule with recipe details
- **Grocery List PDF**: Organized by store category (Produce, Meat, Dairy, etc.)
- One-click downloads from the Weekly Plan page

### 3. Recipe Swapping & Preferences
- **Swap Button**: Replace any recipe you don't like
- **Automatic Blacklist**: Disliked recipes never appear again
- **Optional Reasoning**: Track why you dislike certain recipes

### 4. Automated Recipe Discovery
- Gemini constantly searches for new budget-friendly recipes
- Automatically integrates trending Aldi recipes
- Discovers creative meal ideas under $15

### 5. Contextual Chat Assistant
- Floating chat widget powered by Gemini
- Ask questions about your meal plan
- Get cooking instructions, substitutions, and tips
- Always has context of your current week's plan

---

## 🚀 Getting Started

### Prerequisites

1. **API Keys Required**:
   ```bash
   GEMINI_API_KEY=your_gemini_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here (optional)
   ```

2. **Database Migration**:
   Run the recipe preferences migration:
   ```bash
   # Apply the migration in your Supabase dashboard
   # File: supabase/migrations/create_recipe_preferences.sql
   ```

3. **Install Dependencies**:
   ```bash
   npm install
   ```

### Environment Setup

Copy `.env.example` to `.env` and fill in your keys:

```bash
# Required
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Gemini (Recommended for budget focus)
GEMINI_API_KEY=your_gemini_key

# OpenAI (Optional)
OPENAI_API_KEY=your_openai_key
```

---

## 📋 Core Workflow

### Step 1: Generate Meal Plan

1. Navigate to **Weekly Plan** page
2. (Optional) Check **"Use Advanced AI"**
   - Select **Gemini** for budget optimization
   - Select **OpenAI** for creative variety
3. Click **"Generate Meal Plan"**

#### What Happens:
- **Gemini Pipeline**:
  1. Real-time search for Aldi prices and deals
  2. Structured generation with budget constraints
  3. Creates 7-day plan with leftovers strategy
  4. Generates grocery list with cross-utilization

- **Standard/OpenAI**:
  1. Uses existing recipe database
  2. Optimizes for variety and protein rotation
  3. Stays within budget

### Step 2: Download PDFs

Once your meal plan is generated:

1. Click **"Download Meal Plan PDF"**
   - Gets weekly schedule
   - Includes recipe details and instructions
   - Shows cost per meal

2. Click **"Download Grocery List PDF"**
   - Organized by store category
   - Shows quantities and prices
   - Checkboxes for shopping

### Step 3: Swap Recipes (Optional)

Don't like a recipe?

1. Click the **"Swap"** button on any recipe day
2. Enter why you don't like it (optional)
3. Browse alternative recipes
4. Click **"Use This"** to replace

**Result**: Old recipe is blacklisted and won't appear in future plans.

### Step 4: Chat with Assistant

1. Click the floating **"Chat Assistant"** button (bottom-right)
2. Ask questions like:
   - "How do I cook Tuesday's dinner?"
   - "Can I substitute chicken with tofu?"
   - "Which ingredients are used multiple times this week?"

The assistant has full context of your meal plan.

---

## 🧠 How Gemini's Budget Optimization Works

### Two-Step AI Pipeline

#### Step A: Context Gathering (5 seconds)
- Uses **Google Search** grounding
- Searches for:
  - Current Aldi prices
  - Seasonal produce availability
  - Budget meal trends
- **Timeout Safety**: Falls back to defaults if search takes >5s

#### Step B: Structured Generation
- Uses strict JSON schema
- Enforces **7 algorithmic constraints**:

1. **Budget Enforcement**: STRICTLY stay within $100
2. **Cross-Utilization**: Reuse ingredients across meals
   - Example: Spinach for Tuesday + Thursday
3. **Leftover Strategy**: Plan dinners with lunch portions
4. **Meal Schedule**:
   - Mon/Tue/Thu/Sat: Fresh dinners
   - Wed/Fri: Leftover nights
   - Sun: Order out
5. **Pantry Filtering**: Don't list staples (oil, spices, etc.)
6. **Protein Rotation**: No same protein 3x in a row
7. **Seasonal Optimization**: Prioritize sale items

### Blacklist Integration

- Before generating, fetches your disliked recipes
- Excludes them from the recipe catalog
- Ensures you never see them again

---

## 🔄 Recipe Discovery System

### Automated Discovery

The app continuously discovers new recipes using Gemini:

```javascript
// Discover 3 recipes per category
await batchDiscoverRecipes(['Chicken', 'Beef', 'Vegetarian'], 3);
```

### Discovery Criteria

- **Budget**: Under $15 per recipe
- **Availability**: Common Aldi ingredients
- **Creativity**: NOT typical/common recipes
- **Servings**: 2-4 people

### How It Works

1. Gemini searches for trending budget recipes
2. Uses Google Search for current Aldi prices
3. Generates structured JSON with:
   - Recipe name, category, servings
   - Ingredient list with prices
   - Step-by-step instructions
   - Total cost estimate
4. Auto-saves to database if new
5. Available in next meal plan generation

### Manual Discovery

You can also manually trigger discovery:

```javascript
const recipes = await discoverNewRecipes({
  count: 5,
  searchQuery: 'budget-friendly chicken Aldi recipes under $15',
  category: 'Chicken'
});
```

---

## 📄 PDF Generation

### Meal Plan PDF Structure

```
┌────────────────────────────────────────┐
│        Weekly Meal Plan                │
│   Week of Jan 1 - Jan 7, 2025          │
│        For 2 people                    │
├────────────────────────────────────────┤
│ Budget: $87.50 / $100.00               │
├────┬──────────┬──────────────┬─────────┤
│ ✓  │ Monday   │ Chicken Stir-Fry │ $12 │
│ ○  │ Tuesday  │ Beef Tacos    │ $15    │
│ ○  │ Wednesday│ Leftovers     │ -      │
│ ...                                    │
├────────────────────────────────────────┤
│           Recipe Details               │
│                                        │
│ Monday: Chicken Stir-Fry               │
│ 1. Heat oil in wok...                  │
│ 2. Add chicken...                      │
│ ...                                    │
└────────────────────────────────────────┘
```

### Grocery List PDF Structure

```
┌────────────────────────────────────────┐
│          Grocery List                  │
│   Week of Jan 1 - Jan 7, 2025          │
├────────────────────────────────────────┤
│ Total Cost: $87.50 / $100.00           │
├────────────────────────────────────────┤
│ PRODUCE                                │
│ ☐ Spinach               1 bag    $2.49 │
│ ☐ Bell Peppers          3 ea     $3.99 │
│ ☐ Onions                2 lb     $1.99 │
├────────────────────────────────────────┤
│ MEAT                                   │
│ ☐ Chicken Thighs        2 lb     $5.99 │
│ ☐ Ground Beef (80/20)   1 lb     $4.99 │
│ ...                                    │
└────────────────────────────────────────┘
```

---

## 🗄️ Database Schema

### New Table: `user_recipe_preferences`

```sql
CREATE TABLE user_recipe_preferences (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  recipe_id UUID NOT NULL REFERENCES recipes(id),
  preference TEXT CHECK (preference IN ('like', 'dislike', 'neutral')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, recipe_id)
);
```

**Purpose**: Track which recipes users like/dislike

### Workflow Integration

1. User swaps recipe → marks as 'dislike'
2. Next generation → blacklisted recipes excluded
3. User can view/manage preferences (future feature)

---

## 🛠️ API Endpoints

### Gemini Endpoints

#### `POST /api/ai/gemini/plan`
Generate meal plan with two-step pipeline

**Request**:
```json
{
  "budget": 100,
  "peopleCount": 2,
  "weekStartDate": "2025-01-01",
  "pantryItems": [],
  "salesContext": [],
  "blacklistedRecipeIds": ["uuid1", "uuid2"]
}
```

**Response**:
```json
{
  "success": true,
  "weeklyPlan": [...],
  "groceryList": [...],
  "totalEstimatedCost": 87.50,
  "reasoning": "Strategy explanation"
}
```

#### `POST /api/ai/gemini/chat`
Contextual chat with meal plan

**Request**:
```json
{
  "message": "How do I cook Tuesday's dinner?",
  "mealPlanContext": { ... }
}
```

#### `POST /api/ai/gemini/discover`
Discover new recipes

**Request**:
```json
{
  "query": "budget-friendly chicken Aldi recipes",
  "count": 5,
  "maxBudget": 15,
  "category": "Chicken"
}
```

---

## 🎨 UI Components

### New Components

1. **RecipeSwapModal** (`src/components/RecipeSwapModal.jsx`)
   - Displays alternative recipes
   - Handles blacklisting
   - Updates meal plan

2. **ChatAssistant** (`src/components/ChatAssistant.jsx`)
   - Floating chat widget
   - Context injection
   - Gemini-powered responses

3. **PDF Buttons** (in `WeeklyPlanView.jsx`)
   - Download Meal Plan PDF
   - Download Grocery List PDF

### Updated Components

- **WeeklyPlanView**: Now includes swap buttons, PDF downloads, chat
- **DayCard**: Rendered with swap button overlay

---

## 📊 Cost Optimization Strategies

### How the App Stays Under Budget

1. **Ingredient Reuse**:
   - Tracks which recipes use which ingredients
   - Prioritizes recipes that share ingredients
   - Example: Buy 1 bag spinach → use in 3 meals

2. **Leftover Planning**:
   - Mon/Tue/Thu/Sat: Cook fresh
   - Wed/Fri: Eat leftovers
   - Reduces total recipes needed

3. **Seasonal Prioritization**:
   - Real-time search finds sale items
   - Gemini prioritizes seasonal produce
   - Lower prices = more value

4. **Pantry Staple Exclusion**:
   - Doesn't budget for: oil, spices, flour, sugar, salt, pepper, butter
   - Assumes you have these
   - Saves ~$10-15/week

5. **Protein Rotation**:
   - Varies protein sources
   - Prevents expensive repetition
   - Balanced nutrition + cost

---

## 🧪 Testing the App

### Manual Testing Checklist

- [ ] Generate meal plan with Gemini
- [ ] Download Meal Plan PDF (verify formatting)
- [ ] Download Grocery List PDF (verify categories)
- [ ] Swap a recipe
- [ ] Verify swapped recipe is blacklisted
- [ ] Regenerate plan (swapped recipe shouldn't appear)
- [ ] Open chat assistant
- [ ] Ask question about meal plan
- [ ] Verify chat has context

### Budget Validation

After generating a plan:
1. Check `totalCost` ≤ $100
2. Verify grocery list matches meal plan
3. Confirm pantry staples excluded
4. Check for ingredient reuse

---

## 🚨 Troubleshooting

### "Gemini not configured" Error
**Solution**: Set `GEMINI_API_KEY` in `.env` and restart server

### Blacklist Not Working
**Solution**:
1. Check migration was applied
2. Verify RLS policies in Supabase
3. Check browser console for auth errors

### PDF Download Fails
**Solution**:
1. Ensure jspdf and jspdf-autotable are installed
2. Check for meal plan data
3. Verify grocery list was generated

### Chat Assistant Not Responding
**Solution**:
1. Check user is authenticated
2. Verify Gemini API key
3. Check network tab for errors

### Recipe Discovery Not Saving
**Solution**:
1. Verify recipe doesn't already exist (by name)
2. Check user has permission to insert recipes
3. Ensure ingredients have valid data

---

## 📈 Future Enhancements

### Planned Features

1. **Background Recipe Discovery**:
   - Scheduled cron job (daily)
   - Auto-discovers 15 new recipes/day
   - Keeps database fresh

2. **Multi-Week Planning**:
   - Optimize ingredient purchases across 2-4 weeks
   - Bulk buying discounts
   - Reduce waste further

3. **Dietary Restrictions**:
   - Filter by: gluten-free, vegan, dairy-free, etc.
   - Allergy management
   - Nutrition tracking

4. **Cost Tracking**:
   - Actual vs. estimated costs
   - Price history charts
   - Savings calculator

5. **Recipe Rating System**:
   - 5-star ratings
   - Favorite recipes
   - Most popular meals

6. **Shopping Mode**:
   - Mobile-optimized grocery list
   - Check off items as you shop
   - Store map integration

---

## 🤝 Contributing

### Code Structure

```
src/
├── api/
│   ├── ai/
│   │   ├── geminiService.js         # Core Gemini logic
│   │   ├── geminiPlannerAgent.js    # Frontend agent
│   │   └── recipeDiscoveryService.js # Auto-discovery
│   ├── recipePreferences.js          # Blacklist management
│   ├── pdfGenerator.js               # PDF creation
│   └── mealPlanGenerator.js          # Standard generator
├── components/
│   ├── ChatAssistant.jsx             # Chat widget
│   └── RecipeSwapModal.jsx           # Swap interface
└── pages/
    └── WeeklyPlanView.jsx            # Main view
```

### Adding New Features

1. Create feature branch
2. Implement with tests
3. Update documentation
4. Submit PR with description

---

## 📝 License

Same as main application

---

## 🙏 Credits

- **Gemini API**: Google AI for budget optimization
- **jsPDF**: PDF generation library
- **Aldi**: Affordable grocery source
- **OpenAI**: Alternative AI provider

---

## 📞 Support

For issues or questions:
1. Check troubleshooting section
2. Review GEMINI_FEATURES.md for technical details
3. Open GitHub issue with details

**Happy Budget Meal Planning! 🎉**
