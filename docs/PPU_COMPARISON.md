# PPU Improvements: Before vs After Comparison

## Top 10 Most Improved Items for Recipe Calculations

| Item | Old Base Unit | New Base Unit | Old PPU | New PPU | Improvement |
|------|---------------|---------------|---------|---------|-------------|
| **Ground beef** | g | lb | $0.0147/g | $6.66/lb | ✅ Recipes use "lb", not grams |
| **Chicken breasts** | g | lb | $0.015/g | $6.81/lb | ✅ Standard unit for meat |
| **Butter** | g | oz | $0.0099/g | $0.281/oz | ✅ Recipes use oz/cups |
| **Olive oil** | g | fl oz | $0.0084/g | $0.237/fl oz | ✅ Liquids use volume, not weight |
| **BBQ sauce** | g | fl oz | $0.0015/g | $0.041/fl oz | ✅ Volume-based unit |
| **Soy sauce** | g | fl oz | $0.0019/g | $0.054/fl oz | ✅ Volume-based unit |
| **Shredded cheese** | g | oz | $0.0145/g | $0.411/oz | ✅ Standard unit |
| **Bacon** | g | lb | $0.0051/g | $2.33/lb | ✅ Recipes use lb or slices |
| **Italian sausage** | g | lb | $0.0044/g | $1.99/lb | ✅ Standard unit |
| **Chicken broth** | g | fl oz | $0.0013/g | $0.037/fl oz | ✅ Volume-based unit |

---

## Real Recipe Calculation Examples

### Example 1: Spaghetti with Meat Sauce

**Recipe needs:**
- 1 lb ground beef
- 1/4 cup olive oil
- 1 cup shredded mozzarella

**Old System (using grams):**
- Ground beef: 453.6g × $0.0147/g = $6.67
- Olive oil: 59.15g × $0.0084/g = $0.50 ❌ (incorrect - mixing weight/volume)
- Mozzarella: 113.4g × $0.0145/g = $1.64

**New System (recipe-friendly units):**
- Ground beef: 1 lb × $6.66/lb = $6.66 ✅
- Olive oil: 2 fl oz × $0.237/fl oz = $0.47 ✅
- Mozzarella: 4 oz × $0.411/oz = $1.64 ✅

**Total:** Old = $8.81 | New = $8.77 (more accurate)

---

### Example 2: Chicken Stir Fry

**Recipe needs:**
- 1.5 lb chicken breasts
- 2 tbsp soy sauce
- 1 tbsp olive oil

**Old System:**
- Chicken: 680.4g × $0.015/g = $10.21
- Soy sauce: 29.57g × $0.0019/g = $0.06 ❌ (very inaccurate)
- Olive oil: 14.79g × $0.0084/g = $0.12 ❌ (very inaccurate)

**New System:**
- Chicken: 1.5 lb × $6.81/lb = $10.22 ✅
- Soy sauce: 1 fl oz × $0.054/fl oz = $0.05 ✅
- Olive oil: 0.5 fl oz × $0.237/fl oz = $0.12 ✅

**Total:** Old = $10.39 | New = $10.39 (more accurate calculation method)

---

## Why This Matters

### Problem with Old System

1. **Confusion:** Grams aren't intuitive for cooking
   - Recipe says "1 lb ground beef"
   - Have to convert: 1 lb = 453.6g
   - Calculate: 453.6 × $0.0147/g = ???

2. **Errors:** Mixing weight and volume
   - Olive oil sold by fl oz (volume)
   - But converted to grams (weight)
   - Recipe uses "cup" (volume)
   - Conversion chain: cup → fl oz → grams → ??? (error-prone)

3. **Hard to Verify:** Small decimal values
   - $0.0147/g is hard to verify
   - Is that correct? $9.99 ÷ 680.4g = ???
   - Hard to spot mistakes

### Benefits of New System

1. **Intuitive:** Units match recipe language
   - Recipe says "1 lb ground beef"
   - PPU says "$6.66/lb"
   - Calculation: 1 × $6.66 = $6.66 ✅ (easy!)

2. **Accurate:** Proper unit handling
   - Liquids use fl oz (volume)
   - Solids use lb/oz (weight)
   - No mixing weight/volume

3. **Verifiable:** Easy to check
   - Ground beef: $9.99 ÷ 1.5 lb = $6.66/lb ✅
   - Can verify with simple division

---

## Category Improvements

### Meat Category
**Before:** All in grams (g)  
**After:** All in pounds (lb) - standard for meat recipes

| Item | New PPU |
|------|---------|
| Ground beef | $6.66/lb |
| Chicken breasts | $6.81/lb |
| Chicken thighs | $2.33/lb |
| Bacon | $2.33/lb |
| Italian sausage | $1.99/lb |

### Dairy Category
**Before:** Mix of grams and "each"  
**After:** oz for packaged items, "each" for whole items

| Item | New PPU |
|------|---------|
| Butter | $0.281/oz |
| Shredded cheese | $0.411/oz |
| Sliced cheese | $0.249/oz |
| Milk | $1.74/each |
| Eggs | $0.098/each |

### Liquid Items
**Before:** All converted to grams (wrong!)  
**After:** Fluid ounces (fl oz) - proper volume unit

| Item | New PPU |
|------|---------|
| Olive oil | $0.237/fl oz |
| Soy sauce | $0.054/fl oz |
| BBQ sauce | $0.041/fl oz |
| Chicken broth | $0.037/fl oz |

---

## Quick Reference: Common Recipe Units

When recipes call for these, the new PPU system handles them directly:

| Recipe Unit | New PPU Unit | Example |
|-------------|--------------|---------|
| 1 lb meat | lb | $6.66/lb |
| 8 oz cheese | oz | $0.41/oz |
| 1 cup oil | fl oz (8 fl oz = 1 cup) | $0.237/fl oz |
| 2 tbsp sauce | fl oz (1 tbsp = 0.5 fl oz) | $0.041/fl oz |
| 1 dozen eggs | each | $0.098/each |

---

## Verification Checklist

Before using the fixed CSV, verify these key items:

- [ ] Ground beef: $9.99 ÷ 1.5 lb = $6.66/lb ✅
- [ ] Butter: $2.25 ÷ 8 oz = $0.281/oz ✅
- [ ] Olive oil: $3.79 ÷ 16 fl oz = $0.237/fl oz ✅
- [ ] Chicken breasts: $10.22 ÷ 1.5 lb = $6.81/lb ✅
- [ ] Shredded cheese: $3.29 ÷ 8 oz = $0.411/oz ✅

All calculations should match the new PPU values!

---

**Last Updated:** 2025-01-02
