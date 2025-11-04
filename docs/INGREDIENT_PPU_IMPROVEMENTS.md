# Ingredient PPU (Price Per Unit) Improvements

## Overview

This document explains the improvements made to `aldi_ingredients_with_ppu.csv` to enhance recipe cost calculation accuracy.

**Date:** 2025-01-02  
**Fixed File:** `data/prices/aldi_ingredients_with_ppu_fixed.csv`

---

## Key Issues Fixed

### 1. **Base Unit Standardization**

**Problem:** Many items used "g" (grams) as the base unit, even when recipes typically use oz, lb, cups, or "each". This made recipe cost calculations confusing and error-prone.

**Solution:** Changed base units to match common recipe units:
- Items sold "each" → base unit = "each"
- Items sold by weight (lb/oz) → base unit = "lb" or "oz" (not grams)
- Liquid items sold by oz → base unit = "fl oz" (fluid ounces, not weight)

**Examples:**
- `bbq sauce`: Changed from "g" → "fl oz" (PPU: $0.041/fl oz)
- `butter`: Changed from "g" → "oz" (PPU: $0.281/oz)
- `ground beef`: Changed from "g" → "lb" (PPU: $6.66/lb)

---

### 2. **Liquid vs Weight Confusion**

**Problem:** Liquid items (sauces, oils, broths) were converting ounces to grams by weight, but recipes use fluid ounces (volume).

**Solution:** Identified liquid items and set base unit to "fl oz" instead of "g".

**Fixed Items:**
- `bbq sauce` (24 fl oz): $0.041/fl oz
- `olive oil` (16 fl oz): $0.237/fl oz
- `soy sauce` (24 fl oz): $0.054/fl oz
- `chicken broth` (32 fl oz): $0.037/fl oz

---

### 3. **Package Size Corrections**

**Problem:** Some items had incorrect package sizes that didn't match the item name.

**Fixed:**
- `ketchup, 38 oz.`: Package size was 8 oz, fixed to 38 oz to match name

---

### 4. **Categorization Fixes**

**Problem:** Some items were in incorrect categories, making them hard to find.

**Fixed:**
- `graham crackers`: "Meat" → "Snack"
- `egg noodles`: "Dairy" → "Pantry Staple"
- `pepperoni`: "Produce" → "Meat"
- `chicken broth`: "Meat" → "Pantry Staple"

---

### 5. **Duplicate Removal**

**Problem:** Some items appeared twice with different prices.

**Removed:**
- Duplicate "corn" entry (kept the lower-priced one at $0.48)

---

## Impact on Recipe Cost Calculations

### Before vs After Examples

| Item | Old PPU | New PPU | Unit | Change |
|------|---------|---------|------|--------|
| bbq sauce | $0.0015/g | $0.041/fl oz | fl oz | ✅ More intuitive |
| butter | $0.0099/g | $0.281/oz | oz | ✅ Recipe-friendly |
| ground beef | $0.0147/g | $6.66/lb | lb | ✅ Standard unit |
| chicken breasts | $0.015/g | $6.81/lb | lb | ✅ Standard unit |
| olive oil | $0.0084/g | $0.237/fl oz | fl oz | ✅ Volume-based |

### Why This Matters

**Example Recipe Calculation:**
- Recipe needs: "2 tbsp olive oil"
- Old system: Would try to convert to grams (confusing, error-prone)
- New system: Converts 2 tbsp → 1 fl oz → $0.237 (simple, accurate)

**Example Recipe Calculation:**
- Recipe needs: "1 lb ground beef"
- Old system: PPU in grams ($0.0147/g) = 453.6g × $0.0147 = $6.67
- New system: PPU in lbs ($6.66/lb) = 1 lb × $6.66 = $6.66
- **Result:** Same answer, but much clearer and easier to verify!

---

## Standard Base Units by Category

### Items Sold "Each"
- **Base Unit:** `each`
- **PPU:** Price per item
- **Examples:** bagels, bread, eggs, apples

### Items Sold by Weight (Meat, Cheese, etc.)
- **Base Unit:** `lb` or `oz` (whichever is more common in recipes)
- **PPU:** Price per lb or oz
- **Examples:** 
  - Ground beef: $6.66/lb
  - Butter: $0.28/oz
  - Shredded cheese: $0.41/oz

### Liquid Items (Oils, Sauces, Broths)
- **Base Unit:** `fl oz` (fluid ounces)
- **PPU:** Price per fl oz
- **Examples:**
  - Olive oil: $0.237/fl oz
  - BBQ sauce: $0.041/fl oz
  - Chicken broth: $0.037/fl oz

### Dry Goods (Rice, Pasta, Beans)
- **Base Unit:** `lb`, `oz`, or original package unit
- **PPU:** Price per lb or oz
- **Examples:**
  - Pasta: $0.049/oz
  - Rice: $0.96/lb (Jasmine rice 5 lbs = $4.79)

---

## Using the Fixed CSV

### Import to Notion

1. Review the fixed file: `data/prices/aldi_ingredients_with_ppu_fixed.csv`
2. Verify key items look correct
3. Use your existing import script to update Notion:
   ```bash
   node scripts/import-csv-prices.js data/prices/aldi_ingredients_with_ppu_fixed.csv
   ```

### Recipe Cost Calculations

The improved PPU values will make recipe cost calculations more accurate:

```javascript
// Example: Recipe needs "1/2 cup olive oil"
// 1/2 cup = 4 fl oz
// Cost = 4 fl oz × $0.237/fl oz = $0.95

// Example: Recipe needs "1.5 lb ground beef"
// Cost = 1.5 lb × $6.66/lb = $9.99
```

---

## Verification

### Check Your Most Common Recipe Ingredients

Review the fixed PPU for items you use frequently:

- **Meat:** ground beef, chicken breasts, bacon
- **Dairy:** butter, cheese, milk
- **Produce:** onions, tomatoes, peppers
- **Pantry:** pasta, rice, beans

All should now use recipe-friendly units (lb, oz, fl oz, each) instead of grams.

---

## Next Steps

1. ✅ **Review fixed CSV** - Check that key items look correct
2. ⬜ **Backup original** - Save a copy of the original file
3. ⬜ **Replace original** - If satisfied, replace the original CSV
4. ⬜ **Update Notion** - Import the fixed data to Notion
5. ⬜ **Recalculate recipes** - Run recipe cost calculator to see improved accuracy

---

## Technical Notes

### Conversion Reference

- **Weight:** 1 lb = 16 oz = 453.6 g
- **Volume:** 1 cup = 8 fl oz = 236.6 ml
- **Liquid Density:** Most cooking liquids ≈ 1 oz weight per 1 fl oz volume

### Script Details

The fix script (`scripts/fix-ingredient-ppu.js`):
- Automatically identifies liquid vs. weight items
- Determines best base unit for recipe calculations
- Fixes package size errors
- Corrects categorization
- Removes duplicates

---

## Questions?

If you notice any issues with the fixed PPU values, check:
1. Package size is correct
2. Base unit matches recipe usage
3. PPU calculation: `Price ÷ Package Size = PPU`

For example:
- Butter: $2.25 ÷ 8 oz = $0.281/oz ✅
- Ground beef: $9.99 ÷ 1.5 lb = $6.66/lb ✅

---

**Last Updated:** 2025-01-02
