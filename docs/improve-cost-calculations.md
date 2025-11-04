# Improving Cost Calculations - Action Plan

**Issue:** Notion formulas aren't calculating because data is incomplete

**Solution:** Use powerful scripts to:
1. Analyze what's missing
2. Auto-populate where possible
3. Calculate costs programmatically
4. Update Notion with calculated values

---

## 🛠️ New Tools Created

### **1. Unit Conversion Utilities** (`src/utils/unitConversions.js`)
- ✅ Handles weight conversions (lb ↔ oz ↔ g ↔ kg)
- ✅ Handles volume conversions (cup ↔ tbsp ↔ tsp ↔ ml ↔ l)
- ✅ Handles weight-to-volume conversions (with ingredient density)
- ✅ Calculates price per unit from package info
- ✅ Calculates ingredient cost based on quantity needed

### **2. Ingredient Unit Calculator** (`scripts/calculate-ingredient-units.js`)
- ✅ Analyzes all ingredients
- ✅ Calculates price per unit
- ✅ Shows which ingredients have complete data
- ✅ Identifies what's missing

**Usage:**
```bash
npm run calc:ingredient-units
```

### **3. Package Data Populator** (`scripts/populate-package-data.js`)
- ✅ Finds ingredients missing package size/unit
- ✅ Tries to auto-detect from ingredient names
- ✅ Suggests values based on common patterns
- ✅ Can auto-update high-confidence matches

**Usage:**
```bash
# Analyze what's missing
node scripts/populate-package-data.js

# See auto-fill suggestions
node scripts/populate-package-data.js --auto

# Auto-fill high-confidence ones
node scripts/populate-package-data.js --auto --update
```

### **4. Bulk Update Tool** (`scripts/bulk-update-ingredients.js`)
- ✅ Shows ingredients most used in recipes first
- ✅ Interactive prompts for missing data
- ✅ Updates multiple ingredients quickly

**Usage:**
```bash
node scripts/bulk-update-ingredients.js
```

### **5. Advanced Cost Calculator V3** (`scripts/calc-recipe-costs-v3.js`)
- ✅ Parses quantities from recipe text
- ✅ Uses proper unit conversions
- ✅ Calculates based on package prices and sizes
- ✅ Shows detailed breakdown
- ✅ Identifies matching issues

**Usage:**
```bash
npm run calc:costs:v3 -- --dry-run --verbose
npm run calc:costs:v3 -- --recipe "Recipe Name" --verbose
npm run calc:costs:v3 -- --update  # Actually update costs
```

---

## 📊 Current Data Status

**From Analysis:**
- 235 total ingredients
- 22 have complete data (can calculate price per unit)
- 186 have partial data (price but missing package size/unit)
- 27 missing all data

**Impact:**
- Can calculate costs for recipes using the 22 complete ingredients
- Need to fill package data for the 186 partial ones
- Cost calculations will improve as you add package data

---

## 🎯 Recommended Workflow

### **Step 1: Analyze What You Have**
```bash
npm run calc:ingredient-units
```
Shows which ingredients can already calculate price per unit.

### **Step 2: Auto-Populate Where Possible**
```bash
node scripts/populate-package-data.js --auto
```
See suggestions for auto-filling package data.

### **Step 3: Bulk Update Priority Ingredients**
```bash
node scripts/bulk-update-ingredients.js
```
Focus on ingredients used most in recipes.

### **Step 4: Test Cost Calculations**
```bash
npm run calc:costs:v3 -- --dry-run --verbose
```
See how calculations work with current data.

### **Step 5: Update Recipe Costs**
```bash
npm run calc:costs:v3 -- --update
```
Actually update recipe costs in Notion.

---

## 💡 Quick Wins

### **Fill in Most Common Ingredients First**

Based on your recipes, focus on:
1. Chicken (breast, thighs)
2. Ground beef
3. Pasta, rice
4. Common vegetables (onions, tomatoes, etc.)
5. Dairy (cheese, milk, etc.)

### **Use Auto-Detection**

Many ingredients can be auto-detected:
- Items with size in name (e.g., "32 oz chicken broth")
- Common patterns (bread = 1 each, cheese = 8 oz, etc.)

### **Batch Updates**

Use the bulk tool to update 10-20 at a time rather than one-by-one.

---

## 🔧 How Calculations Work Now

### **Before (Simple):**
```
Recipe needs: chicken
Ingredient: $3.50 per package
Cost: $3.50 (assumes 1 package)
```

### **After (Advanced V3):**
```
Recipe needs: 1 lb chicken
Ingredient: $3.50 for 1.5 lb package
Calculation: 1 lb needed, package = 1.5 lb, need 1 package
Cost: $3.50 ✅ (but could use 0.67 of package, waste 0.33 lb)

Or better example:
Recipe needs: 0.5 lb chicken  
Ingredient: $3.50 for 1.5 lb package
Calculation: 0.5 lb needed, package = 1.5 lb, need 1 package
Cost: $3.50 (rounds up - realistic for shopping)
```

### **With Unit Conversions:**
```
Recipe needs: 2 cups rice
Ingredient: $1.99 for 3 lb package
Conversion: 2 cups ≈ 0.8 lb (rice density)
Calculation: 0.8 lb needed, package = 3 lb, need 1 package
Cost: $1.99
```

---

## ✅ Next Steps

1. **Run analysis:**
   ```bash
   npm run calc:ingredient-units
   ```

2. **Auto-fill what you can:**
   ```bash
   node scripts/populate-package-data.js --auto --update
   ```

3. **Manually fill priority ingredients:**
   ```bash
   node scripts/bulk-update-ingredients.js
   ```

4. **Test calculations:**
   ```bash
   npm run calc:costs:v3 -- --recipe "Recipe Name" --verbose
   ```

5. **Update all recipe costs:**
   ```bash
   npm run calc:costs:v3 -- --update
   ```

---

**The tools are ready - use them to populate your data and get accurate costs!** 💪
