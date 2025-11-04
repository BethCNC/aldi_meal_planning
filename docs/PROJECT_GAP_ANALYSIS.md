# Project Gap Analysis - Aldi Meal Planning Automation

**Date:** January 27, 2025  
**Status:** Foundation exists, but core automation scripts are missing

---

## 📊 Current State Assessment

### ✅ What EXISTS and is Working

1. **Notion API Integration**
   - `src/notion/notionClient.js` - Basic Notion client with ingredient CRUD operations
   - `src/notion/syncToNotion.js` - Price syncing from JSON to Notion
   - Environment setup (`.env` file exists with API keys)

2. **Data Collection Infrastructure**
   - Web scrapers for prices and recipes (though currently extracting poor quality data)
   - JSON data storage in `data/prices/` and `data/recipes/`
   - Utility functions for HTTP, parsing, delays

3. **Project Documentation**
   - Comprehensive workflow documentation in `.cursor/rules/`
   - Clear project goals and vision outlined
   - Technical specifications defined

### ❌ Critical Gaps Identified

#### **Gap 1: No Scripts Directory**
- **Status:** Missing entirely
- **Impact:** High - No place for automation scripts
- **Solution:** Create `scripts/` directory

#### **Gap 2: No Recipe Addition Tool**
- **Status:** Missing `scripts/add-recipe-interactive.js`
- **Impact:** Critical - Can't easily add recipes to Notion
- **Current Workaround:** Manual entry in Notion (time-consuming)
- **Solution:** Build interactive CLI tool

#### **Gap 3: No Meal Plan Generator**
- **Status:** Missing `scripts/generate-meal-plan.js`
- **Impact:** Critical - Core automation goal unfulfilled
- **Solution:** Build budget-aware meal plan generator

#### **Gap 4: No Grocery List Generator**
- **Status:** Missing `scripts/generate-grocery-list.js`
- **Impact:** High - Can't export shopping lists for print/digital use
- **Solution:** Build grocery list consolidator from meal plans

#### **Gap 5: No Recipe Cost Calculator**
- **Status:** Missing `scripts/calc-recipe-costs.js`
- **Impact:** High - Can't auto-calculate costs from linked ingredients
- **Solution:** Build cost calculation utility

#### **Gap 6: No Meal Planner Database Integration**
- **Status:** Missing
- **Impact:** High - Can't create meal plan entries in Notion
- **Issue:** `NOTION_MEAL_PLANNER_DB_ID` not in codebase
- **Solution:** 
  - Confirm if Meal Planner database exists in Notion
  - Add database ID to `.env`
  - Build meal plan creation functions

#### **Gap 7: Property Name Mismatches**
- **Status:** Potential issue
- **Issue:** Code uses `'Line Item'` and `'Average Unit Price ($)'` but docs mention `'Item'` and `'Cost'`
- **Impact:** Medium - May cause API errors if properties don't match
- **Solution:** Verify actual Notion property names match code

#### **Gap 8: Missing npm Scripts**
- **Status:** No automation scripts in `package.json`
- **Impact:** Medium - Can't use commands like `npm run add:recipe` or `npm run plan:generate`
- **Solution:** Add npm scripts for all automation tools

#### **Gap 9: No Recipe Query Functions**
- **Status:** Missing in `notionClient.js`
- **Impact:** High - Can't query recipes for meal planning
- **Solution:** Add functions to query recipes with filters

#### **Gap 10: No Meal Plan Creation Functions**
- **Status:** Missing in `notionClient.js`
- **Impact:** High - Can't create meal plan entries
- **Solution:** Add functions to create meal plan pages

---

## 🔍 Detailed Gap Analysis

### **Recipe Management Gaps**

**Current Capabilities:**
- ✅ Can create/update ingredients in Notion
- ✅ Can find ingredients by name

**Missing Capabilities:**
- ❌ Can't create recipes in Notion
- ❌ Can't query recipes from Notion
- ❌ Can't link recipes to ingredients (relations)
- ❌ Can't calculate recipe costs automatically
- ❌ Can't search recipes by category, cost, or other filters

**Required Functions:**
```javascript
// Need to add to src/notion/notionClient.js:
- createRecipe(recipeData)
- findRecipe(name)
- queryRecipes(filters)
- updateRecipeCost(pageId, cost, costPerServing)
- linkRecipeToIngredients(recipeId, ingredientIds)
```

### **Meal Planning Gaps**

**Current Capabilities:**
- None - completely missing

**Missing Capabilities:**
- ❌ Can't generate weekly meal plans
- ❌ Can't optimize for budget constraints
- ❌ Can't optimize for ingredient overlap
- ❌ Can't create meal plan entries in Notion
- ❌ Can't calculate meal plan totals

**Required Components:**
1. Meal plan algorithm (budget optimization)
2. Ingredient overlap scoring
3. Category diversity logic
4. Notion meal plan database integration

### **Grocery List Gaps**

**Current Capabilities:**
- None - completely missing

**Missing Capabilities:**
- ❌ Can't aggregate ingredients from meal plan
- ❌ Can't consolidate duplicate ingredients
- ❌ Can't group by category
- ❌ Can't export to print/digital formats (text, markdown, JSON)

---

## 📋 Implementation Priority

### **Phase 1: Critical Foundation (Must Have)**
1. ✅ Verify Notion database property names match code
2. ✅ Create `scripts/` directory
3. ✅ Add recipe creation/query functions to `notionClient.js`
4. ✅ Build `add-recipe-interactive.js` (enables recipe collection)
5. ✅ Add `NOTION_MEAL_PLANNER_DB_ID` to `.env` and verify database exists

### **Phase 2: Core Automation (Must Have)**
6. ✅ Build `generate-meal-plan.js` (core automation)
7. ✅ Build meal plan creation functions in `notionClient.js`
8. ✅ Build `generate-grocery-list.js` (print/digital export)
9. ✅ Add npm scripts to `package.json`

### **Phase 3: Cost Management (Should Have)**
10. ✅ Build `calc-recipe-costs.js` (auto-calculate costs)
11. ✅ Build recipe cost update functions

### **Phase 4: Nice to Have**
12. Price update tools
13. Cost analysis reports
14. Recipe optimization suggestions

---

## 🎯 Specific Action Items

### **Immediate (Today)**

1. **Verify Notion Database Structure**
   - Use Notion API to inspect database properties
   - Verify property names match code:
     - Ingredients: `'Line Item'` vs `'Item'`
     - Ingredients: `'Average Unit Price ($)'` vs `'Cost'`
     - Recipes: Verify all property names exist
   - Check if Meal Planner database exists
   - Get Meal Planner database ID if it exists

2. **Create Scripts Directory**
   ```bash
   mkdir -p scripts
   ```

3. **Extend Notion Client**
   - Add recipe CRUD operations
   - Add meal plan creation functions
   - Add recipe querying with filters

### **Short Term (This Week)**

4. **Build Recipe Addition Tool**
   - Interactive CLI for adding recipes
   - Ingredient matching and linking
   - Automatic cost calculation

5. **Build Meal Plan Generator**
   - Budget constraint algorithm
   - Ingredient overlap optimization
   - Category diversity logic
   - Notion meal plan creation

6. **Build Grocery List Generator**
   - Aggregate from meal plan
   - Consolidate duplicates
   - Export formats (text, markdown)

---

## 🚨 Critical Issues to Resolve First

### **Issue 1: Property Name Verification**
**Risk:** API calls will fail if property names don't match  
**Action:** Query Notion databases to verify actual property names  
**Priority:** HIGH - Must fix before any scripts can work

### **Issue 2: Meal Planner Database**
**Risk:** Can't create meal plans without database  
**Action:** 
- Check if database exists in Notion
- If missing, create it with proper schema
- Add ID to `.env`
**Priority:** HIGH - Blocks meal plan generation

### **Issue 3: Recipe Database Schema**
**Risk:** Missing required properties will cause errors  
**Action:** Verify all documented properties exist:
- Recipe Name (title)
- Category (select)
- Cost ($) (number)
- Cost per Serving ($) (number)
- Servings (number)
- Database Ingredients (relation)
- etc.

**Priority:** HIGH - Must verify before building scripts

---

## 📝 Next Steps

1. **Verify Notion Databases** (using Notion API)
   - Check property names
   - Verify all required properties exist
   - Get Meal Planner database ID

2. **Create Scripts Structure**
   - Create `scripts/` directory
   - Set up base file structure

3. **Extend Notion Client**
   - Add recipe functions
   - Add meal plan functions
   - Add query helpers

4. **Build Priority Scripts**
   - Start with `add-recipe-interactive.js`
   - Then `generate-meal-plan.js`
   - Then `generate-grocery-list.js`

5. **Add npm Scripts**
   - Add all commands to `package.json`
   - Test each script

---

## 🔗 Key Files to Reference

**Documentation:**
- `.cursor/rules/workflow.mdc` - Technical specifications
- `.cursor/rules/notion_workflow.mdc` - Usage guide
- `.cursor/rules/quickstart.mdc` - Quick reference

**Existing Code:**
- `src/notion/notionClient.js` - Base Notion client (needs extension)
- `src/utils/scraper.js` - Utility functions (can reuse)

**Data:**
- `data/recipes/aldi-recipes-*.json` - Scraped recipe data (poor quality but exists)

---

## ✅ Success Criteria

**Phase 1 Complete When:**
- [ ] Can verify Notion database properties match code
- [ ] `scripts/` directory exists
- [ ] Notion client has recipe and meal plan functions
- [ ] Can create recipes via CLI

**Phase 2 Complete When:**
- [ ] Can generate 7-day meal plan from recipes
- [ ] Meal plans appear in Notion calendar
- [ ] Can generate grocery list from meal plan
- [ ] Grocery lists export in readable format (text/markdown)

**Full System Working When:**
- [ ] Weekly meal planning is fully automated
- [ ] Recipes can be added easily (< 3 minutes each)
- [ ] Meal plans stay within budget
- [ ] Grocery lists are printable and digital-friendly

---

**Status:** Ready to begin implementation  
**Recommended Starting Point:** Verify Notion database structure first, then build scripts directory and extend Notion client.
