# Implementation Status - Codebase Review Plan

**Date:** January 27, 2025  
**Status:** In Progress

---

## ✅ Completed Tasks

### Priority 1: Verify Supabase Setup
- ✅ Created `scripts/verify-supabase-setup.js` - Verification script
- ✅ Added `npm run verify:supabase` command to package.json
- ⏳ **Action Required:** Run `npm run verify:supabase` to check Supabase state

### Priority 2: Fix Script Import Paths
- ✅ Fixed import paths in 33+ scripts:
  - Changed `../src/notion/notionClient.js` → `../backend/notion/notionClient.js`
  - Changed `../src/utils/unitConversions.js` → `../backend/utils/unitConversions.js`
- ✅ Fixed files:
  - `scripts/generate-meal-plan.js`
  - `scripts/add-recipe-interactive.js`
  - `scripts/generate-grocery-list.js`
  - `scripts/calc-recipe-costs.js`
  - `scripts/calc-recipe-costs-v2.js`
  - `scripts/calc-recipe-costs-v3.js`
  - `scripts/fetch-notion-databases.js`
  - `scripts/calculate-recipe-costs.js`
  - `scripts/check-missing-status.js`
  - `scripts/generate-ingredient-table.js`
  - `scripts/import-csv-prices-simple.js`
  - `scripts/import-csv-prices.js`
  - `scripts/populate-missing-ingredients.js`
  - `scripts/fetch-prices-advanced.js`
  - `scripts/fetch-aldi-prices.js`
  - `scripts/bulk-update-ingredients.js`
  - `scripts/populate-package-data.js`
  - `scripts/calculate-ingredient-units.js`
  - `scripts/analyze-database-structure.js`
  - `scripts/test-queries.js`

---

## ⏳ Next Steps (In Order)

### Step 1: Verify Supabase Setup (15 min)
```bash
npm run verify:supabase
```

**What to check:**
- Which tables exist
- How many records in each table
- Which tables need to be created

**If tables are missing:**
- Run `docs/PANTRY_TABLES_SQL.sql` in Supabase SQL Editor
- Run `docs/PANTRY_RPC_FUNCTION.sql` in Supabase SQL Editor

---

### Step 2: Test Script Import Fixes (10 min)
```bash
# Test meal plan generator (read-only)
node scripts/generate-meal-plan.js --read-only

# Test recipe cost calculator (dry-run)
node scripts/calc-recipe-costs-v3.js --dry-run
```

**Expected:** Scripts should run without import errors

**If errors occur:**
- Check error message
- Verify `backend/notion/notionClient.js` exists
- Verify environment variables are set

---

### Step 3: Link Recipe Ingredients (2-3 hours)

**Option A: Use existing script**
```bash
node scripts/create-missing-ingredient-links.js
```

**Option B: Manual linking**
```bash
# Use interactive recipe tool
npm run add:recipe
```

**Goal:** All recipes have linked ingredients in `linkedIngredientIds` field

---

### Step 4: Calculate Recipe Costs (30 min)
```bash
# Recalculate all recipe costs
npm run calc:costs:v3 -- --update

# Or dry-run first to see what would change
npm run calc:costs:v3 -- --dry-run
```

**Goal:** All recipes have accurate `cost` and `costPerServing` values

---

### Step 5: Complete Pantry Feature (1-2 hours)

**If tables don't exist:**
1. Open Supabase Dashboard → SQL Editor
2. Run `docs/PANTRY_TABLES_SQL.sql`
3. Run `docs/PANTRY_RPC_FUNCTION.sql`
4. Verify with `npm run verify:supabase`

**Test pantry functionality:**
```sql
-- Add test pantry item
INSERT INTO user_pantry (ingredient_id, quantity, unit, source)
SELECT id, 1.0, 'lb', 'test'
FROM ingredients
WHERE item ILIKE '%chicken%'
LIMIT 1;

-- Find recipes using pantry
SELECT * FROM find_recipes_with_pantry_items(
  ARRAY(SELECT ingredient_id FROM user_pantry)
);
```

---

## 📋 Testing Checklist

### Scripts
- [ ] `npm run verify:supabase` - Runs without errors
- [ ] `node scripts/generate-meal-plan.js --read-only` - Runs without import errors
- [ ] `node scripts/add-recipe-interactive.js` - Can add recipes
- [ ] `npm run calc:costs:v3` - Calculates costs correctly

### Supabase
- [ ] Core tables exist: `ingredients`, `recipes`, `recipe_ingredients`
- [ ] Pantry tables exist: `user_pantry`, `meal_plans`, `grocery_lists`
- [ ] RPC function exists: `find_recipes_with_pantry_items`
- [ ] Data exists in tables (check counts)

### Data Quality
- [ ] Recipes have linked ingredients
- [ ] Recipe costs are calculated
- [ ] Ingredients have prices

---

## 🔧 Known Issues

### Issue 1: Import Paths Fixed ✅
**Status:** All import paths updated to use `../backend/` instead of `../src/`

### Issue 2: Supabase Tables Status Unknown ⏳
**Action:** Run `npm run verify:supabase` to check

### Issue 3: Recipe Ingredient Links Missing ⏳
**Action:** Run ingredient linking script or manual linking

### Issue 4: Recipe Costs Not Calculated ⏳
**Action:** Run cost calculation script after linking ingredients

---

## 📊 Progress Summary

**Completed:**
- ✅ Import path fixes (33+ files)
- ✅ Verification script created
- ✅ Package.json updated

**In Progress:**
- ⏳ Supabase verification (needs manual run)
- ⏳ Script testing (needs manual run)

**Pending:**
- ⏳ Recipe ingredient linking
- ⏳ Cost calculation
- ⏳ Pantry table creation
- ⏳ End-to-end testing

---

## 🎯 Success Criteria

**Short Term (This Week):**
- [ ] All scripts run without import errors
- [ ] Supabase tables verified/created
- [ ] At least 10 recipes have linked ingredients
- [ ] Recipe costs calculated for linked recipes

**Medium Term (This Month):**
- [ ] All recipes have ingredient links
- [ ] All recipe costs calculated
- [ ] Pantry feature functional
- [ ] End-to-end meal plan generation works

---

## 📝 Notes

- All import paths have been fixed to use `backend/` directory
- Verification script created but needs to be run manually
- Scripts should now work if Notion API is configured
- Next step is to verify Supabase setup and decide on data migration strategy

---

**Last Updated:** January 27, 2025

