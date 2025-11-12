# Supabase Recipe Intake Workflow

Use this guide whenever you need to add a brand-new recipe directly into Supabase with ingredient costing automatically populated.

---

## Overview

The interactive script `scripts/add-recipe-to-supabase.js` walks through:

- Capturing core recipe metadata (servings, category, URLs, tags)
- Resolving each ingredient against the Supabase `ingredients` table or creating a new entry on the fly
- Calculating per-ingredient costs using existing package/unit data
- Writing the finished record to both `recipes` and `recipe_ingredients` tables

The flow mirrors the earlier Notion helper but persists data straight to Supabase so the web app and SQL cost calculators stay in sync.

---

## Prerequisites

1. Supabase project created and seeded via the existing setup docs:
   - [`docs/SUPABASE_SETUP.md`](SUPABASE_SETUP.md)
   - [`docs/DATABASE_SCHEMA_SUPABASE.md`](DATABASE_SCHEMA_SUPABASE.md)
   - `node scripts/migrate-to-supabase.js` (optional for initial data load)
2. Environment variables present (either `.env` or shell):

   ```bash
   SUPABASE_URL=...
   SUPABASE_KEY=...
   ```

3. Ingredient pricing data up to date (`ingredients` table should include package size + price where possible).

---

## Step-by-Step Intake

1. **Start the CLI**

   ```bash
   node scripts/add-recipe-to-supabase.js
   ```

2. **Enter recipe metadata**
   - Name (required)
   - Servings (default 4)
   - Category + optional source/image URLs
   - Tags (comma separated; defaults to `Aldi`)
   - Existing recipe names are detected; choose whether to overwrite

3. **Add ingredients**
   - Paste each ingredient line (e.g., `1 lb ground beef`, `2 cups rice`)
   - Blank line twice ends entry mode
   - For every line the script:
     - Attempts fuzzy search against `ingredients`
     - Lets you choose a match, refine the search, or create a new item
     - Prompts to confirm/override quantity + unit
     - Displays calculated cost contribution using `backend/utils/unitConversions.js`

4. **Review instructions**
   - Multi-line entry supported (blank line twice to finish)
   - Final summary shows total cost + cost per serving
   - Confirm to persist, or cancel to abort without changes

5. **Save to Supabase**
   - `recipes` row is upserted with totals and metadata
   - Existing `recipe_ingredients` rows (if any) are removed then replaced with the new set

---

## Verification Checklist

After the script reports success:

1. **Inspect the data quickly**
   ```bash
   node -e "import('../backend/supabase/recipeClient.js').then(async ({getRecipeById}) => console.log(await getRecipeById('<RECIPE_ID>')))"
   ```
   *(Replace `<RECIPE_ID>` with the printed id, or check in Supabase table editor.)*

2. **Optional: recompute costs via SQL**
   ```bash
   node scripts/calculate-costs-sql.js
   ```
   This guarantees the aggregate view `recipe_cost_summary` stays aligned with the stored breakdown.

3. **Run the web app or API endpoint** to confirm the new recipe appears with accurate totals.

---

## Troubleshooting

| Issue | Resolution |
|-------|------------|
| `❌ Supabase credentials missing.` | Ensure `SUPABASE_URL` and `SUPABASE_KEY` (or the Vite equivalents) are exported before launching the script. |
| Ingredient shows `$0.00` cost | Update the ingredient entry with package price/size, then rerun the intake (overwrite mode will rebuild the breakdown). |
| Script exits after first prompt | Supabase tables may be missing – rerun schema SQL (`docs/DATABASE_SCHEMA_SUPABASE.md`) and verify with `node scripts/setup-supabase.js --check`. |
| Need to edit an ingredient later | Use Supabase table editor or write a dedicated admin script, then rerun `scripts/calculate-costs-sql.js` to refresh totals. |

---

## Related Resources

- [`backend/supabase/ingredientClient.js`](../backend/supabase/ingredientClient.js): Ingredient lookup & upsert helpers used by the CLI
- [`backend/supabase/recipeClient.js`](../backend/supabase/recipeClient.js): Recipe persistence helpers (upsert + ingredient replacement)
- [`backend/utils/unitConversions.js`](../backend/utils/unitConversions.js): Shared conversion + costing helpers
- [`scripts/calculate-costs-sql.js`](scripts/calculate-costs-sql.js): Bulk recomputation tool if ingredient pricing changes later

This workflow keeps Supabase authoritative for recipes while preserving consistent costing logic throughout the stack. Add more recipes as needed, then feed them into the meal-plan automation scripts. Enjoy! 🎉

