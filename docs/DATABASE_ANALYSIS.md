# Notion Database Analysis Results

**Date:** January 27, 2025  
**Status:** ✅ Code updated to match your actual database structure

---

## 📊 Database Structure Analysis

### **✅ Ingredients Database** (`Aldi Ingredients`)

**Actual Properties:**
- `Item` (title) ✅
- `Cost` (number) ✅
- `Unit` (rich_text) ✅
- `Category` (select) ✅
- `Price per unit` (number) - Extra property
- `Notes` (rich_text) ✅
- `Recipe` (relation → Recipes) - Extra property

**Fixed in Code:**
- Changed `'Line Item'` → `'Item'`
- Changed `'Average Unit Price ($)'` → `'Cost'`
- Removed `'Last Priced At'` (doesn't exist in your database)

**Category Options:**
- 🥦 Veggie
- 🧀 Dairy
- 🍎 Fruit
- 🥩 Meat
- 🧊 Frozen
- 🍪 Snack
- 🧂Staple
- 🍞 Starch/Carb
- 💪 Meal Replacement
- 🧻 Household Item
- 🧄 Spice/Condiment
- Other

---

### **✅ Recipes Database** (`Aldi Recipes`)

**Actual Properties:**
- `Recipe Name` (title) ✅
- `Category` (select) ✅
- `Cost ($)` (number) ✅
- `Cost per Serving ($)` (number) ✅
- `Servings` (number) ✅
- `Recipe Ingredients` (rich_text) ✅
- `Instructions` (rich_text) ✅
- `Source/Link` (url) ✅
- `Database Ingredients ` (relation) ⚠️ **Trailing space!**
- `Tags` (multi_select) ✅
- `Rating` (select) ✅
- `Notes` (rich_text) - Extra property

**Fixed in Code:**
- Changed `'Database Ingredients'` → `'Database Ingredients '` (with trailing space)

**Category Options:**
- Beef
- Chicken
- Pork
- Vegetarian
- Seafood
- Other

**Rating Options:**
- ★
- ★★
- ★★★
- ★★★★
- ★★★★★

---

### **❌ Meal Planner Database**

**Issue Found:**
The ID in your `.env` (`18b86edc-ae2c-80e6-98a0-e6e9a83efbdd`) is a **PAGE**, not a database.

**What This Means:**
- The meal planner might be inside a page (sub-database)
- Or you need to get the actual database ID

**How to Fix:**
1. Open your Meal Planner in Notion
2. Click the "..." menu → "Copy link"
3. The database ID is in the URL: `notion.so/workspace/[DATABASE_ID]?v=...`
4. Update `.env` with the correct database ID

**Or create a new database:**
1. Create a new database in Notion
2. Add these properties:
   - `Date` (date)
   - `Meal` (relation → Recipes database)
   - `Day of Week` (select)
   - `Week Number` (number)
   - `Notes` (rich_text)
3. Get the database ID from the URL
4. Update `.env` with `NOTION_ALDI_WEEKLY_MEAL_PLANNING_DB_ID`

---

## 🔧 Code Changes Made

### **Files Updated:**

1. **`src/notion/notionClient.js`**
   - ✅ Fixed `createIngredient()` - uses `Item` and `Cost`
   - ✅ Fixed `findIngredient()` - searches `Item` property
   - ✅ Fixed `updateIngredientPrice()` - updates `Cost` property
   - ✅ Fixed `createRecipe()` - uses `Database Ingredients ` (with space)
   - ✅ Fixed `linkRecipeToIngredients()` - uses `Database Ingredients ` (with space)
   - ✅ Fixed `searchIngredient()` - searches `Item` property

2. **`scripts/add-recipe-interactive.js`**
   - ✅ Fixed ingredient cost lookup - uses `Cost` property

3. **`scripts/generate-grocery-list.js`**
   - ✅ Fixed ingredient name lookup - uses `Item` property
   - ✅ Fixed ingredient cost lookup - uses `Cost` property
   - ✅ Fixed recipe ingredient relation - handles trailing space

4. **`scripts/calc-recipe-costs.js`**
   - ✅ Fixed ingredient cost lookup - uses `Cost` property
   - ✅ Fixed recipe ingredient relation - handles trailing space

5. **`scripts/generate-meal-plan.js`**
   - ✅ Fixed ingredient overlap calculation - handles trailing space

---

## ✅ Next Steps

1. **Fix Meal Planner Database ID:**
   - Get the correct database ID (not page ID)
   - Update `.env` with `NOTION_ALDI_WEEKLY_MEAL_PLANNING_DB_ID`

2. **Test Recipe Addition:**
   ```bash
   npm run add:recipe
   ```

3. **Test Cost Calculation:**
   ```bash
   npm run calc:costs
   ```

4. **Test Meal Plan Generation:**
   ```bash
   npm run plan:generate -- --budget 75
   ```

---

## 🎯 Summary

**All property names now match your actual Notion databases!** ✅

The code has been updated to use:
- `Item` (not `Line Item`)
- `Cost` (not `Average Unit Price ($)`)
- `Database Ingredients ` (with trailing space)

**One remaining issue:** Meal Planner database ID needs to be corrected (currently pointing to a page, not a database).

---

**Status:** Ready to test once Meal Planner database ID is fixed!
