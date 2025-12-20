# AI-Powered Pricing & Budgeting System
## Complete Redesign for Dynamic Recipe Generation

**Problem:** Current system uses static Notion data with inaccurate cost calculations. Moving to AI-generated dynamic recipes requires intelligent pricing, unit conversion, and budget validation.

**Solution:** LangChain-powered pricing agents that learn Aldi ingredients, calculate accurate costs, and generate budget-optimized recipes.

---

## Table of Contents

1. [Current System Analysis](#current-system-analysis)
2. [Critical Issues Found](#critical-issues-found)
3. [New AI-Powered Workflow](#new-ai-powered-workflow)
4. [Aldi Pricing Data Sources](#aldi-pricing-data-sources)
5. [AI Agent Architecture](#ai-agent-architecture)
6. [Implementation Plan](#implementation-plan)
7. [Cost Calculation Improvements](#cost-calculation-improvements)
8. [Testing & Validation](#testing--validation)

---

## Current System Analysis

### How Pricing Works Today

**Data Flow:**
```
Notion Database (Manual Entry)
    ↓
Supabase `ingredients` table (209 items, 94.7% with prices)
    ↓
Recipe uses ingredients with quantities
    ↓
Unit conversion (backend/utils/unitConversions.js)
    ↓
Cost calculation (src/api/recipeCostCalculator.js)
    ↓
Recipe total cost & cost per serving
```

**Problems:**
1. ⚠️ **Manual data entry** - Not scalable for dynamic recipes
2. ⚠️ **No real-time pricing** - Data gets stale
3. ⚠️ **Inaccurate unit conversions** - Only ~10 ingredients have density data
4. ⚠️ **Package rounding inflates costs** - No pantry carryover logic
5. ⚠️ **Web scrapers are broken** - Outdated HTML selectors
6. ⚠️ **"oz" ambiguity** - Volume vs weight confusion

**Data Quality:**
- 209 ingredients in database
- 198 (94.7%) have complete pricing
- 11 (5.3%) missing prices
- No ingredient-specific densities for most items

---

## Critical Issues Found

### 1. DUPLICATE UNIT CONVERSION LOGIC ⚠️
**Impact:** HIGH

**Problem:** Two separate implementations produce different results
- `backend/utils/unitConversions.js` - Backend version
- `src/utils/unitConversions.js` - Frontend version

**Example inconsistency:**
```javascript
// Backend: 1 tbsp = 14.79 ml
// Frontend: 1 tbsp = 14.7868 ml
// Results in different recipe costs!
```

**Fix:** Use ONE implementation shared across frontend and backend.

---

### 2. INCOMPLETE DENSITY CONVERSIONS ⚠️
**Impact:** HIGH

**Problem:** Converting "2 cups flour" to cost requires knowing flour's density (g/ml or oz/cup). Only ~10 ingredients have this data.

**Current densities:**
- Water/Milk: 1 cup = 8 oz (weight)
- Flour: 1 cup = 4.25 oz
- Rice: 1 cup = 7 oz
- Sugar: 0.85 g/ml
- Butter: 0.911 g/ml
- Honey: 1.42 g/ml

**Missing:** 200+ other ingredients fall back to generic estimates like "1 cup dry ingredient = ~5 oz" which is INACCURATE.

**Example failure:**
- Recipe calls for "2 cups diced onions"
- No density for onions → falls back to generic estimate
- Cost could be off by 30-50%

---

### 3. "OZ" AMBIGUITY ⚠️
**Impact:** MEDIUM

**Problem:** "oz" means TWO different things:
- **Fluid ounces (fl oz):** Volume measurement
- **Ounces (oz):** Weight measurement

**Example:**
- "8 oz milk" - Is this 8 fl oz (volume) or 8 oz by weight?
- Database has both interpretations!

**Fix:** Force all volume measurements to use "fl oz" explicitly.

---

### 4. PACKAGE ROUNDING INFLATES COSTS ⚠️
**Impact:** MEDIUM

**Problem:** Always rounds UP to nearest whole package
```javascript
// Need 6 oz from 16 oz package
// Math.ceil(6/16) = 1 package
// Cost = full $3 (correct for purchasing)

// But next recipe needs 8 oz → buys ANOTHER package
// Real cost should use leftover from first recipe!
```

**Missing:** Pantry carryover logic to track leftovers across week.

---

### 5. NO ALDI-SPECIFIC INGREDIENT KNOWLEDGE ⚠️
**Impact:** CRITICAL for AI generation

**Problem:** AI doesn't know what ingredients Aldi actually sells

**When AI generates recipes, it might suggest:**
- "Organic quinoa" (Aldi may not stock)
- "Fresh cilantro" (seasonal availability unknown)
- "Specialty cheeses" (expensive, limited selection)

**Need:** Aldi ingredient catalog with:
- What Aldi sells
- Typical prices
- Package sizes
- Availability (always vs seasonal)
- Category (produce, meat, dairy, etc.)

---

## New AI-Powered Workflow

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│           AI RECIPE GENERATION WORKFLOW                  │
└─────────────────────────────────────────────────────────┘

1. ALDI INGREDIENT KNOWLEDGE BASE
   ├─ Scrape/Update Aldi catalog (weekly)
   ├─ Store in Supabase with:
   │  ├─ item name
   │  ├─ price_per_package
   │  ├─ package_size & unit
   │  ├─ category
   │  ├─ availability (always/seasonal)
   │  ├─ density (for conversions)
   │  └─ average_unit_weight (for "each" items)
   └─ ~500-1000 items (Aldi's full catalog)

2. RECIPE DISCOVERY (Web Scraping + AI)
   ├─ Scrape budget recipe sites
   ├─ Extract: ingredients, quantities, instructions
   └─ Pass to AI Ingredient Matcher

3. INGREDIENT MATCHING AGENT (LangChain)
   ├─ For each recipe ingredient:
   │  ├─ Match to Aldi catalog (fuzzy matching)
   │  ├─ If not found → suggest substitute
   │  └─ If no substitute → reject recipe
   ├─ Verify ALL ingredients are Aldi items
   └─ Output: Matched recipe with Aldi ingredient IDs

4. COST CALCULATION AGENT (LangChain)
   ├─ For each ingredient:
   │  ├─ Convert recipe quantity to package units
   │  ├─ Handle volume↔weight with densities
   │  ├─ Calculate packages needed (w/ pantry logic)
   │  └─ Multiply by package price
   ├─ Sum total recipe cost
   └─ Output: Detailed cost breakdown

5. RECIPE GENERATION AGENT (LangChain + Gemini)
   ├─ Prompt: "Generate dinner recipe using ONLY these Aldi ingredients: [catalog]"
   ├─ Constraints:
   │  ├─ Budget: under $X total
   │  ├─ Servings: 4
   │  ├─ Prep time: under 45 min
   │  ├─ Ingredients: 5-12 items
   │  └─ All ingredients MUST be from provided catalog
   ├─ AI generates structured recipe
   └─ Pass to Cost Calculation Agent for validation

6. RECIPE VALIDATION & RATING
   ├─ Validate cost is within budget
   ├─ Check ingredient availability
   ├─ User rates recipe after cooking
   ├─ Feedback loop: adjust AI prompts based on ratings
   └─ Save to database with moderation status

7. MEAL PLAN GENERATION (Existing LangChain Agent)
   ├─ Select from validated, cost-calculated recipes
   ├─ Optimize for budget, variety, pantry usage
   └─ Generate weekly meal plan
```

---

## Aldi Pricing Data Sources

### Option 1: Third-Party Scraping APIs (RECOMMENDED)

Based on research, several services provide Aldi pricing data through web scraping:

**Services Available:**
1. **[Apify's Ultimate ALDI Scraper](https://apify.com/eneiromatos/ultimate-aldi-scraper/api)**
   - Cost: $0.005/result
   - Data: Product name, price, category, availability
   - API-based, easy integration

2. **[Xbyte.io Aldi API](https://www.xbyte.io/aldi-api/)**
   - Real-time grocery data access
   - Contact for pricing

3. **[Actowiz Solutions](https://www.actowizsolutions.com/aldi-grocery-pricing-data-scraping.php)**
   - Pricing data scraping services
   - Custom scraping solutions

**Pros:**
- ✅ Professional service, maintained selectors
- ✅ Handles website changes automatically
- ✅ API-based, easy integration
- ✅ Legal compliance handled by provider

**Cons:**
- ❌ Cost per API call (~$0.005 per item)
- ❌ Ongoing subscription fees
- ❌ Dependent on third-party service

**Recommendation:** Use for production. Budget ~$50-100/month for weekly updates of 500-1000 items.

---

### Option 2: Direct Web Scraping (DIY)

**Current Implementation:**
- File: `/scripts/fetch-aldi-prices.js`
- Uses Puppeteer to scrape aldi.us
- **Status: LIKELY BROKEN** (selectors outdated)

**Challenges:**
- Aldi website doesn't have official API
- HTML structure changes frequently
- Rate limiting and IP blocking risks
- Maintenance burden (update selectors monthly)

**Pros:**
- ✅ No ongoing API costs
- ✅ Full control over data

**Cons:**
- ❌ High maintenance (selectors break)
- ❌ Ethical/legal gray area
- ❌ Rate limiting issues
- ❌ Unreliable (breaks when site updates)

**Recommendation:** Only for development/testing. Use Option 1 for production.

---

### Option 3: Instacart API (Aldi Powered by Instacart)

**[Instacart API](https://apitracker.io/a/instacart)**
- Aldi partners with Instacart for delivery
- Instacart has developer API: [docs.instacart.com/connect/](https://docs.instacart.com/connect/)

**Pricing Considerations:**
- ⚠️ Instacart marks up Aldi prices 10-30%
- Aldi maintains 25-40% price advantage even with markup
- Not true "Aldi in-store" prices

**Pros:**
- ✅ Official API access
- ✅ Reliable, maintained
- ✅ Includes availability data

**Cons:**
- ❌ Marked-up prices (not true Aldi prices)
- ❌ API access may require Instacart partnership
- ❌ Costs unclear (enterprise API?)

**Recommendation:** Good fallback if Option 1 unavailable. Document that prices include delivery markup.

---

### Option 4: Manual + Community Crowdsourcing

**Hybrid Approach:**
1. **Core catalog (300 most common items):** Manually entered/updated monthly
2. **Community contributions:** Users submit prices during grocery shopping
3. **Verification:** AI validates submissions for outliers

**Implementation:**
```javascript
// User submits price while shopping
POST /api/prices/submit
{
  ingredientId: "uuid",
  priceObserved: 3.99,
  location: "Chicago, IL",
  dateSeen: "2025-01-06"
}

// AI validates (flag if >20% different from current price)
// Average submissions to get regional pricing
```

**Pros:**
- ✅ Community-driven, scalable
- ✅ Regional price variations
- ✅ Low cost (no API fees)

**Cons:**
- ❌ Requires user base
- ❌ Data quality variable
- ❌ Slow to bootstrap

**Recommendation:** Long-term strategy. Start with Option 1, add crowdsourcing later.

---

## AI Agent Architecture

### 1. Aldi Ingredient Catalog Agent

**Purpose:** Maintain up-to-date Aldi ingredient catalog

**File:** `backend/ai/agents/ingredientCatalogAgent.js`

**Tasks:**
- Fetch Aldi prices weekly (via Apify API or scraper)
- Update Supabase `ingredients` table
- Track price changes over time
- Flag discontinued items
- Add new items to catalog

**LangChain Tools:**
- `apifyScraperTool` - Call Apify API
- `supabaseIngredientTool` - Update database
- `priceValidationTool` - Check for outliers

**Output:**
```json
{
  "itemsUpdated": 487,
  "priceChanges": [
    {"item": "Ground Beef 80/20", "oldPrice": 3.99, "newPrice": 4.29, "change": "+7.5%"}
  ],
  "newItems": ["Organic Quinoa", "..."],
  "discontinued": ["Seasonal Item X"]
}
```

---

### 2. Ingredient Matching Agent

**Purpose:** Match recipe ingredients to Aldi catalog

**File:** `backend/ai/agents/ingredientMatchingAgent.js`

**Tasks:**
- Parse recipe ingredient text ("2 cups diced onions")
- Extract quantity, unit, ingredient name
- Fuzzy match to Aldi catalog
- Suggest substitutes if no exact match
- Reject recipe if too many non-Aldi ingredients

**LangChain Prompt:**
```
You are an expert at matching recipe ingredients to Aldi grocery items.

ALDI CATALOG (items we sell):
[JSON list of 500 Aldi items]

RECIPE INGREDIENT: "2 cups diced yellow onions"

TASK:
1. Parse quantity: 2, unit: cups, item: yellow onions
2. Find best match in Aldi catalog
3. If no exact match, suggest substitute
4. Return structured output

RULES:
- Only match to items in catalog
- Prefer exact matches over substitutes
- If no match possible, return null

Output JSON:
{
  "matched": true,
  "aldiIngredientId": "uuid",
  "aldiIngredientName": "Yellow Onions (3 lb bag)",
  "confidence": 0.95,
  "substitute": null
}
```

---

### 3. Cost Calculation Agent (Intelligent)

**Purpose:** Calculate accurate recipe costs with AI-assisted unit conversion

**File:** `backend/ai/agents/costCalculationAgent.js`

**Why AI?**
- Handles ambiguous units ("1 medium onion" → "~0.5 lb")
- Contextual density lookups ("1 cup milk" vs "1 cup flour")
- Smart package optimization (use pantry leftovers)

**LangChain Prompt:**
```
You are an expert at calculating grocery costs.

INGREDIENT NEEDED:
- Item: Yellow Onions
- Quantity: 2 cups diced
- Recipe servings: 4

ALDI PACKAGE:
- Item: Yellow Onions (3 lb bag)
- Price: $2.99
- Package size: 3 lb

CONVERSION DATA:
- 1 medium onion ≈ 0.5 lb
- 1 cup diced onions ≈ 0.25 lb (after dicing shrinkage)

PANTRY:
- User has 0 lb onions in pantry

CALCULATE:
1. Convert "2 cups diced" to pounds
   2 cups × 0.25 lb/cup = 0.5 lb needed

2. Check pantry: 0 lb available
   Still need: 0.5 lb

3. Calculate packages needed:
   0.5 lb / 3 lb per package = 0.167 packages
   Round up: 1 package ($2.99)

4. Update pantry:
   After recipe: 3 lb - 0.5 lb = 2.5 lb leftover

Output JSON:
{
  "costForRecipe": 2.99,
  "packagesNeeded": 1,
  "quantityUsed": "0.5 lb",
  "pantryBefore": "0 lb",
  "pantryAfter": "2.5 lb",
  "reasoning": "Need 0.5 lb onions. Bought 3 lb bag for $2.99. Will have 2.5 lb leftover."
}
```

**Key Innovation:** AI tracks pantry across recipes in the weekly meal plan, reducing inflated costs.

---

### 4. Recipe Generation Agent (Aldi-Only)

**Purpose:** Generate new budget recipes using ONLY Aldi ingredients

**File:** `backend/ai/agents/recipeGenerationAgent.js`

**LangChain Prompt:**
```
You are a budget-conscious chef who ONLY uses Aldi ingredients.

ALDI INGREDIENT CATALOG (you MUST only use these):
{aldiCatalog}

USER REQUEST: "Quick chicken dinner under $12 for 4 people"

CONSTRAINTS:
- Budget: $12 total (not per serving)
- Servings: 4
- Prep time: Under 30 minutes
- Ingredients: 5-10 items
- ALL ingredients MUST be from the Aldi catalog above
- Prefer cheaper cuts/items

THINK STEP-BY-STEP:
1. What protein fits budget? (Check Aldi chicken prices)
2. What vegetables are cheap at Aldi?
3. What pantry staples? (rice, pasta cheap at Aldi)
4. Calculate estimated cost as you build recipe
5. Adjust if over budget

Generate a complete recipe with:
- Name
- Ingredient list (with quantities)
- Instructions (numbered steps)
- Estimated cost breakdown
- Category (Chicken/Beef/Pork/Vegetarian/Seafood)

Output JSON:
{
  "name": "One-Pan Chicken & Rice",
  "category": "Chicken",
  "servings": 4,
  "prepTime": 25,
  "ingredients": [
    {
      "aldiIngredientId": "uuid",
      "aldiIngredientName": "Chicken Thighs (2 lb pack)",
      "quantity": 1.5,
      "unit": "lb",
      "estimatedCost": 3.99
    },
    ...
  ],
  "instructions": ["Step 1...", "Step 2..."],
  "totalCost": 11.50,
  "costPerServing": 2.88,
  "reasoning": "Used chicken thighs ($3.99) instead of breasts to save money. Rice and frozen veggies keep cost low."
}
```

**Validation:** Pass output through Cost Calculation Agent to verify budget.

---

### 5. Recipe Scraping & Enrichment Agent

**Purpose:** Find budget recipes online and convert to Aldi-only versions

**File:** `backend/ai/agents/recipeScrapingAgent.js`

**Workflow:**
```
1. Scrape budget recipe sites (BudgetBytes, Allrecipes, etc.)
   ↓
2. Extract: name, ingredients, instructions
   ↓
3. Pass to Ingredient Matching Agent
   ↓
4. If 80%+ ingredients match Aldi → keep recipe
5. If <80% match → AI suggests Aldi substitutes
   ↓
6. Pass to Cost Calculation Agent
   ↓
7. Save to database with source URL
```

**LangChain for Substitution:**
```
Original recipe calls for:
- "1 lb ground turkey"

Aldi catalog has:
- Ground beef 80/20 ($3.99/lb)
- Ground pork ($2.99/lb)
- NO ground turkey

AI suggests: "Substitute ground pork (cheaper, similar texture)"
```

---

## Implementation Plan

### Phase 1: Fix Current System (Week 1)

**Priority: CRITICAL BUGS**

1. **Unify Unit Conversion Logic**
   - Delete `src/utils/unitConversions.js`
   - Use only `backend/utils/unitConversions.js`
   - Import in frontend via API call or shared module

2. **Fix "oz" Ambiguity**
   - Update all ingredients: force "fl oz" for volume
   - Update database: add `unit_type` column ('weight', 'volume', 'count')
   - Migration script to fix existing data

3. **Add Density Data**
   - Create `ingredient_densities` table
   - Add densities for top 50 ingredients
   - Update unit conversion to use densities

4. **Fix Notion Recipe Cost Calculator**
   - Update `scripts/recalculate-recipe-costs.js`
   - Use proper `calculateIngredientCost()` function
   - Account for quantities and units

**Deliverables:**
- ✅ One unit conversion implementation
- ✅ "oz" explicitly means weight, "fl oz" means volume
- ✅ 50 ingredient densities added
- ✅ Accurate recipe costs in database

---

### Phase 2: Aldi Ingredient Catalog (Week 2)

**Goal:** Build comprehensive Aldi ingredient catalog

**Tasks:**

1. **Choose Pricing Data Source**
   - Evaluate Apify API (recommended)
   - Sign up and test API
   - Budget: $50-100/month

2. **Create Aldi Catalog Agent**
   - File: `backend/ai/agents/ingredientCatalogAgent.js`
   - Integrate Apify API
   - Weekly automated runs (cron job)

3. **Enhance Database Schema**
   ```sql
   ALTER TABLE ingredients ADD COLUMN density REAL; -- g/ml or oz/cup
   ALTER TABLE ingredients ADD COLUMN average_weight REAL; -- for "each" items
   ALTER TABLE ingredients ADD COLUMN availability TEXT; -- 'always', 'seasonal', 'regional'
   ALTER TABLE ingredients ADD COLUMN aldi_category TEXT; -- Produce, Meat, Dairy, etc.
   ALTER TABLE ingredients ADD COLUMN last_price_update TIMESTAMP;
   ALTER TABLE ingredients ADD COLUMN unit_type TEXT; -- 'weight', 'volume', 'count'
   ```

4. **Initial Catalog Population**
   - Run agent to fetch ~500-1000 Aldi items
   - Manually verify top 100 items
   - Add densities for common items

**Deliverables:**
- ✅ 500+ Aldi ingredients with current prices
- ✅ Automated weekly price updates
- ✅ Enhanced database with density/availability

---

### Phase 3: AI Cost Calculation (Week 3)

**Goal:** Replace manual cost calculation with AI agent

**Tasks:**

1. **Implement Cost Calculation Agent**
   - File: `backend/ai/agents/costCalculationAgent.js`
   - Use LangChain + Gemini
   - Structured output with Zod

2. **Add Pantry Carryover Logic**
   - Track leftovers across week's recipes
   - Reduce costs for subsequent uses
   - Update pantry table after calculations

3. **Create Cost Validation Tool**
   - Verify AI calculations against manual calculations
   - Flag discrepancies >10%
   - Build test suite with 50 recipes

4. **API Endpoint**
   ```javascript
   POST /api/recipes/calculate-cost
   {
     recipeId: "uuid",
     servings: 4,
     pantryContext: {...} // optional
   }
   ```

**Deliverables:**
- ✅ AI-powered cost calculation agent
- ✅ Pantry carryover logic
- ✅ 95%+ accuracy on test suite

---

### Phase 4: Ingredient Matching Agent (Week 4)

**Goal:** Match any recipe to Aldi ingredients

**Tasks:**

1. **Implement Ingredient Matching Agent**
   - File: `backend/ai/agents/ingredientMatchingAgent.js`
   - Fuzzy matching with AI
   - Substitution suggestions

2. **Build Substitution Knowledge Base**
   - Common substitutions (ground turkey → ground pork)
   - Aldi-specific (name brand → Aldi brand)
   - Store in database for reuse

3. **API Endpoint**
   ```javascript
   POST /api/ingredients/match
   {
     ingredientText: "2 cups diced yellow onions",
     recipeContext: {...}
   }
   ```

**Deliverables:**
- ✅ Ingredient matching agent
- ✅ Substitution database
- ✅ 90%+ match rate on test recipes

---

### Phase 5: Recipe Generation Agent (Week 5)

**Goal:** AI generates Aldi-only recipes

**Tasks:**

1. **Implement Recipe Generation Agent**
   - File: `backend/ai/agents/recipeGenerationAgent.js`
   - Constrain to Aldi catalog only
   - Budget-aware generation

2. **Prompt Engineering**
   - Test different prompts
   - Optimize for:
     - Budget accuracy (<5% error)
     - Variety (different cuisines)
     - Simplicity (5-10 ingredients)

3. **Validation Pipeline**
   - Generate recipe → Match ingredients → Calculate cost → Validate budget
   - Retry if validation fails (up to 3 attempts)

4. **API Endpoint**
   ```javascript
   POST /api/recipes/generate
   {
     budget: 12,
     servings: 4,
     category: "Chicken",
     prepTime: 30,
     preferences: {...}
   }
   ```

**Deliverables:**
- ✅ Recipe generation agent
- ✅ 100% Aldi-only ingredients
- ✅ <5% budget error rate

---

### Phase 6: Recipe Scraping & Enrichment (Week 6)

**Goal:** Scrape budget recipes and convert to Aldi versions

**Tasks:**

1. **Update Recipe Scraper**
   - File: `backend/scrapers/recipesScraper.js`
   - Target sites: BudgetBytes, Allrecipes, etc.
   - Extract structured data

2. **Build Enrichment Pipeline**
   ```
   Scraped Recipe
     → Ingredient Matching Agent (convert to Aldi)
     → Cost Calculation Agent (verify budget)
     → Moderation Queue (human review)
     → Published Recipe
   ```

3. **Automated Scraping**
   - Schedule weekly scraping (cron)
   - Target: 10-20 new recipes per week
   - Filter: only recipes <$15 total

**Deliverables:**
- ✅ Automated recipe scraping
- ✅ 80%+ successful Aldi conversions
- ✅ 10+ new recipes per week

---

### Phase 7: Integration & Testing (Week 7)

**Goal:** Integrate all agents into meal planning system

**Tasks:**

1. **Update Meal Planning Agent**
   - Use new cost calculation agent
   - Filter recipes by accurate costs
   - Display cost breakdowns to user

2. **Add Cost Explanations to UI**
   ```javascript
   // Show user:
   "Chicken Stir Fry - $8.50"
   "Why this cost?"
   - Chicken thighs (2 lb): $3.99
   - Mixed vegetables (frozen): $2.49
   - Rice (1 cup from 5 lb bag): $0.32
   - Soy sauce (2 tbsp from bottle): $0.15
   - Cooking oil (1 tbsp): $0.05
   Total: $7.00 (using pantry leftovers)
   Display: $8.50 (if buying all fresh)
   ```

3. **User Feedback Loop**
   - After cooking, ask: "Was the cost accurate?"
   - If not, collect actual cost
   - Update pricing data
   - Retrain agent prompts

4. **Comprehensive Testing**
   - Test 100 meal plans
   - Verify budget accuracy
   - Check variety constraints
   - Monitor AI token costs

**Deliverables:**
- ✅ Fully integrated AI pricing system
- ✅ User-facing cost explanations
- ✅ Feedback loop implemented
- ✅ 95%+ budget accuracy

---

## Cost Calculation Improvements

### Enhanced Unit Conversion

**Add Ingredient-Specific Conversions:**

```sql
CREATE TABLE ingredient_conversions (
  id UUID PRIMARY KEY,
  ingredient_id TEXT REFERENCES ingredients(id),
  from_unit TEXT NOT NULL,
  to_unit TEXT NOT NULL,
  conversion_factor REAL NOT NULL,
  notes TEXT
);

-- Example data:
INSERT INTO ingredient_conversions VALUES
  ('uuid1', 'onions-id', 'medium', 'lb', 0.5, '1 medium onion ≈ 0.5 lb'),
  ('uuid2', 'onions-id', 'cup', 'lb', 0.25, '1 cup diced onions ≈ 0.25 lb'),
  ('uuid3', 'flour-id', 'cup', 'oz', 4.25, '1 cup all-purpose flour ≈ 4.25 oz'),
  ('uuid4', 'milk-id', 'cup', 'fl oz', 8, '1 cup milk = 8 fl oz (volume)');
```

### Pantry Carryover System

**Track Leftovers Across Week:**

```javascript
// When calculating costs for weekly meal plan:
const pantry = { /* user's current pantry */ };

for (const meal of weeklyMeals) {
  const cost = await costCalculationAgent.calculate({
    recipe: meal.recipe,
    pantry: pantry, // Current pantry state
    updatePantry: true // Update pantry after calculation
  });

  // Agent updates pantry with leftovers
  // Next meal can use those leftovers

  meal.actualCost = cost.costAfterPantryUse;
  meal.costBreakdown = cost.breakdown;
}

// Result: More accurate weekly costs (accounts for package overlap)
```

**Example:**
```
Monday: Tacos (need 1 lb ground beef from 2 lb package) → Cost: $5.99, Leftover: 1 lb
Tuesday: Spaghetti (need 1 lb ground beef) → Cost: $0 (use leftover), Leftover: 0 lb
Wednesday: Chicken (no beef needed) → Leftover still: 0 lb

Weekly total: $5.99 (not $5.99 × 2 = $11.98)
```

---

## Testing & Validation

### Unit Tests

**File:** `tests/unit/aiCostCalculation.test.js`

```javascript
describe('AI Cost Calculation Agent', () => {
  test('calculates simple recipe cost', async () => {
    const recipe = {
      ingredients: [
        { item: 'Ground Beef 80/20', quantity: 1, unit: 'lb' }
      ]
    };

    const cost = await costCalculationAgent.calculate(recipe);

    expect(cost.totalCost).toBeCloseTo(3.99, 0.1);
  });

  test('handles unit conversions', async () => {
    const recipe = {
      ingredients: [
        { item: 'Milk', quantity: 2, unit: 'cup' }
      ]
    };

    const cost = await costCalculationAgent.calculate(recipe);

    // 2 cups = 16 fl oz from 64 fl oz (0.5 gal) jug at $2.99
    expect(cost.totalCost).toBeCloseTo(0.75, 0.1);
  });

  test('uses pantry leftovers', async () => {
    const pantry = {
      'ground-beef-id': { quantity: 0.5, unit: 'lb' }
    };

    const recipe = {
      ingredients: [
        { item: 'Ground Beef 80/20', quantity: 1, unit: 'lb' }
      ]
    };

    const cost = await costCalculationAgent.calculate(recipe, { pantry });

    // Need 1 lb, have 0.5 lb → buy 2 lb package for $5.99
    expect(cost.totalCost).toBe(5.99);
    expect(cost.pantryUsed).toBeCloseTo(0.5, 0.1);
  });
});
```

### Integration Tests

**File:** `tests/integration/mealPlanCosts.test.js`

```javascript
describe('Weekly Meal Plan Cost Accuracy', () => {
  test('generates plan within budget', async () => {
    const plan = await generateMealPlan({
      userId: 'test-user',
      weekStart: '2025-01-06',
      budget: 75
    });

    expect(plan.totalCost).toBeLessThanOrEqual(75);
    expect(plan.totalCost).toBeGreaterThan(50); // Sanity check
  });

  test('accounts for pantry carryover', async () => {
    const plan = await generateMealPlan({
      userId: 'test-user',
      weekStart: '2025-01-06',
      budget: 75,
      trackPantry: true
    });

    // Should show savings from shared ingredients
    expect(plan.totalCostWithoutPantry).toBeGreaterThan(plan.totalCost);
  });
});
```

### Validation Checklist

Before deploying:

- [ ] 95%+ budget accuracy on 100 test meal plans
- [ ] All Aldi ingredients have current prices (updated within 30 days)
- [ ] Unit conversions tested for top 50 ingredients
- [ ] AI-generated recipes validated by human chef
- [ ] Cost breakdowns match manual calculations
- [ ] Pantry carryover reduces costs correctly
- [ ] User feedback loop functional

---

## Summary

### What We're Building

**Old System:**
- Manual Notion data entry
- Inaccurate cost calculations
- Static recipe library
- No AI intelligence

**New System:**
- ✅ Automated Aldi price updates (weekly)
- ✅ AI-powered cost calculations (accurate to ±5%)
- ✅ Dynamic recipe generation (Aldi ingredients only)
- ✅ Intelligent ingredient matching
- ✅ Pantry carryover logic (true weekly costs)
- ✅ Continuous learning from user feedback

### Cost Estimate

**API Costs (Monthly):**
- Apify Aldi scraping: ~$50-100 (500-1000 items, weekly updates)
- Gemini API (cost calculations): ~$10-20 (1000 calculations/month)
- Gemini API (recipe generation): ~$30-50 (500 recipes/month)
- **Total: ~$90-170/month**

**Development Time:**
- 7 weeks for full implementation
- 1-2 developers

**ROI:**
- Accurate budgeting saves users $10-20/week
- Dynamic recipes increase user engagement
- Scalable system (no manual data entry)

---

## Next Steps

1. **Approve architecture** - Review this document
2. **Choose pricing source** - Apify recommended
3. **Start Phase 1** - Fix critical bugs (Week 1)
4. **Implement incrementally** - Test each phase thoroughly
5. **Gather user feedback** - Iterate on prompts and logic

---

## Sources

- [Apify's Ultimate ALDI Scraper](https://apify.com/eneiromatos/ultimate-aldi-scraper/api)
- [Xbyte.io Aldi API](https://www.xbyte.io/aldi-api/)
- [Actowiz Solutions Aldi Pricing](https://www.actowizsolutions.com/aldi-grocery-pricing-data-scraping.php)
- [Instacart API Documentation](https://apitracker.io/a/instacart)
- [Instacart Aldi Pricing Analysis](https://www.historytools.org/consumer/aldi-instacart)

---

**Last Updated:** 2025-12-20
**Version:** 1.0
