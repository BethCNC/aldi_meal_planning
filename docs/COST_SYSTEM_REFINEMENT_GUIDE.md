# Cost System Refinement Guide

**Date:** January 27, 2025  
**Goal:** Auto-populate accurate recipe costs from ingredient prices and quantities

---

## 🔍 What I Found

### **Your Actual Database Structure:**

#### **Ingredients Database:**
- `Item` (title) - Ingredient name
- `Price per Package ($)` (number) - **Main cost field** ⚠️ Many empty
- `Package Size` (number) - Size value ⚠️ Many empty  
- `Package Unit` (select: g, kg, ml, l, oz, lb, each) - Unit ⚠️ Many empty
- `Base Unit` (select: g, ml, each) - For conversions
- `Units per Package (auto)` (formula) - Calculated field
- `Cost per Unit ($)` (formula) - Calculated field
- Formulas exist but showing N/A (likely need data to calculate)

#### **Recipes Database:**
- `Recipe Name` (title)
- `Recipe Cost` (number) - **Target field for auto-calculation** ⚠️ Most empty
- `Cost ($)` (number) - Legacy field
- `Cost per Serving ($)` (number)
- `Recipe Ingredients` (rich_text) - **Contains quantities!** ✅
- `Aldi Ingredients` (relation) - **Links to ingredients** ✅ (9-14 linked per recipe)

---

## ✅ What I Fixed

### **1. Property Name Corrections**
- ✅ Changed all code from `Database Ingredients ` → `Aldi Ingredients`
- ✅ Changed all code from `Cost` → `Price per Package ($)`
- ✅ Changed all code from `Cost ($)` → `Recipe Cost` (primary)

### **2. Updated Files:**
- ✅ `src/notion/notionClient.js` - All functions
- ✅ `scripts/calc-recipe-costs.js` - Basic version
- ✅ `scripts/calc-recipe-costs-v2.js` - **NEW improved version**
- ✅ `scripts/generate-grocery-list.js`
- ✅ `scripts/generate-meal-plan.js`
- ✅ `scripts/add-recipe-interactive.js`

### **3. Created V2 Cost Calculator:**
- ✅ Parses quantities from `Recipe Ingredients` text
- ✅ Matches ingredients using fuzzy matching
- ✅ Calculates costs based on package prices
- ✅ Handles basic unit conversions
- ✅ Shows detailed breakdown with `--verbose`

---

## ⚠️ Critical Issue: Missing Data

**Analysis Results:**
- 100 ingredients in database
- **0 have `Price per Package ($)` filled** ❌
- **0 have complete package size data** ❌
- Recipes have ingredients linked ✅
- Recipes have ingredient text with quantities ✅

**This is why costs aren't calculating - the data isn't there yet!**

---

## 🎯 How to Fix - Step by Step

### **Step 1: Populate Ingredient Prices** (Priority: HIGH)

**Option A: Manual Entry in Notion**
1. Open your Aldi Ingredients database
2. For each ingredient, add:
   - `Price per Package ($)` - Price you paid at Aldi
   - `Package Size` - Number (e.g., 1, 3, 16)
   - `Package Unit` - Select unit (lb, oz, each, etc.)
   - `Base Unit` - For conversions (lb for weight, each for count)

**Option B: Use Recipe Addition Tool** (Faster for new recipes)
When you run `npm run add:recipe`, it will:
- Prompt for prices on new ingredients
- Create ingredient entries automatically
- But you still need to add Package Size/Unit manually after

**Option C: Batch Import** (Future enhancement)
- Export from Excel if you have price list
- Import via script (would need to build)

---

### **Step 2: Verify Package Sizes Match Your Shopping**

**Important:** Package Size should match what you actually buy at Aldi

**Examples:**
- Ground beef: Package Size = 1, Package Unit = lb, Price per Package = $4.99
- Rice: Package Size = 3, Package Unit = lb, Price per Package = $1.99
- Chicken breast: Package Size = 1.5, Package Unit = lb, Price per Package = $4.50
- Eggs: Package Size = 12, Package Unit = each, Price per Package = $1.29

---

### **Step 3: Test Cost Calculation**

Once you have some ingredients with prices:

```bash
# Test on one recipe
node scripts/calc-recipe-costs-v2.js --recipe "Chicken Stir Fry" --verbose

# Test on all recipes (dry run)
node scripts/calc-recipe-costs-v2.js --dry-run --verbose

# Actually update costs
node scripts/calc-recipe-costs-v2.js
```

---

### **Step 4: Refine Matching**

**If ingredients aren't matching correctly:**

The V2 calculator uses fuzzy matching. If it's wrong:
1. Check the `--verbose` output
2. See which ingredients matched
3. Adjust ingredient names in database to match recipe text
4. Or improve the matching algorithm (can enhance if needed)

---

## 📊 Example: How It Should Work

### **Recipe: "Taco Pasta Casserole"**

**Recipe Ingredients text:**
```
1 lb ground beef
1 onion
2 cups pasta
1 can tomatoes
1 cup cheese
```

**Linked Ingredients in database:**
- Ground beef: Price = $4.99, Package Size = 1 lb
- Onion: Price = $0.99, Package Size = 3 lb (bulk bag)
- Pasta: Price = $1.45, Package Size = 1 lb
- Tomatoes: Price = $0.87, Package Size = 15 oz
- Cheese: Price = $1.79, Package Size = 8 oz

**Calculation:**
```
Ground beef: 1 lb needed, package = 1 lb → 1 package = $4.99
Onion: ~0.33 lb needed, package = 3 lb → 1 package (round up) = $0.99
Pasta: 2 cups needed → ~1 lb → 1 package = $1.45
Tomatoes: 1 can needed, package = 1 can → 1 package = $0.87
Cheese: 1 cup = 4 oz needed, package = 8 oz → 1 package = $1.79

Total: $10.09
```

**With 6 servings:**
- Cost per serving: $1.68

---

## 🔧 Current Calculation Method (V2)

### **What It Does:**
1. Parses `Recipe Ingredients` text line by line
2. Extracts quantity, unit, and ingredient name
3. Matches to linked `Aldi Ingredients` using fuzzy matching
4. For each match:
   - Gets `Price per Package ($)`
   - Gets `Package Size` and `Package Unit`
   - Calculates packages needed (rounds up)
   - Adds cost

### **Limitations:**
- ⚠️ Unit conversions are simplified
- ⚠️ Cups → weight conversions need ingredient density
- ⚠️ Fuzzy matching may have false positives
- ⚠️ Assumes full package purchase (doesn't account for leftovers)

### **Works Best When:**
- ✅ Ingredient names match between recipe text and database
- ✅ Package sizes are filled in
- ✅ Units are consistent
- ✅ Recipe uses whole or half packages (less waste)

---

## 💡 Recommendations

### **Immediate (To Get Working):**

1. **Fill in prices for 10-20 common ingredients:**
   - Ground beef, chicken, rice, pasta, cheese, etc.
   - Use your latest Aldi receipt
   - Add Package Size and Package Unit too

2. **Test on one complete recipe:**
   - Pick a recipe with all ingredients having prices
   - Run V2 calculator
   - Verify cost makes sense
   - Adjust as needed

3. **Gradually add more:**
   - Add prices as you shop
   - Run calculator monthly to update recipe costs
   - Use for meal planning

### **Short Term (Better Accuracy):**

1. **Improve unit conversions:**
   - Add conversion factors for common ingredients
   - Handle cups → weight (need density data)
   - Better handling of "each" items

2. **Better ingredient matching:**
   - Improve fuzzy matching algorithm
   - Handle synonyms (beef = ground beef in some contexts)
   - Allow manual override

3. **Track quantities better:**
   - Consider adding quantity field to relation (if Notion supports)
   - Or improve parsing from text

### **Long Term (Full Automation):**

1. **Price update workflow:**
   - Script to update prices from receipts
   - Or integration with price tracking apps

2. **Leftover tracking:**
   - Track what's in pantry
   - Adjust costs for items already owned

3. **Shopping optimization:**
   - Calculate best package sizes
   - Suggest bulk purchases when cheaper per unit

---

## 📝 Current Workflow

### **Adding a New Recipe:**

1. Run `npm run add:recipe`
2. Enter recipe details
3. Paste ingredient list with quantities
4. Tool matches ingredients (or prompts for new ones)
5. **Manually verify ingredient prices in Notion after**
6. **Fill in Package Size/Unit for ingredients missing them**
7. Run `node scripts/calc-recipe-costs-v2.js --recipe "Recipe Name"`
8. Review calculated cost
9. Adjust if needed

### **Updating Prices:**

1. Get latest Aldi receipt
2. Open Ingredients database in Notion
3. Update `Price per Package ($)` for changed items
4. Update `Package Size` if package size changed
5. Run `node scripts/calc-recipe-costs-v2.js` to recalculate all recipes

### **Weekly Meal Planning:**

1. Generate meal plan: `npm run plan:generate -- --budget 75`
2. Generate grocery list: `npm run grocery:list`
3. Shop at Aldi
4. Update any price changes
5. Recalculate costs if needed

---

## ✅ Success Criteria

**System is working correctly when:**

1. ✅ Most ingredients have `Price per Package ($)` filled
2. ✅ Package sizes are accurate
3. ✅ Calculated recipe costs match manual calculations (±10%)
4. ✅ Grocery list totals are within budget
5. ✅ Meal plans stay within budget

---

## 🎯 Next Steps For You

1. **Fill in ingredient prices** (start with 20 most common)
2. **Fill in package sizes** for those ingredients
3. **Test V2 calculator** on a complete recipe
4. **Review and adjust** matching if needed
5. **Gradually expand** to more ingredients
6. **Use for meal planning** once accurate

---

**The code is ready - now you need to populate the data!** 💪

See `COST_SYSTEM_IMPROVEMENTS.md` for technical details.
