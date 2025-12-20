# Flexible Date Range System
## From Rigid Weekly to AI-Powered Custom Scheduling

**Problem:** App is locked into rigid Mon-Sun weekly cycles. Real life is flexible - sometimes you need 4 days, sometimes 10, starting mid-week.

**Solution:** AI-native flexible date range system that lets users plan "today through end of year" (Dec 20-31 = 12 days) or "next 4 days" with natural language.

---

## Table of Contents

1. [Current System Analysis](#current-system-analysis)
2. [Problems with Weekly Assumption](#problems-with-weekly-assumption)
3. [New Flexible System Design](#new-flexible-system-design)
4. [Database Schema Changes](#database-schema-changes)
5. [AI Agent Redesign](#ai-agent-redesign)
6. [Natural Language Interface](#natural-language-interface)
7. [Implementation Plan](#implementation-plan)
8. [Migration Strategy](#migration-strategy)

---

## Current System Analysis

### The "Weekly" Assumption is EVERYWHERE

I investigated the codebase and found **37+ files** with hardcoded weekly assumptions:

**Database:**
- `meal_plans.week_start_date` - Column name assumes weeks
- `day_of_week INTEGER CHECK (0-6)` - Hardcoded 7 days
- UNIQUE constraint on `(week_start_date, day_of_week)` - Assumes week boundaries

**Algorithms:**
- `const budgetPerMeal = budget / 7` - Hardcoded division by 7
- `weekPlan = [Sunday, Monday, ..., Saturday]` - Hardcoded 7-day array
- `.length(7)` - Zod schema enforces exactly 7 meals

**Frontend:**
- `getMonday(date)` - Forces Monday as start day
- `changeWeek(direction * 7)` - Navigation in 7-day increments
- "Week of [date]" - UI text assumes weekly
- `formatWeekRange(start, end)` - Assumes `end = start + 6 days`

**AI Agents:**
```javascript
const mealSchema = z.object({
  day: z.enum(["Monday", "Tuesday", ..., "Sunday"])
});

const mealPlanSchema = z.object({
  meals: z.array(mealSchema).length(7) // Exactly 7!
});
```

**Prompts:**
```
"Must select exactly 7 recipes (one per day: Monday-Sunday)"
```

---

## Problems with Weekly Assumption

### 1. **Real Life Isn't Weekly**

**Your actual use case:**
- Today: Dec 20 (Friday)
- Want: Plan through end of year (Dec 31)
- Duration: 12 days (not 7!)
- Start: Mid-week, not Monday

**Other common scenarios:**
- Going on vacation: "Plan 4 days before I leave"
- Payday budgeting: "Plan 10 days until next paycheck"
- Meal prep Sunday: "Plan next 5 weekdays only"
- Sporadic cooking: "Just plan 3 dinners this week"

### 2. **Forced Monday Start**

Current system forces everything to align with Monday:
- Dec 20 (Friday) → System wants to plan for Dec 16 (Monday) - Dec 22 (Sunday)
- But you already ate Mon-Thu!
- You're wasting 4 days of the plan

### 3. **Rigid 4-Meal Structure**

Code has hardcoded schedule:
```javascript
Mon: Cook
Tue: Cook
Wed: Leftovers
Thu: Cook
Fri: Leftovers
Sat: Cook
Sun: Leftovers
```

**Your needs might be:**
- Cook every other day (4 meals over 8 days)
- Cook 3 times, eat out once (4 days)
- Cook 5 days straight for meal prep (5 days)

### 4. **Budget Division is Wrong**

```javascript
const budgetPerMeal = budget / 7
```

If you're only cooking 4 meals in 7 days, this should be:
```javascript
const budgetPerMeal = budget / 4  // Number of cooking days!
```

### 5. **Grocery Lists are Per-Week Only**

Can't generate: "Groceries for Dec 20-31 trip"

---

## New Flexible System Design

### Core Philosophy: Let AI Handle Complexity

**Old approach:** Hardcode 7 days, Mon-Sun, 4 meals
**New approach:** User says what they want, AI figures out the rest

### User Intent Examples

**Natural language interface:**
```
"Plan dinner from today through end of year"
→ AI interprets: Dec 20-31 (12 days)

"Plan next 4 days starting tomorrow"
→ AI interprets: Dec 21-24 (4 days)

"Plan this week, I want to cook Monday, Wednesday, Friday"
→ AI interprets: Dec 23-29 (7 days), 3 cooking days

"Give me 5 dinners for next week"
→ AI interprets: Dec 23-29 (7 days), 5 cooking days + 2 leftovers

"Plan through Christmas"
→ AI interprets: Dec 20-25 (6 days)
```

### Flexible Parameters

Replace rigid weekly structure with:

```typescript
interface MealPlanRequest {
  // Date range (flexible)
  startDate: string;           // "2025-12-20" or "today"
  endDate?: string;             // "2025-12-31" or "end of year"
  duration?: number;            // Alternative: 4-30 days

  // Budget (context-aware)
  budget: number;               // Total budget for this plan
  budgetPer?: 'plan' | 'day' | 'meal';  // How to interpret budget

  // Cooking schedule (user choice)
  cookingPattern?: 'every-day' | 'every-other' | 'custom';
  cookingDays?: number[];       // [0, 2, 4] = day 0, 2, 4 of plan
  leftoverDays?: number[];      // [1, 3, 5] = leftover days
  orderOutDays?: number[];      // [6] = ordering out on day 6

  // Preferences
  servings: number;
  dietaryPreferences?: string[];
  avoidIngredients?: string[];
}
```

### AI-Powered Date Parsing

**LangChain agent interprets natural language:**

```javascript
// User Input: "Plan from today through end of year"

// AI Agent Output:
{
  startDate: "2025-12-20",
  endDate: "2025-12-31",
  duration: 12,
  cookingDays: [0, 2, 4, 6, 8, 10],  // Every other day suggestion
  leftoverDays: [1, 3, 5, 7, 9, 11],
  budgetPer: 'plan',  // $75 total, not per day
  interpretation: "Planning 12 days from Dec 20-31. I suggest cooking every other day (6 meals) with leftovers in between."
}
```

---

## Database Schema Changes

### Current Schema (Weekly)

```sql
CREATE TABLE meal_plans (
  id TEXT PRIMARY KEY,
  week_start_date DATE NOT NULL,              -- ❌ Assumes weekly
  day_of_week INTEGER CHECK (0-6),            -- ❌ Only 7 days
  meal_type TEXT DEFAULT 'dinner',
  recipe_id TEXT,
  is_leftover_night BOOLEAN,
  is_order_out_night BOOLEAN,
  UNIQUE(week_start_date, day_of_week, meal_type)  -- ❌ Week boundary
);
```

### New Schema (Flexible)

```sql
CREATE TABLE meal_plans (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,

  -- Flexible date range
  plan_start_date DATE NOT NULL,              -- ✅ Any start date
  plan_end_date DATE NOT NULL,                -- ✅ Calculated end
  plan_duration INTEGER NOT NULL,             -- ✅ 4-30 days

  -- Day within plan (0-indexed from start)
  day_offset INTEGER NOT NULL,                -- ✅ 0 to (duration - 1)
  meal_date DATE NOT NULL,                    -- ✅ Actual date of meal

  -- Meal details
  meal_type TEXT DEFAULT 'dinner',
  recipe_id TEXT REFERENCES recipes(id),
  is_leftover_night BOOLEAN DEFAULT FALSE,
  is_order_out_night BOOLEAN DEFAULT FALSE,
  notes TEXT,

  -- Budget tracking
  estimated_cost REAL,
  actual_cost REAL,                           -- ✅ User can update after shopping

  -- Status
  status TEXT DEFAULT 'planned',              -- planned, completed, skipped
  completed_at TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CONSTRAINT meal_plans_day_offset_valid
    CHECK (day_offset >= 0 AND day_offset < plan_duration),

  CONSTRAINT meal_plans_date_match
    CHECK (meal_date = plan_start_date + day_offset),

  UNIQUE(user_id, plan_start_date, plan_duration, day_offset, meal_type)
);

-- Index for querying plans
CREATE INDEX idx_meal_plans_user_dates
  ON meal_plans(user_id, plan_start_date, plan_end_date);

CREATE INDEX idx_meal_plans_meal_date
  ON meal_plans(user_id, meal_date);
```

### Migration Script

```sql
-- Step 1: Add new columns to existing table
ALTER TABLE meal_plans ADD COLUMN plan_end_date DATE;
ALTER TABLE meal_plans ADD COLUMN plan_duration INTEGER DEFAULT 7;
ALTER TABLE meal_plans ADD COLUMN day_offset INTEGER;
ALTER TABLE meal_plans ADD COLUMN meal_date DATE;
ALTER TABLE meal_plans ADD COLUMN estimated_cost REAL;
ALTER TABLE meal_plans ADD COLUMN actual_cost REAL;

-- Step 2: Populate new columns from old data
UPDATE meal_plans
SET
  plan_end_date = week_start_date + INTERVAL '6 days',
  plan_duration = 7,
  day_offset = day_of_week,
  meal_date = week_start_date + (day_of_week || ' days')::INTERVAL;

-- Step 3: Make new columns NOT NULL after population
ALTER TABLE meal_plans ALTER COLUMN plan_end_date SET NOT NULL;
ALTER TABLE meal_plans ALTER COLUMN plan_duration SET NOT NULL;
ALTER TABLE meal_plans ALTER COLUMN day_offset SET NOT NULL;
ALTER TABLE meal_plans ALTER COLUMN meal_date SET NOT NULL;

-- Step 4: Rename old column for backward compatibility
ALTER TABLE meal_plans RENAME COLUMN week_start_date TO plan_start_date;

-- Step 5: Drop old constraints
ALTER TABLE meal_plans DROP CONSTRAINT IF EXISTS meal_plans_day_of_week_check;
ALTER TABLE meal_plans DROP CONSTRAINT IF EXISTS meal_plans_user_week_day_meal_unique;

-- Step 6: Add new constraints
ALTER TABLE meal_plans
  ADD CONSTRAINT meal_plans_day_offset_valid
  CHECK (day_offset >= 0 AND day_offset < plan_duration);

ALTER TABLE meal_plans
  ADD CONSTRAINT meal_plans_user_plan_day_meal_unique
  UNIQUE (user_id, plan_start_date, plan_duration, day_offset, meal_type);

-- Step 7: Create new indexes
CREATE INDEX idx_meal_plans_user_dates
  ON meal_plans(user_id, plan_start_date, plan_end_date);

CREATE INDEX idx_meal_plans_meal_date
  ON meal_plans(user_id, meal_date);

-- Step 8: Update grocery_lists table
ALTER TABLE grocery_lists RENAME COLUMN week_start_date TO plan_start_date;
ALTER TABLE grocery_lists ADD COLUMN plan_end_date DATE;
ALTER TABLE grocery_lists ADD COLUMN plan_duration INTEGER DEFAULT 7;
```

---

## AI Agent Redesign

### Flexible Meal Planning Agent

**File:** `backend/ai/agents/flexibleMealPlanningAgent.js`

```javascript
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod";

// Flexible schema (4-30 days)
const mealSchema = z.object({
  dayOffset: z.number().min(0).describe("Day offset from plan start (0 = first day)"),
  mealDate: z.string().describe("ISO date (YYYY-MM-DD)"),
  recipe_id: z.string().uuid().optional(),
  recipe_name: z.string(),
  estimated_cost: z.number().positive(),
  category: z.string(),
  mealType: z.enum(['cooking', 'leftovers', 'order-out']),
  reasoning: z.string().min(20)
});

const mealPlanSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  duration: z.number().min(4).max(30),
  meals: z.array(mealSchema).min(4).max(30),  // ✅ Flexible length!
  cookingDays: z.array(z.number()).describe("Day offsets where user cooks"),
  total_cost: z.number().positive(),
  budget_remaining: z.number(),
  daily_breakdown: z.array(z.object({
    date: z.string(),
    dayOffset: z.number(),
    meals: z.array(mealSchema),
    dailyCost: z.number()
  })),
  variety_analysis: z.string(),
  cooking_schedule_rationale: z.string().describe("Why this cooking schedule makes sense")
});

const FLEXIBLE_MEAL_PLANNING_PROMPT = `You are an expert meal planner who creates FLEXIBLE meal plans based on user needs.

USER REQUEST:
- Start Date: {startDate}
- End Date: {endDate}
- Duration: {duration} days
- Budget: ${"{budget}"} (total for entire period)
- Servings: {servings}

FLEXIBLE SCHEDULING:
The user can cook on any day. You should suggest a smart cooking schedule based on:
- Plan duration (shorter plans = cook more often, longer plans = strategic spacing)
- Budget (higher budget = more variety, cook more often)
- Meal prep efficiency (cook in batches, use leftovers strategically)

SUGGESTED PATTERNS:
- 4-5 days: Cook every other day (2-3 cooking days)
- 6-9 days: Cook Mon/Wed/Fri pattern (3-4 cooking days)
- 10-14 days: Cook twice a week + meal prep (4-5 cooking days)
- 15+ days: Weekly meal prep + fresh meals (6-8 cooking days)

But be flexible! Adjust based on budget and preferences.

AVAILABLE RECIPES (choose from this list):
{recipes}

RECENT RECIPES TO AVOID (past 4 weeks):
{recent_recipe_ids}

USER PREFERENCES:
{preferences}

TASK:
1. Analyze the duration and budget
2. Suggest optimal cooking days (which days to cook new meals)
3. Plan leftover days (reuse previous meals)
4. Select recipes that fit budget and variety
5. Explain your cooking schedule rationale

CONSTRAINTS:
- Total cost MUST NOT exceed ${"{budget}"}
- Must have at least Math.ceil(duration / 3) cooking days (cook regularly)
- Avoid repeating same category 2 cooking days in a row
- Don't use recipes from recent_recipe_ids list

OUTPUT:
Create a day-by-day plan from {startDate} to {endDate}.
For each day, specify:
- dayOffset (0 to {duration}-1)
- mealDate (actual date)
- mealType ('cooking', 'leftovers', or 'order-out')
- If cooking: recipe details
- If leftovers: which previous meal to eat

Explain why this cooking schedule makes sense for this duration.

{format_instructions}

Generate the meal plan now:`;

export async function generateFlexibleMealPlan({
  userId,
  startDate,        // "2025-12-20"
  endDate,          // "2025-12-31" (optional, or use duration)
  duration,         // 12 (optional, or calculate from dates)
  budget,
  servings = 4,
  cookingPattern = 'auto',  // 'auto' | 'every-day' | 'every-other' | 'custom'
  customCookingDays = []    // [0, 2, 4, 6] for custom pattern
}) {

  // Calculate duration if not provided
  if (!duration && startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  }

  // Calculate end date if not provided
  if (!endDate && startDate && duration) {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + duration - 1);
    endDate = end.toISOString().split('T')[0];
  }

  console.log(`\n🤖 [Flexible Meal Planner] Generating plan`);
  console.log(`   ${startDate} to ${endDate} (${duration} days)`);
  console.log(`   Budget: $${budget} total`);

  // Fetch recipes, past plans, preferences (same as before)
  const { getRecipes } = await import('../../supabase/recipeClient.js');

  const recipes = await getRecipes({
    maxCostPerServing: budget / Math.ceil(duration / 2), // Rough estimate
    limit: 50
  });

  // Get recent plans (not by week, by actual date range)
  const fourWeeksAgo = new Date(startDate);
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  const { data: recentPlans } = await supabase
    .from('meal_plans')
    .select('recipe_id')
    .eq('user_id', userId)
    .gte('meal_date', fourWeeksAgo.toISOString().split('T')[0])
    .lt('meal_date', startDate)
    .not('recipe_id', 'is', null);

  const recentRecipeIds = [...new Set(recentPlans?.map(p => p.recipe_id) || [])];

  // Initialize LLM
  const model = new ChatGoogleGenerativeAI({
    modelName: "gemini-1.5-pro",
    temperature: 0.8,
    apiKey: process.env.GEMINI_API_KEY
  });

  // Format prompt
  const outputParser = StructuredOutputParser.fromZodSchema(mealPlanSchema);
  const promptTemplate = PromptTemplate.fromTemplate(FLEXIBLE_MEAL_PLANNING_PROMPT);

  const formattedPrompt = await promptTemplate.format({
    startDate,
    endDate,
    duration,
    budget,
    servings,
    recipes: JSON.stringify(recipes.map(r => ({
      id: r.id,
      name: r.name,
      category: r.category,
      cost: r.cost_per_serving
    })), null, 2),
    recent_recipe_ids: recentRecipeIds.join(", ") || "none",
    preferences: JSON.stringify({likes: "variety", dislikes: "none"}),
    format_instructions: outputParser.getFormatInstructions()
  });

  // Call AI
  const response = await model.invoke(formattedPrompt);
  const plan = await outputParser.parse(response.content);

  // Validate
  if (plan.total_cost > budget * 1.05) {
    throw new Error(`Plan exceeds budget: $${plan.total_cost} > $${budget}`);
  }

  if (plan.meals.length !== duration) {
    throw new Error(`Plan has ${plan.meals.length} meals but duration is ${duration} days`);
  }

  // Save to database
  const mealsToSave = plan.meals.map(meal => ({
    user_id: userId,
    plan_start_date: startDate,
    plan_end_date: endDate,
    plan_duration: duration,
    day_offset: meal.dayOffset,
    meal_date: meal.mealDate,
    recipe_id: meal.recipe_id,
    meal_type: 'dinner',
    is_leftover_night: meal.mealType === 'leftovers',
    is_order_out_night: meal.mealType === 'order-out',
    estimated_cost: meal.estimated_cost,
    status: 'planned'
  }));

  const { error } = await supabase
    .from('meal_plans')
    .insert(mealsToSave);

  if (error) throw error;

  console.log(`✅ Saved ${mealsToSave.length} meals to database`);

  return {
    success: true,
    plan: {
      startDate,
      endDate,
      duration,
      meals: plan.meals,
      cookingDays: plan.cookingDays,
      totalCost: plan.total_cost,
      budgetRemaining: plan.budget_remaining,
      dailyBreakdown: plan.daily_breakdown
    },
    aiAnalysis: {
      variety_analysis: plan.variety_analysis,
      cooking_schedule_rationale: plan.cooking_schedule_rationale
    }
  };
}
```

---

## Natural Language Interface

### Date Parsing Agent

**File:** `backend/ai/agents/dateParsing Agent.js`

**Handles natural language like:**
- "Today through end of year" → Dec 20-31 (12 days)
- "Next 4 days" → Dec 21-24
- "This weekend" → Dec 21-22 (2 days)
- "Through Christmas" → Dec 20-25 (6 days)
- "Next week starting Monday" → Dec 23-29 (7 days)

```javascript
const DATE_PARSING_PROMPT = `You are a date range parser. Convert natural language to start/end dates.

TODAY'S DATE: {today}

USER INPUT: "{userInput}"

EXAMPLES:
- "today through end of year" → start: {today}, end: 2025-12-31
- "next 4 days" → start: tomorrow, duration: 4
- "this weekend" → start: next Saturday, end: next Sunday
- "through Christmas" → start: {today}, end: 2025-12-25
- "next week" → start: next Monday, end: next Sunday

OUTPUT JSON:
{
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "duration": number,
  "interpretation": "Human-readable explanation"
}`;
```

### User Interface Mockup

```jsx
<MealPlannerForm>
  {/* Natural language input */}
  <TextInput
    placeholder="When do you want to plan? (e.g., 'today through end of year')"
    value={dateInput}
    onChange={handleDateInput}
  />

  {/* AI interprets and shows */}
  {parsedDates && (
    <DateRangeSummary>
      Planning: {parsedDates.startDate} to {parsedDates.endDate}
      ({parsedDates.duration} days)
    </DateRangeSummary>
  )}

  {/* Or use date pickers */}
  <DateRangePicker
    startDate={startDate}
    endDate={endDate}
    onChange={handleDateChange}
  />

  {/* Budget for this plan */}
  <BudgetInput
    label="Total budget for this plan"
    value={budget}
    onChange={setBudget}
    hint={`~$${(budget / parsedDates.duration).toFixed(2)} per day`}
  />

  {/* Cooking pattern (optional) */}
  <CookingPatternSelect
    value={cookingPattern}
    options={[
      {value: 'auto', label: 'Let AI decide (recommended)'},
      {value: 'every-day', label: 'Cook every day'},
      {value: 'every-other', label: 'Cook every other day'},
      {value: 'custom', label: 'I\'ll choose specific days'}
    ]}
  />

  <Button onClick={generatePlan}>
    Generate {parsedDates.duration}-Day Meal Plan
  </Button>
</MealPlannerForm>
```

---

## Implementation Plan

### Phase 1: Database Migration (Week 1)
**Goal:** Support both old and new formats

**Tasks:**
1. Run migration script (add new columns)
2. Populate `plan_duration`, `day_offset`, `meal_date` from old data
3. Update indexes
4. Test with existing data
5. Deploy migration

**Deliverables:**
- ✅ Database supports flexible date ranges
- ✅ Old weekly data still works
- ✅ Backward compatible

---

### Phase 2: Backend API Updates (Week 1-2)
**Goal:** Accept flexible date range parameters

**Tasks:**
1. Update API endpoints to accept:
   - `startDate` (instead of weekStartDate)
   - `endDate` or `duration`
   - Optional `cookingPattern`
2. Update database queries to use new schema
3. Keep old parameters working (backward compat)

**Files to update:**
- `server/index.js` - All meal plan endpoints
- `backend/supabase/mealPlanClient.js` - Query functions
- `src/api/mealPlanGenerator.js` - Frontend API calls

**Deliverables:**
- ✅ API accepts flexible date ranges
- ✅ Old weekly requests still work

---

### Phase 3: AI Agent Redesign (Week 2)
**Goal:** Generate variable-length meal plans

**Tasks:**
1. Create `flexibleMealPlanningAgent.js`
2. Update Zod schemas for flexible arrays
3. Rewrite prompts to handle variable durations
4. Add cooking pattern suggestions
5. Test with various durations (4, 7, 10, 14 days)

**Deliverables:**
- ✅ AI generates 4-30 day plans
- ✅ Smart cooking day suggestions
- ✅ Accurate cost calculations

---

### Phase 4: Date Parsing Agent (Week 2)
**Goal:** Natural language date input

**Tasks:**
1. Create `dateParsingAgent.js`
2. Handle common phrases ("today through end of year")
3. Return structured date ranges
4. Add to UI as optional input method

**Deliverables:**
- ✅ Natural language date parsing
- ✅ User-friendly date input

---

### Phase 5: Frontend Updates (Week 3)
**Goal:** UI for flexible date ranges

**Tasks:**
1. Replace week navigation with date range picker
2. Update `WeeklyPlanView` → `MealPlanView` (generic)
3. Display day-by-day view (not just Mon-Sun)
4. Update grocery list to show date range
5. Add natural language input field

**Files to update:**
- `src/pages/WeeklyPlanView.jsx` → `MealPlanView.jsx`
- `src/pages/GroceryListView.jsx`
- `src/pages/HomeView.jsx`
- `src/utils/dateHelpers.js`
- `src/components/DayCard.jsx`

**Deliverables:**
- ✅ UI supports flexible date ranges
- ✅ Natural language input
- ✅ Day-by-day view

---

### Phase 6: Testing & Polish (Week 3-4)
**Goal:** Ensure everything works

**Tasks:**
1. Test with various date ranges:
   - 4 days (short trip)
   - 7 days (traditional week)
   - 10 days (between paydays)
   - 14 days (bi-weekly planning)
   - 30 days (monthly planning)
2. Test budget accuracy
3. Test cooking pattern suggestions
4. User acceptance testing
5. Fix bugs

**Deliverables:**
- ✅ All durations work correctly
- ✅ Budget calculations accurate
- ✅ AI suggestions make sense

---

### Phase 7: Deprecate Old Code (Week 4)
**Goal:** Clean up weekly-only code

**Tasks:**
1. Remove `getMonday()` utility
2. Remove hardcoded 7-day arrays
3. Remove "week of" UI text
4. Update documentation

**Deliverables:**
- ✅ Clean codebase
- ✅ No weekly assumptions remaining

---

## Migration Strategy

### Backward Compatibility During Transition

**Support both formats:**

```javascript
// API endpoint accepts both old and new formats
app.post('/api/meal-plan/generate', async (req, res) => {
  const {
    // Old format (backward compat)
    weekStartDate,

    // New format
    startDate,
    endDate,
    duration
  } = req.body;

  // Convert old format to new
  let planStartDate = startDate || weekStartDate;
  let planDuration = duration;
  let planEndDate = endDate;

  if (weekStartDate && !startDate) {
    // Old weekly format
    planStartDate = weekStartDate;
    planDuration = 7;
    const start = new Date(weekStartDate);
    start.setDate(start.getDate() + 6);
    planEndDate = start.toISOString().split('T')[0];
  }

  // Use new flexible agent
  const plan = await generateFlexibleMealPlan({
    userId: req.user.id,
    startDate: planStartDate,
    endDate: planEndDate,
    duration: planDuration,
    budget: req.body.budget
  });

  res.json(plan);
});
```

### Database Queries Work for Both

```javascript
// Query works for both old weekly and new flexible plans
const { data: mealPlans } = await supabase
  .from('meal_plans')
  .select('*')
  .eq('user_id', userId)
  .gte('meal_date', startDate)  // NEW: Query by actual date
  .lte('meal_date', endDate)
  .order('meal_date');
```

---

## Summary

### What Changes

**User Experience:**
- ❌ Old: Rigid Mon-Sun weeks only
- ✅ New: Flexible "today through end of year" (any duration)

**Date Input:**
- ❌ Old: Week picker (Mon-Sun only)
- ✅ New: Natural language ("next 4 days") or date range picker

**Meal Plans:**
- ❌ Old: Always exactly 7 days
- ✅ New: 4-30 days, AI suggests optimal cooking schedule

**Budget:**
- ❌ Old: "Weekly budget" ÷ 7
- ✅ New: "Total budget for this plan" ÷ actual cooking days

**UI:**
- ❌ Old: "Week of Dec 16 - Dec 22"
- ✅ New: "Dec 20-31 (12 days)" or "Next 4 days"

### What Stays the Same

- Recipe selection logic
- Cost calculations (per ingredient)
- Grocery list generation
- Pantry tracking
- User preferences
- Rating system

### Timeline

**4 weeks total:**
- Week 1: Database + backend
- Week 2: AI agents
- Week 3: Frontend
- Week 4: Testing + cleanup

### Effort

- **Development:** 3-4 weeks
- **Complexity:** Medium-high (core data model change)
- **Risk:** Low (backward compatible migration)

---

## Next Steps

1. **Approve architecture** - Review this design
2. **Start database migration** - Week 1 task
3. **Update AI agent** - Test with flexible dates
4. **Build natural language input** - User-friendly interface
5. **Iterate based on feedback** - Real-world testing

---

**Your Use Case Unlocked:**
```
Input: "Plan from today (Dec 20) through end of year"

AI Response:
"Planning 12 days (Dec 20-31) for $75 budget.

I suggest cooking 6 times:
- Dec 20 (Fri): Chicken Stir Fry ($8.50)
- Dec 22 (Sun): Beef Tacos ($10.25)
- Dec 24 (Tue): Pasta Primavera ($6.75)
- Dec 26 (Thu): Pork Chops ($9.00)
- Dec 28 (Sat): Veggie Curry ($7.25)
- Dec 30 (Mon): Salmon ($11.50)

Leftover days: Dec 21, 23, 25, 27, 29, 31

Total: $53.25
Remaining: $21.75

This schedule gives you variety, uses leftovers strategically, and stays well under budget."
```

**That's the power of flexible, AI-native meal planning!** 🚀

---

**Last Updated:** 2025-12-20
**Version:** 1.0
