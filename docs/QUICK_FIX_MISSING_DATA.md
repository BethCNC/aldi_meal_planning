# Quick Fix: Missing Ingredient Data

**Problem:** 14 priority ingredients missing key fields blocking accurate cost calculations.

**Solution:** Use the specialized script to fetch prices and fill in missing data.

---

## 🚀 Quick Start (3 Steps)

### **Step 1: See What's Missing**
```bash
npm run populate:missing -- --list-only
```

Shows all missing fields for your priority ingredients.

---

### **Step 2: Fetch Current Prices** (Optional but recommended)
```bash
npm run populate:missing -- --fetch-prices
```

Scrapes Aldi website for current prices. Takes ~2-3 minutes due to rate limiting.

**Alternative:** Use your most recent receipt instead (see below).

---

### **Step 3: Fill in Missing Data**

#### **Option A: Quick Update (Use Defaults)**
Fills in package sizes/units automatically, then you add prices:

```bash
npm run populate:missing -- --quick-update
```

This sets:
- Package Size (from common Aldi sizes)
- Package Unit (lb, oz, each, etc.)
- Base Unit (g, ml, or each)

Then manually add prices from your receipt.

#### **Option B: Interactive Update (Recommended)**
Step through each ingredient and fill in everything:

```bash
npm run populate:missing -- --update-missing
```

Prompts for each missing field with suggestions.

---

## 📋 Your Priority Ingredients

Here's what the script handles:

### **Must Fix (Blocking Cost Calculations):**

1. **coconut oil** - Missing: Package Size, Package Unit, Base Unit
   - Suggested: 14 oz package, Base Unit: ml

2. **whole chicken** - Missing: Price, Package Size, Package Unit, Base Unit
   - Suggested: 3.5 lb package, Base Unit: g

3. **white rice, 3 lbs.** - Missing: Price (currently 0)
   - Has: Base Unit (g), Package Size (3)
   - Missing: Package Unit
   - Suggested: 3 lb package

4. **buns, hamburger** - Missing: Price (0), Package Size, Package Unit, Base Unit
   - Suggested: 8 count package, Base Unit: each

5. **ground turkey** - Missing: Price, Package Size, Package Unit, Base Unit
   - Suggested: 1 lb package, Base Unit: g

6. **tomatoes, grape** - Has Price, Missing: Package Size, Package Unit, Base Unit
   - Suggested: 10 oz package, Base Unit: g

7. **mayonnaise** - Has Price, Missing: Package Size, Package Unit, Base Unit
   - Suggested: 30 oz jar, Base Unit: ml

8. **chicken thighs** - Has Price, Missing: Package Size, Package Unit, Base Unit
   - Suggested: 1.5 lb package, Base Unit: g

9. **graham crackers** - Has Price, Missing: Package Size, Package Unit, Base Unit
   - Suggested: 14.4 oz package, Base Unit: g

10. **sour cream** - Has Price, Missing: Package Size, Package Unit, Base Unit
    - Suggested: 16 oz container, Base Unit: ml

### **Bonus Frequent Staples:**

11. **chicken breasts** - Missing: Package Size, Package Unit, Base Unit
12. **broccoli** - Missing: Package Size, Package Unit, Base Unit
13. **bell peppers** - Missing: Price, Package Size, Package Unit, Base Unit
14. **soy sauce** - Missing: Package Size, Package Unit, Base Unit

---

## 💡 Using Your Receipt

**Best approach:** Use your most recent Aldi receipt to get accurate prices.

### **Process:**

1. **Run quick update first:**
   ```bash
   npm run populate:missing -- --quick-update
   ```
   This fills in package sizes/units automatically.

2. **Get your receipt ready**

3. **Update prices manually:**
   - Open Notion
   - Find each ingredient
   - Update `Price per Package ($)` from receipt
   - Verify package size matches receipt

### **Receipt Checklist:**

Tick off as you update in Notion:

- [ ] coconut oil - Price: $_____
- [ ] whole chicken - Price: $_____
- [ ] white rice - Price: $_____
- [ ] hamburger buns - Price: $_____
- [ ] ground turkey - Price: $_____
- [ ] grape tomatoes - Price: $_____
- [ ] mayonnaise - Price: $_____
- [ ] chicken thighs - Price: $_____
- [ ] graham crackers - Price: $_____
- [ ] sour cream - Price: $_____

---

## 🎯 Recommended Workflow

### **Fastest Path (15 minutes):**

```bash
# 1. Quick update with defaults
npm run populate:missing -- --quick-update

# 2. Get your receipt, manually update prices in Notion
# (Open Notion, find each ingredient, update price)

# 3. Verify package sizes match receipt
```

### **Most Accurate (30 minutes):**

```bash
# 1. Fetch current prices from Aldi website
npm run populate:missing -- --fetch-prices

# 2. Interactive update - review each one
npm run populate:missing -- --update-missing
```

---

## 📊 Field Definitions

### **Price per Package ($)**
The price you pay for the entire package at Aldi.
- Example: $4.99 for a 1 lb package of ground turkey

### **Package Size**
Just the number (no unit).
- Example: `1` (not "1 lb")
- Example: `14.4` (not "14.4 oz")

### **Package Unit**
The unit the package is sold in.
- Options: `lb`, `oz`, `g`, `kg`, `ml`, `l`, `cup`, `each`

### **Base Unit**
Used for conversions between recipes.
- Weight items: `g` (grams)
- Volume items: `ml` (milliliters)  
- Count items: `each`

---

## ✅ After Fixing

Once all fields are filled:

1. **Recalculate recipe costs:**
   ```bash
   npm run calc:costs:v3 -- --update
   ```

2. **Verify costs are reasonable:**
   - Check a few recipes
   - Compare to your shopping experience
   - Adjust if needed

3. **Generate meal plan with accurate costs:**
   ```bash
   npm run plan:generate -- --budget 75
   ```

---

## 🆘 Troubleshooting

### **"Ingredient not found"**

The script searches for exact or partial matches. If not found:
1. Check spelling in Notion
2. Use the ingredient name exactly as it appears in Notion
3. Or update manually in Notion

### **Package size doesn't match receipt**

Aldi package sizes can vary. Simply update:
- `Package Size` to match your receipt
- `Package Unit` accordingly

### **Price seems wrong**

- Verify against your receipt
- Check if item was on sale
- Aldi website prices may differ by location

---

## 📝 Example: Fixing "white rice, 3 lbs."

Current status:
- ✅ Has Base Unit: `g`
- ✅ Has Package Size: `3`
- ❌ Missing Package Unit
- ❌ Price is 0

**Fix:**

1. Run quick update:
   ```bash
   npm run populate:missing -- --quick-update
   ```
   Adds: Package Unit = `lb`

2. Add price from receipt:
   - Open Notion
   - Find "white rice, 3 lbs."
   - Update `Price per Package ($)` to your receipt price (e.g., $2.99)

**Done!** ✅

---

**You're all set - start with the quick update and add prices from your receipt!** 🎉
