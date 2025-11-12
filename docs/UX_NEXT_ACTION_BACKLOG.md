# UX-Driven Implementation Backlog

Priority order reflects impact on the decision-free, anxiety-reducing experience described in the case study notes.

_Source reference: [Aldi Meal Planner UI/UX Case Study Notes](https://www.notion.so/7starsdesign/Aldi-Meal-Planner-UI-UX-Case-Study-Notes-2a086edcae2c80a693feccb53a974f28?source=copy_link)_

## 1. Notion-Centric Meal Plan Generator (P0)
**Goal:** Ensure the weekly plan comes directly from Notion recipes/ingredients so the user manages data in one place.

**Acceptance Criteria**
- Script (`scripts/generate-meal-plan.js`) reads recipes via `backend/notion/notionClient.js` using `queryRecipes` with cost/familiarity filters.
- Generator selects six dinners + leftover + flexible night, enforcing budget target with retry swaps until total ≤ budget or exhaustion.
- Result writes plan back to Notion (`createMealPlanEntry`) with day assignments, including status field initialized to "Planned".
- CLI output shows budget summary, match rationale, and prompts user to approve before committing entries (decision-free but reviewable).

## 2. Grocery List Builder with Notion Data (P1)
**Goal:** Produce aisle-ordered lists that match Aldi layout and reflect pantry offsets, all from Notion relations.

**Acceptance Criteria**
- Script (`scripts/generate-grocery-list.js`) reads the newly created Notion meal plan for the selected week and fetches linked recipe ingredients.
- Consolidates duplicates, subtracts pantry quantities (from Notion or fallback JSON), converts to package counts using stored package size/unit data.
- Groups output by store sections with icons and estimated costs; writes checklist items to Notion Grocery List database (or exports structured JSON when DB not available).
- CLI summary highlights total cost, savings from pantry items, and provides optional print-friendly Markdown.

## 3. Recipe Import Enhancements (P1)
**Goal:** Make `scripts/add-recipe-interactive.js` match UX expectations for safe recipe library growth.

**Acceptance Criteria**
- Ingredient matching uses quantity scaling: prompts for packages used when existing item found, and divides cost per package to estimate actual recipe cost.
- Captures prep time, familiarity, and "safe" tag during input and writes to Notion fields.
- When new ingredients are created, script requests package size/unit and category so grocery list grouping remains accurate.
- Provides confirmation summary with anxiety-reducing cues (cost/time, safe tags) before Notion write.

## 4. Cost Recalculation Workflow (P2)
**Goal:** Keep recipe and shopping costs accurate with minimal effort.

**Acceptance Criteria**
- CLI (`scripts/update-prices.js`) batches price updates from CSV or manual prompts, updates Notion ingredient prices, and logs changes.
- Follow-up script (`scripts/recalculate-recipe-costs.js`) reads all recipes, recalculates totals from ingredient relations, and updates `Cost ($)` and `Cost per Serving ($)`.
- Outputs variance report highlighting recipes exceeding budget thresholds for review.

## 5. Front-End Status & Checklist Support (P2)
**Goal:** Surface neurodivergent-friendly cues in the UI once backend scripts deliver richer data.

**Acceptance Criteria**
- `WeeklyPlanView.jsx` displays plan status chips (Planned, Shopped, Complete) and CTA to mark transitions.
- `GroceryListView.jsx` renders grouped sections with checkboxes tied to data source, including aisle hints and estimated totals.
- `RecipeDetailView.jsx` shows prep time, cost per serving, and checkbox steps sourced from Notion instructions.
