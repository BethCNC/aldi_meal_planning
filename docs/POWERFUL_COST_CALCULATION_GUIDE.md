# Powerful Cost Calculation Guide

**Goal:** Automatically calculate accurate recipe costs from ingredient prices and package sizes

---

## 🎯 The Problem

Notion formulas (`Cost per Unit ($)`, `Cost per Base Unit ($)`) aren't working because:
1. Many ingredients missing `Package Size` and `Package Unit` data
2. Formulas can't calculate without complete data
3. Manual entry is time-consuming

**Solution:** Use powerful scripts to calculate programmatically and update Notion

---

## 🛠️ Tools Available

### **1. Ingredient Unit Calculator**
**Purpose:** See what can be calculated and what's missing

```bash
npm run calc:ingredient-units
```

**What it shows:**
- Ingredients with complete data (can calculate price per unit)
- Ingredients missing data
- Examples of calculated values
- Suggestions for what to fill in

---

### **2. Package Data Populator**
**Purpose:** Auto-detect and fill in missing package sizes

```bash
# Analyze what's missing
node scripts/populate-package-data.js

# See auto-fill suggestions
npm run populate:packages

# Auto-fill high-confidence matches
node scripts/populate-package-data.js --auto --update
```

**What it does:**
- Extracts package size from ingredient names (e.g., "rice, 3 lbs" → 3 lb)
- Suggests common patterns (bread = 1 each, cheese = 8 oz, etc.)
- Can auto-update high-confidence matches
- Shows what needs manual entry

---

### **3. Bulk Update Tool**
**Purpose:** Quickly fill in data for ingredients used in recipes

```bash
npm run bulk:update-ingredients
```

**What it does:**
- Shows ingredients by usage (most used first)
- Interactive prompts for missing data
- Batch update multiple ingredients quickly
- Focuses on priority ingredients (ones in your recipes)

---

### **4. Advanced Cost Calculator V3**
**Purpose:** Calculate recipe costs using proper unit conversions

```bash
# Test on one recipe with details
npm run calc:costs:v3 -- --recipe "Recipe Name" --verbose --dry-run

# Calculate all recipes
npm run calc:costs:v3 -- --dry-run

# Actually update Notion
npm run calc:costs:v3 -- --update
```

**Features:**
- ✅ Parses quantities from recipe text ("1 lb ground beef")
- ✅ Matches ingredients intelligently
- ✅ Handles unit conversions (cups → lb, etc.)
- ✅ Calculates based on package sizes
- ✅ Shows detailed breakdown
- ✅ Identifies matching issues

---

## 📋 Recommended Workflow

### **Phase 1: Analyze & Auto-Fill** (30 minutes)

**Step 1:** See current status
```bash
npm run calc:ingredient-units
```

**Step 2:** Auto-fill what you can
```bash
node scripts/populate-package-data.js --auto --update
```

This will:
- Extract package sizes from ingredient names
- Apply common patterns
- Update high-confidence matches automatically

**Result:** More ingredients ready for calculations

---

### **Phase 2: Fill Priority Ingredients** (1-2 hours)

**Step 1:** Use bulk update tool
```bash
npm run bulk:update-ingredients
```

**Step 2:** Focus on top 20-30 ingredients
- Shows ingredients used most in recipes first
- Fill in missing data for each
- Uses your latest Aldi receipt for prices

**Result:** Priority ingredients complete

---

### **Phase 3: Test & Refine** (15 minutes)

**Step 1:** Test cost calculation
```bash
npm run calc:costs:v3 -- --recipe "Chicken Stir Fry" --verbose --dry-run
```

**Step 2:** Review results
- Check if costs are reasonable
- Review warnings about unmatched ingredients
- Adjust ingredient names if needed

**Step 3:** Update recipe costs
```bash
npm run calc:costs:v3 -- --update
```

---

### **Phase 4: Ongoing Maintenance** (5-10 min/month)

**When prices change:**
1. Update `Price per Package ($)` in Notion for changed items
2. Run: `npm run calc:costs:v3 -- --update`
3. Recipe costs auto-update

**When adding new ingredients:**
1. Fill in price, package size, and unit when creating
2. Run cost calculator to verify

---

## 💡 Tips for Better Accuracy

### **1. Package Size Format**
Make sure `Package Size` is just a number:
- ✅ Good: `1`, `3`, `16`, `32`
- ❌ Bad: `1 lb`, `3 lbs`, `32 oz` (unit goes in Package Unit field)

### **2. Unit Consistency**
Use standard units:
- Weight: `lb`, `oz`, `g`, `kg`
- Volume: `ml`, `l`, `cup`, `tbsp`, `tsp`
- Count: `each`

### **3. Base Unit**
Set `Base Unit` for conversions:
- Weight items: `g` (grams)
- Volume items: `ml` (milliliters)
- Count items: `each`

### **4. Ingredient Naming**
Match recipe text to database names:
- Recipe says "ground beef" → Database should be "ground beef" (not "Ground Beef")
- Helps with automatic matching

---

## 🔍 Example: Complete Workflow

**Starting point:**
- Recipe: "Chicken Stir Fry"
- Has 9 linked ingredients
- Some have prices, some missing package data

**Step 1:** Analyze
```bash
npm run calc:ingredient-units
```
Shows: 5 ingredients need package data

**Step 2:** Auto-fill
```bash
node scripts/populate-package-data.js --auto --update
```
Auto-fills 2 that can be detected from names

**Step 3:** Manual fill
```bash
npm run bulk:update-ingredients
```
Fill remaining 3 manually

**Step 4:** Calculate
```bash
npm run calc:costs:v3 -- --recipe "Chicken Stir Fry" --verbose
```
Shows: $13.65 total, $3.41/serving

**Step 5:** Update
```bash
npm run calc:costs:v3 -- --recipe "Chicken Stir Fry" --update
```
Recipe cost now in Notion!

---

## 📊 Understanding the Calculations

### **Simple Case (Same Units):**
```
Recipe needs: 1 lb ground beef
Ingredient: Price = $4.99, Package = 1 lb
Calculation: 1 lb ÷ 1 lb = 1 package needed
Cost: $4.99
```

### **Partial Package:**
```
Recipe needs: 0.5 lb ground beef
Ingredient: Price = $4.99, Package = 1 lb
Calculation: 0.5 lb ÷ 1 lb = 0.5 packages, round up = 1 package
Cost: $4.99 (you buy full package, use half)
```

### **Different Units (Conversion):**
```
Recipe needs: 2 cups rice
Ingredient: Price = $1.99, Package = 3 lb
Conversion: 2 cups ≈ 0.8 lb (rice density)
Calculation: 0.8 lb ÷ 3 lb = 0.27 packages, round up = 1 package
Cost: $1.99
```

### **Multiple Packages:**
```
Recipe needs: 5 lb flour
Ingredient: Price = $2.49, Package = 2 lb
Calculation: 5 lb ÷ 2 lb = 2.5 packages, round up = 3 packages
Cost: $2.49 × 3 = $7.47
```

---

## ⚠️ Current Limitations

### **1. Unit Conversions**
- ✅ Basic conversions work (lb ↔ oz, cup ↔ tbsp)
- ⚠️ Cups → weight needs ingredient density (simplified estimates used)
- 💡 Can be improved with better density data

### **2. Ingredient Matching**
- ✅ Fuzzy matching works well for common ingredients
- ⚠️ May mis-match similar names (e.g., "chicken breast" vs "chicken breasts")
- 💡 Review warnings and adjust names if needed

### **3. Leftover Tracking**
- ⚠️ Always rounds up (assumes you buy full packages)
- 💡 Doesn't account for leftovers from previous recipes
- 💡 Future enhancement: Track pantry inventory

---

## ✅ Success Checklist

**System is working when:**

1. ✅ **80%+ of common ingredients have:**
   - Price per Package ($)
   - Package Size
   - Package Unit
   - Base Unit

2. ✅ **Recipe costs calculate accurately:**
   - Within 10% of manual calculation
   - Reasonable compared to shopping experience

3. ✅ **Can generate meal plans with costs:**
   - Budget constraints work correctly
   - Grocery list totals are accurate

4. ✅ **Can update costs automatically:**
   - Price changes propagate to recipes
   - Runs quickly (<1 minute for all recipes)

---

## 🚀 Quick Start Commands

```bash
# See what's missing
npm run calc:ingredient-units

# Auto-fill what you can
npm run populate:packages
node scripts/populate-package-data.js --auto --update

# Fill priority ingredients
npm run bulk:update-ingredients

# Test calculations
npm run calc:costs:v3 -- --dry-run --verbose

# Update all recipe costs
npm run calc:costs:v3 -- --update
```

---

**The tools are powerful - use them to build up your data and get accurate automatic cost calculations!** 💪
