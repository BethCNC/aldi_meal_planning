# UX Requirement Coverage Map

This document maps the Aldi Meal Planner UX expectations from the case study notes to the current implementation.

_Source reference: [Aldi Meal Planner UI/UX Case Study Notes](https://www.notion.so/7starsdesign/Aldi-Meal-Planner-UI-UX-Case-Study-Notes-2a086edcae2c80a693feccb53a974f28?source=copy_link)_

## Decision-Free Planning
- **Requirement:** System must auto-select six dinners plus leftover and flexible nights; user only reviews.
- **Current Coverage:** `backend/algorithms/mealPlanGenerator.js` auto-picks five meals, adds order-out and leftover placeholders, and enforces lightweight protein rotation.
- **Gap:** Generator pulls from Supabase (`getRecipes`) rather than Notion, so it bypasses the Notion source-of-truth requirement. No explicit "review then approve" flow on the front-end; `WeeklyPlanView.jsx` immediately shows generated plan without approval state or guard rails.

## Budget Enforcement & Transparency
- **Requirement:** Weekly budget target ($100) with upfront visibility and swaps until budget met.
- **Current Coverage:** Meal generator limits candidate recipes via `maxCostPerServing` and calculates total cost, while `BudgetProgress.jsx` visualizes spend vs. budget.
- **Gap:** No iterative swap logic when over budget; total cost can exceed target with no retry. Costs rely on Supabase recipes whose pricing may diverge from latest Notion ingredient data.

## Grocery List Grouping & Store Flow
- **Requirement:** Lists grouped by Aldi layout with quantities converted to packages and total estimate.
- **Current Coverage:** `backend/algorithms/groceryListGenerator.js` groups items by Produce/Meat/Dairy/Pantry/Frozen, computes packages, and totals cost.
- **Gap:** Generator depends on Supabase tables (`grocery_lists`, `ingredients`) instead of Notion relations. Front-end `GroceryListView.jsx` is missing per-item checkboxes or aisle callouts consistent with the UX notes.

## Safe Recipe Library & Ingredient Catalog
- **Requirement:** Maintain vetted 25+ recipes and Aldi ingredient catalog directly in Notion.
- **Current Coverage:** `scripts/add-recipe-interactive.js` writes to Notion with ingredient matching, and `backend/notion/notionClient.js` exposes Notion helpers.
- **Gap:** Interactive script assumes one package per ingredient regardless of quantity; no per-serving scaling. Meal generator ignores Notion data entirely. No automated sync from Notion to Supabase, causing dual sources.

## Neurodivergent Support & UI State
- **Requirement:** Highlight "today," show time/cost per meal, provide completion checkboxes, and minimize text density.
- **Current Coverage:** `DayCard.jsx` receives `isToday` flag and renders current day styling; `WeeklyPlanView.jsx` provides budget bar and simple layout.
- **Gap:** Recipes lack time estimates surfaced in UI. No checklist/checkbox components tied to grocery progress or meal completion. Instructions view (`RecipeDetailView.jsx`) does not break steps into linear, checkbox-driven flow.

## Automation Feedback & Status Tracking
- **Requirement:** Explicit statuses (Planned, Shopped, Complete) and confirmatory messaging to reduce anxiety.
- **Current Coverage:** None in current UI; `meal_plans` rows do not track status fields and no front-end affordances exist.
- **Gap:** Need status properties in Notion/Supabase and UI components to toggle them, plus success confirmations that match the UX narrative.

## Price Maintenance Workflow
- **Requirement:** Quick price updates and automatic recipe recalculation.
- **Current Coverage:** `backend/notion/notionClient.js` has `updateIngredientPrice` and `syncIngredients`, but no CLI or UI surfaces them.
- **Gap:** No dedicated tool to batch-update prices or recalc recipe costs; Supabase recipes become stale relative to Notion data.
