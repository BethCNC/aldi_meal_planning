# Pantry First Feature - Implementation Plan

**Status:** Ready to implement  
**Priority:** High - Core feature for meal planning  
**Estimated Time:** 2-3 hours

---

## ✅ Current Status

**What You Have:**
- ✅ Supabase configured and connected
- ✅ Base schema exists (ingredients, recipes, recipe_ingredients, units, unit_conversions)
- ✅ Data migrated from Notion

**What's Missing:**
- ❌ `user_pantry` table (store ingredients you have on hand)
- ❌ `meal_plans` table (weekly meal planning calendar)
- ❌ `grocery_lists` table (generated shopping lists)
- ❌ `pantry_usage` table (optional - track when pantry items are used)

---

## 🎯 Implementation Steps

### Step 1: Create Missing Tables (15 minutes)

**Location:** Supabase Dashboard → SQL Editor → New Query

**Action:** Copy and run the SQL script from `docs/PANTRY_TABLES_SQL.sql` (create this file)

**Verification:**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('user_pantry', 'meal_plans', 'grocery_lists', 'pantry_usage');
```

Should return 4 rows.

---

### Step 2: Create RPC Function for Recipe Matching (10 minutes)

**Location:** Supabase Dashboard → SQL Editor

**Action:** Copy and run the SQL function from `docs/PANTRY_RPC_FUNCTION.sql`

**What it does:** Finds recipes that use ingredients currently in your pantry

**Verification:**
```sql
SELECT find_recipes_with_pantry_items(ARRAY['ingredient-id-1', 'ingredient-id-2']);
```

---

### Step 3: Test Queries Manually (15 minutes)

**Location:** Supabase Dashboard → SQL Editor

Run these test queries to verify everything works:

1. **Add test pantry item:**
```sql
INSERT INTO user_pantry (ingredient_id, quantity, unit, source)
SELECT id, 1.0, 'lb', 'test'
FROM ingredients
WHERE item ILIKE '%chicken%'
LIMIT 1;
```

2. **Find recipes using pantry:**
```sql
SELECT * FROM find_recipes_with_pantry_items(
  ARRAY(SELECT ingredient_id FROM user_pantry)
);
```

3. **Check expiring items:**
```sql
SELECT * FROM user_pantry 
WHERE use_by_date <= CURRENT_DATE + INTERVAL '7 days'
   OR must_use = TRUE;
```

---

### Step 4: Build Node.js Helper Functions (30 minutes)

**File to create:** `src/supabase/pantryClient.js`

**Functions needed:**
- `addPantryItem(ingredientId, quantity, unit, options)`
- `getPantryItems()`
- `findRecipesWithPantry(pantryIngredientIds)`
- `createMealPlan(weekStartDate, meals)`
- `generateGroceryList(weekStartDate)`

**Test:** Run `node scripts/test-pantry.js` (create this test script)

---

### Step 5: Build CLI Tool (Optional - 30 minutes)

**File to create:** `scripts/manage-pantry.js`

**Usage:**
```bash
# Add items to pantry
node scripts/manage-pantry.js add "chicken breast" 2 lb

# List pantry
node scripts/manage-pantry.js list

# Find recipes using pantry
node scripts/manage-pantry.js recipes

# Clear pantry
node scripts/manage-pantry.js clear
```

---

### Step 6: Update Meal Plan Generator (45 minutes)

**File to modify:** `scripts/generate-meal-plan.js`

**Add pantry-first logic:**
1. Check for pantry items
2. Find recipes using pantry items
3. Prioritize these recipes in meal plan
4. Only add missing ingredients to grocery list

**New usage:**
```bash
# Generate plan using pantry items
node scripts/generate-meal-plan.js --use-pantry --budget 75

# Standard plan (ignore pantry)
node scripts/generate-meal-plan.js --budget 75
```

---

### Step 7: Update Grocery List Generator (30 minutes)

**File to modify:** `scripts/generate-grocery-list.js`

**Add pantry deduction:**
1. Get all ingredients needed for the week
2. Subtract pantry quantities
3. Only show items that need to be purchased
4. Calculate actual cost based on remaining quantities

---

## 📁 Files to Create

1. **`docs/PANTRY_TABLES_SQL.sql`** - SQL for creating new tables
2. **`docs/PANTRY_RPC_FUNCTION.sql`** - SQL RPC function for recipe matching
3. **`src/supabase/pantryClient.js`** - Node.js client functions
4. **`scripts/test-pantry.js`** - Test script for pantry functions
5. **`scripts/manage-pantry.js`** - CLI tool for pantry management

---

## 🧪 Testing Checklist

- [ ] Tables created successfully
- [ ] Can insert pantry items
- [ ] RPC function returns matching recipes
- [ ] Grocery list excludes pantry items
- [ ] Meal plan prioritizes pantry recipes
- [ ] Cost calculations account for pantry usage

---

## 🚀 Quick Start (Do This First)

1. **Run SQL to create tables** (copy from next section)
2. **Test with manual queries** (verify it works)
3. **Build pantryClient.js** (start with basic functions)
4. **Test pantryClient.js** (make sure connections work)
5. **Update meal plan generator** (add pantry-first logic)

---

## Next Steps After Implementation

1. **Build React UI** (if you want a web interface)
2. **Add Claude API integration** (for recipe suggestions when no matches)
3. **Add expiration tracking** (remind users of expiring items)
4. **Add analytics** (track pantry usage over time)

---

## Questions?

- Check `docs/SQL_QUERIES.md` for SQL examples
- Review `docs/SUPABASE_QUICK_START.md` for setup help
- Test queries in Supabase SQL Editor first before coding
