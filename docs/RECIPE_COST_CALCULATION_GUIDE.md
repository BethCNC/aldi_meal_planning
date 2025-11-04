# Recipe Cost Calculation Guide

## Overview

Calculating recipe costs in Notion can be challenging because Notion doesn't have native formula support for complex unit conversions and ingredient matching. This guide explains the automated solution that calculates costs outside Notion and syncs them back.

---

## The Challenge

### Why It's Hard in Notion:

1. **Unit Conversions**: Recipes use different units (1 lb, 2 cups, 3 oz) but ingredients are sold in packages (16 oz bag, 2 lb container). Notion formulas can't easily handle weight-to-volume conversions.

2. **Ingredient Matching**: Recipe ingredients like "1 lb ground beef" need to match to database items like "ground beef (16 oz package)". This requires fuzzy matching that Notion can't do.

3. **Package Economics**: If a recipe needs 4 oz but ingredients come in 16 oz packages, you need to calculate the fraction of package cost. Notion formulas struggle with this.

4. **Cross-Database Relations**: Notion can't easily calculate across relation fields from the Ingredients database to Recipes.

---

## The Solution: Automated Cost Calculator

We use a Node.js script that:

1. **Fetches** all recipes and ingredients from Notion
2. **Parses** recipe ingredient lines (e.g., "1 lb ground beef")
3. **Matches** parsed ingredients to your ingredient database
4. **Calculates** costs using unit conversions and package economics
5. **Updates** Notion with calculated costs

---

## How It Works

### Step 1: Fetch Data from Notion

```bash
node scripts/fetch-notion-databases.js
```

This creates:
- `data/notion-ingredients.json` - All your ingredients with prices
- `data/notion-recipes.json` - All your recipes with ingredient lists

### Step 2: Calculate Recipe Costs

```bash
# Preview calculations (dry run)
node scripts/calculate-recipe-costs.js --dry-run

# Calculate and update Notion
node scripts/calculate-recipe-costs.js --update
```

The script:
- Parses each recipe's "Recipe Ingredients" text field
- Matches each ingredient line to your database
- Calculates cost using `unitConversions.js` logic
- Updates Notion's "Cost ($)" and "Cost per Serving ($)" fields

---

## Recipe Ingredient Format

For best results, format your recipe ingredients like this in Notion:

```
1 lb ground beef
2 cups rice
1/2 cup milk
1 onion
3 cloves garlic
2 tbsp olive oil
```

**Supported formats:**
- `1 lb ground beef`
- `2 cups rice`
- `1/2 cup milk`
- `1 onion` (assumes quantity 1, unit "each")
- `2 tbsp olive oil`

---

## Matching Logic

The script uses fuzzy matching to connect recipe ingredients to your database:

1. **Exact match**: "ground beef" → "ground beef"
2. **Contains match**: "chicken breast" → "chicken breast tenderloins"
3. **Word match**: "butter" → "butter, salted"

**Tips for better matching:**
- Use consistent naming (e.g., "ground beef" not "hamburger meat")
- Include key words (e.g., "chicken breast" not just "chicken")
- Avoid brand names in recipe ingredients

---

## Unit Conversions

The script handles conversions automatically using `src/utils/unitConversions.js`:

### Weight Conversions
- `lb` ↔ `oz` (1 lb = 16 oz)
- `oz` ↔ `g` (1 oz = 28.35 g)

### Volume Conversions
- `cup` ↔ `fl oz` (1 cup = 8 fl oz)
- `tbsp` ↔ `tsp` (1 tbsp = 3 tsp)

### Cross-Conversions (Weight ↔ Volume)
- Uses ingredient densities for common items:
  - Rice: 1 cup = 7 oz
  - Flour: 1 cup = 4.25 oz
  - Milk: 1 cup = 8.6 oz

### Package Economics
- If recipe needs 4 oz but package is 16 oz, calculates: `(package price) × (4/16)`
- Always rounds UP to account for partial packages

---

## Current Status

### ✅ What Works:
- Fetches all 198 ingredients from Notion
- Fetches all 36 recipes from Notion
- Parses ingredient lines with quantities and units
- Matches ingredients using fuzzy logic
- Calculates costs with unit conversions
- Updates Notion automatically

### ⚠️ Known Issues:
- Ingredients in Notion don't have "Price per Package ($)" field populated
- They have "Price per Base Unit ($)" instead
- We need to calculate package price from: `PPU × packageSize`

---

## Next Steps

### Option 1: Fix Ingredient Prices in Notion (Recommended)

Update your Ingredients database to include "Price per Package ($)" field. You can calculate it from:
```
Price per Package = Price per Base Unit × Package Size (in base units)
```

For example:
- Ground beef: PPU = $6.66/lb, Package = 1.5 lb
- Package Price = $6.66 × 1.5 = $9.99

### Option 2: Update Script to Use PPU

Modify `calculate-recipe-costs.js` to:
1. Use `pricePerBaseUnit` if `pricePerPackage` is missing
2. Calculate package price on the fly

---

## Example Calculation

**Recipe:** Easy Sesame Chicken (4 servings)

**Ingredients:**
- 1 lb chicken breast → matches "chicken breasts" ($6.81/lb)
  - Cost: $6.81
- 1/4 cup soy sauce → matches "soy sauce" ($1.29 for 24 fl oz)
  - Package: 24 fl oz = 3 cups
  - Needed: 1/4 cup = 0.25 cups
  - Cost: $1.29 × (0.25/3) = $0.11
- 1–2 tsp sesame oil → matches "sesame oil" ($8.25 for 16.9 fl oz)
  - Package: 16.9 fl oz = 101.4 tsp
  - Needed: 1.5 tsp (average)
  - Cost: $8.25 × (1.5/101.4) = $0.12

**Total Cost:** ~$7.04
**Cost per Serving:** $1.76

---

## Running the Calculator

### Basic Usage

```bash
# Preview all recipes (no changes)
node scripts/calculate-recipe-costs.js --dry-run

# Calculate for specific recipe
node scripts/calculate-recipe-costs.js --dry-run --recipe="Easy Sesame Chicken"

# Update Notion with calculated costs
node scripts/calculate-recipe-costs.js --update
```

### Output Example

```
📝 Easy Sesame Chicken
   Category: Chicken | Servings: 4
   ✅ Total Cost: $7.04
   ✅ Cost per Serving: $1.76
   
   📊 Breakdown:
      • 1 lb chicken breast
        → chicken breasts: $6.81
      • 1/4 cup soy sauce
        → soy sauce: $0.11
      • 1–2 tsp sesame oil
        → sesame oil: $0.12
   
   ✨ Updated in Notion
```

---

## Troubleshooting

### "No ingredients matched"

**Problem:** Recipe ingredients don't match database items.

**Solution:**
- Check ingredient names in recipe vs database
- Add variations to database (e.g., "ground beef" and "hamburger meat")
- Review unmatched items in dry-run output

### "Price per Package is null"

**Problem:** Ingredients don't have package prices.

**Solution:**
- Update Ingredients database with package prices
- Or modify script to calculate from PPU

### "Unit conversion failed"

**Problem:** Unsupported unit conversion (e.g., "pinch" → "oz").

**Solution:**
- Add conversion rules to `unitConversions.js`
- Or manually adjust recipe ingredient format

---

## Alternative: Manual Cost Entry

If automation doesn't work for all recipes, you can:

1. Run the calculator to get estimated costs
2. Review and adjust in Notion manually
3. Use calculator as a starting point for new recipes

---

## Future Enhancements

- [ ] Batch update ingredient package prices from CSV
- [ ] Add ingredient matching suggestions
- [ ] Support for recipe variations/substitutions
- [ ] Cost tracking over time
- [ ] Integration with meal planning

---

## Questions?

- Check `scripts/calculate-recipe-costs.js` for calculation logic
- Check `src/utils/unitConversions.js` for conversion rules
- Review `data/notion-recipes.json` to see fetched data
