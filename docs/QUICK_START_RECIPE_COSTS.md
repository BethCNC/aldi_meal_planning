# Quick Start: Recipe Cost Calculation

## ✅ What You Have Now

1. **198 ingredients** in Notion with prices
2. **36 recipes** in Notion with ingredient lists
3. **Automated cost calculator** ready to use

## 🚀 Quick Start

### Step 1: Preview Cost Calculations

```bash
node scripts/calculate-recipe-costs.js --dry-run
```

This shows you what costs would be calculated for all recipes without making changes.

### Step 2: Update Notion with Costs

```bash
node scripts/calculate-recipe-costs.js --update
```

This calculates costs and updates your Notion database.

## 📊 Current Status

**Fetched from Notion:**
- ✅ 198 ingredients (all have prices)
- ✅ 36 recipes
- ⚠️ 0 recipes have linked ingredients (need to link manually OR rely on text parsing)

**Cost Calculation Status:**
- Works but needs ingredient matching improvements
- Some ingredients may not match correctly (e.g., "chicken breast" might match "whole chicken")
- Water, spices, and small quantities may not match

## 🎯 Two Approaches for Recipe Costs

### Approach 1: Text-Based Matching (Current)

**How it works:**
- Parses "Recipe Ingredients" text field
- Matches each line to ingredient database
- Calculates costs automatically

**Pros:**
- Works with existing recipes
- No manual linking needed
- Quick to implement

**Cons:**
- Matching can be inaccurate
- Some ingredients won't match
- Requires consistent ingredient naming

**Best for:** Quick estimates, bulk processing

### Approach 2: Link-Based Calculation (Recommended)

**How it works:**
- Manually link ingredients in Notion's "Aldi Ingredients" relation field
- Script reads linked ingredients directly
- More accurate, no matching needed

**Pros:**
- 100% accurate
- No matching errors
- Faster execution

**Cons:**
- Requires manual linking for each recipe
- More setup time

**Best for:** Accurate costs, production use

## 💡 Recommendation

**For now, use Approach 1 (text-based)** to get approximate costs for all 36 recipes quickly. Then:

1. Review unmatched ingredients in the output
2. Link key ingredients manually for recipes you use often
3. Script will prefer linked ingredients when available

## 🔧 Improving Matching

The calculator currently matches:
- "chicken breast" → "whole chicken" (wrong)
- "rice vinegar" → not found
- "ginger" → not found

**To fix:**

1. **Add missing ingredients** to your database:
   - Rice vinegar
   - Fresh ginger (or ground ginger)
   - Sesame seeds
   - Canola/vegetable oil

2. **Add ingredient variations**:
   - "chicken breast" and "chicken breasts" (plural)
   - "ground beef" and "beef, ground"

3. **Use consistent naming** in recipe ingredients:
   - Use database names exactly
   - Include package sizes when relevant (e.g., "8 oz cream cheese")

## 📝 Next Steps

1. **Run dry-run** to see current calculations:
   ```bash
   node scripts/calculate-recipe-costs.js --dry-run
   ```

2. **Review unmatched ingredients** and add missing ones to database

3. **Link ingredients manually** for favorite recipes (more accurate)

4. **Run with --update** when satisfied:
   ```bash
   node scripts/calculate-recipe-costs.js --update
   ```

## 📚 Full Documentation

See `docs/RECIPE_COST_CALCULATION_GUIDE.md` for:
- Detailed explanation of calculations
- Unit conversion logic
- Troubleshooting guide
- Advanced usage

## 🎯 The Bottom Line

**Calculating recipe costs IS hard in Notion** because:
- ❌ No native unit conversions
- ❌ No fuzzy matching
- ❌ Limited formula capabilities
- ❌ Cross-database calculations are complex

**Solution:** Our automated script handles all the complexity outside Notion and syncs results back. This is the best approach for accurate, maintainable cost calculations.
