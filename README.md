# Aldi Meal Planner

> Automated weekly dinner planning and grocery list generation using Aldi-only ingredients to minimize cost, reduce waste, and cut planning time to under ten minutes per week.

**Built with:** Node.js, Notion API, automated web scraping  
**Target:** Budget-conscious households, neurodivergent users, busy professionals  
**Status:** Active development | Portfolio case study

---

## Overview

This project transforms the overwhelming task of weekly meal planning into a streamlined, automated workflow. By constraining ingredients to Aldi's catalog and automating the decision-making process, it removes cognitive load while keeping grocery costs predictable and low.

### What It Does

- **Generates** budget-conscious meal plans for 5–7 dinners per week
- **Rotates** protein variety and includes leftover-friendly meals
- **Calculates** accurate per-meal and weekly costs from real Aldi pricing
- **Produces** a consolidated, category-organized grocery list ready for shopping
- **Syncs** with Notion databases as the single source of truth
- **Flags** non-Aldi items when they appear in scraped recipes

### Core Value Proposition

**Time**: Planning drops from 2+ hours to under 10 minutes  
**Money**: Weekly grocery spending stays within a fixed budget cap  
**Mental Health**: Eliminates decision paralysis and "what's for dinner?" anxiety  
**Waste**: Intentional ingredient reuse across recipes reduces food waste

---

## Architecture

### Data Model

Three primary Notion databases form the system's backbone:

**1. Aldi Ingredients** (`3d79c2030ca045faa454ff4a72dc1143`)
- Item names, package sizes/units, base units (g/ml/each)
- Price per package, price per base unit (calculated)
- Grocery categories (Produce, Meat, Dairy, Pantry, Frozen, etc.)
- Source URLs and last-updated timestamps

**2. Aldi Recipes** (`659afecb3faf43cd883af3e756f7efc9`)
- Recipe metadata (title, servings, source URL)
- Linked ingredients (multi-select relation)
- Instructions and notes
- Total cost and cost-per-serving (auto-calculated from linked ingredients)

**3. Aldi Meal Planner** (`29f86edc-ae2c-808e-a798-e57a82ca904f`)
- Calendar view of weekly dinners
- Each day links to a recipe from the Recipes database
- Free-text fields for breakfast, lunch, and snacks
- Weekly budget tracking and rollup totals

**4. Receipts** (optional: `a644ab1b-20f0-4bdb-aa1d-bf1e1f6ab450`)
- Manual entry for keeping prices current from actual shopping trips

### Automation Flow

```
1. Recipe Curation
   â†' Scrape Aldi meal plans from blogs
   â†' Filter for budget-friendly, simple recipes
   â†' Manually verify and import to Notion

2. Price Maintenance
   â†' Scrape Aldi prices from aggregator sites
   â†' Sync to Notion Ingredients database
   â†' Update price-per-base-unit formulas

3. Meal Plan Generation (weekly)
   â†' Select 5–7 recipes within budget cap
   â†' Rotate protein types for variety
   â†' Include leftover and flexible nights
   â†' Populate calendar for upcoming week

4. Grocery List Generation
   â†' Extract all ingredients from week's recipes
   â†' Consolidate duplicate items
   â†' Convert to packages (round up)
   â†' Group by store category for efficient shopping
   â†' Output as printable "Week of {date}" page
```

---

## Getting Started

### Prerequisites

- **Node.js** v18 or later
- **Notion account** with API integration enabled
- **Notion databases** created and shared with your integration

### Installation

**1. Clone and install dependencies:**

```bash
npm install
```

**2. Set up environment variables:**

Create a `.env` file in the project root:

```env
NOTION_API_KEY=secret_your_notion_integration_token
NOTION_INGREDIENTS_DB_ID=3d79c2030ca045faa454ff4a72dc1143
NOTION_RECIPES_DB_ID=659afecb3faf43cd883af3e756f7efc9
NOTION_MEAL_PLANNER_DB_ID=29f86edc-ae2c-808e-a798-e57a82ca904f
```

**3. Share databases with your integration:**

- Open each database in Notion
- Click `...` menu → `Add connections`
- Select your integration
- Repeat for all three databases

### Notion Setup

**Ingredients Database Properties:**
- `Name` (Title)
- `Package Size` (Text) — e.g., "1 lb", "16 oz"
- `Base Unit` (Select) — g, ml, or each
- `Price per Package` (Number)
- `Price per Base Unit` (Formula) — auto-calculated
- `Category` (Select) — Produce, Meat, Dairy, Pantry, Frozen, Other
- `Source URL` (URL)
- `Last Updated` (Date)

**Recipes Database Properties:**
- `Recipe Name` (Title)
- `Servings` (Number)
- `Ingredients` (Relation → Ingredients DB, multi-select)
- `Instructions` (Text)
- `Total Cost` (Rollup from Ingredients)
- `Cost per Serving` (Formula)
- `Source URL` (URL)
- `Tags` (Multi-select) — Quick, Leftover-Friendly, Sheet Pan, etc.

**Meal Planner Database Properties:**
- `Date` (Date)
- `Dinner` (Relation → Recipes DB)
- `Breakfast` (Text)
- `Lunch` (Text)
- `Snacks` (Text)
- `Daily Cost` (Rollup from Dinner recipe)

---

## Usage

### Scraping and Syncing

**Scrape Aldi prices:**

```bash
npm run scrape:prices
```
- Outputs: `data/prices/aldi-prices-{timestamp}.json`
- Sources: SimpleGroceryDeals and other price aggregators

**Scrape recipe plans:**

```bash
npm run scrape:recipes
```
- Outputs: `data/recipes/aldi-recipes-{timestamp}.json`
- Sources: DontWasteTheCrumbs, MomsConfession, ThriftyFrugalMom, and others

**Sync prices to Notion:**

```bash
npm run sync:notion
```
- Reads latest `data/prices/*.json`
- Updates existing ingredients or creates new entries
- Calculates price-per-base-unit automatically

**Run full pipeline:**

```bash
npm run pipeline
```
- Scrapes prices → scrapes recipes → syncs to Notion

### Core Scripts (In Development)

**Add recipes interactively:**

```bash
node scripts/add-recipe-interactive.js
```
- Prompts for recipe details via CLI
- Links ingredients from existing Notion database
- Calculates cost automatically

**Generate weekly meal plan:**

```bash
node scripts/generate-meal-plan.js --budget 75 --servings 4
```
- Selects 5–7 recipes within budget
- Rotates proteins for variety
- Includes leftover and flexible nights
- Populates Notion calendar view

**Generate grocery list:**

```bash
node scripts/generate-grocery-list.js --week 2025-11-04
```
- Extracts ingredients from week's meal plan
- Consolidates quantities and converts to packages
- Groups by grocery category
- Outputs printable "Week of {date}" Notion page

**Update prices from receipts:**

```bash
node scripts/update-prices.js
```
- Reads manual receipt entries from Receipts database
- Updates ingredient prices with latest values

**Analyze recipe costs:**

```bash
node scripts/analyze-recipe-costs.js
```
- Generates cost report for all recipes
- Identifies most/least expensive meals
- Suggests budget optimizations

---

## Project Structure

```
aldi_meal_planning/
├── .env                              # API keys and database IDs
├── .env.example                      # Template for environment variables
├── package.json                      # Dependencies and npm scripts
├── README.md                         # This file
│
├── docs/
│   ├── PROJECT_OVERVIEW.md           # High-level vision and goals
│   ├── CURSOR_AI_WORKFLOW.md         # Complete technical specification
│   ├── QUICK_START.md                # Quick reference for immediate action
│   ├── NOTION_WORKFLOW_GUIDE.md      # Notion-specific setup guide
│   └── INDEX.md                      # Documentation index
│
├── src/
│   ├── index.js                      # Main pipeline orchestrator
│   ├── scrapers/
│   │   ├── pricesScraper.js          # Aldi price scraping logic
│   │   ├── recipesScraper.js         # Recipe plan scraping logic
│   │   └── sources.js                # Source URLs and selectors
│   ├── utils/
│   │   ├── scraper.js                # Generic scraper utilities
│   │   └── parser.js                 # Data parsing and normalization
│   └── notion/
│       ├── notionClient.js           # Notion API client wrapper
│       └── syncToNotion.js           # Price sync implementation
│
├── scripts/                          # Automation scripts (in development)
│   ├── curate-recipes.js             # Filter scraped recipes by criteria
│   ├── add-recipe-interactive.js     # Interactive recipe import CLI
│   ├── generate-meal-plan.js         # Weekly meal plan generator
│   ├── generate-grocery-list.js      # Grocery list consolidator
│   ├── update-prices.js              # Price update from receipts
│   └── analyze-recipe-costs.js       # Cost analysis and reporting
│
├── data/
│   ├── prices/                       # Scraped price JSON files
│   ├── recipes/                      # Scraped recipe JSON files
│   └── curated-recipes.json          # Filtered recipe candidates
│
└── logs/                             # Scraper logs and error reports
```

---

## Data Formats

### Price Snapshot (JSON)

```json
{
  "source": "SimpleGroceryDeals",
  "collectedAt": "2025-11-01T22:30:00Z",
  "items": [
    {
      "name": "Whole Milk 1 gal",
      "unit": "gal",
      "price": 2.89,
      "url": "https://example.com/item"
    }
  ]
}
```

### Recipe Plan Snapshot (JSON)

```json
{
  "title": "One Week $50 ALDI Meal Plan",
  "url": "https://example.com/post",
  "source": "BlogName",
  "totalCost": 50,
  "familySize": 4,
  "mealCount": 7,
  "ingredients": [
    "2 lb ground beef",
    "1 onion"
  ],
  "recipes": [
    "Cheeseburger Skillet",
    "Chicken Fajitas"
  ],
  "collectedAt": "2025-11-01T22:30:00Z"
}
```

---

## Design Principles

### ADHD-Friendly Architecture

This system was designed with neurodivergent users in mind. Core principles:

**1. Remove decisions, don't organize them**
- System decides → user approves
- No browsing, no choosing
- Automation over configuration

**2. Reduce cognitive load**
- Single-column layouts
- Clear visual hierarchy
- Minimal text
- One primary action per screen

**3. Provide structure and routine**
- Consistent weekly format
- Same process every Sunday
- Predictable meal rotation
- Built-in flexibility (leftover/order-out nights)

**4. Satisfy completion drive**
- Checkboxes everywhere
- Status indicators
- Progress tracking
- Clear endpoints

**5. Eliminate anxiety triggers**
- Show costs upfront
- Time estimates included
- No surprises at the store
- Permission to deviate from the plan

---

## Development

### Code Style Guidelines

From project owner preferences:

- **Arrow functions:** Always use parentheses — `(item) => item.price`
- **Object literals:** Minimal spaces — `{name, cost}`
- **Variable names:** Clear and descriptive, avoid abbreviations
- **Comments:** Only for complex logic, not obvious operations
- **Commands:** Always specify where to run (VS Code terminal vs macOS shell)

### Testing Approach

- Test with small datasets first (1–2 recipes)
- Verify Notion entries manually after script runs
- Use `--dry-run` flags where implemented
- Log all operations for debugging

### Error Handling

- Always wrap Notion API calls in `try-catch`
- Provide helpful error messages with context
- Log errors to console and `logs/` directory

---

## Regional Notes

**Pricing Assumptions:** North Carolina Aldi stores  
**Non-Aldi Items:** Flagged when encountered in scraped recipes  
**Store Categories:** Based on Charlotte, NC Aldi layout (Produce front-left, Meat back-left, Dairy back-right, Frozen middle-right, Pantry center)

---

## Portfolio Context

This project serves dual purposes:

**1. Functional Tool**
- Real-world meal planning automation for the project owner
- Addresses genuine pain points around decision fatigue and budget anxiety

**2. UX/UI Case Study**
- Demonstrates end-to-end product design process
- Showcases systems thinking and accessibility awareness
- Documents research, iteration, and validation
- Highlights neurodivergent-first design principles

**Case Study Emphasis:**
- User research and problem definition
- Information architecture and data modeling
- Automation design and implementation
- Real-world validation and measurable outcomes
- Honest reflection on iterations and learning

---

## Current Status

**✅ Completed:**
- Notion database architecture and formulas
- Price scraping from aggregator sites
- Recipe scraping from meal planning blogs
- Notion API sync for ingredient prices
- Project documentation and workflow specs

**🚧 In Progress:**
- Recipe curation and manual import (target: 25+ recipes)
- Interactive recipe addition CLI tool
- Meal plan generation algorithm

**📋 Planned:**
- Grocery list consolidation and formatting
- Price update from manual receipts
- Cost analysis and optimization reporting
- Web scraper fixes for additional sources

**🎯 Immediate Priorities:**
1. Build `add-recipe-interactive.js` to streamline recipe imports
2. Reach 25+ recipes in Notion database
3. Implement meal plan generator with budget constraints
4. Create printable grocery list output

---

## Success Metrics

### Quantitative
- **Planning Time:** < 10 minutes per week (down from 2+ hours)
- **Budget Adherence:** 95%+ of plans stay within weekly cap
- **Cost Accuracy:** ±5% between estimate and actual spend
- **Waste Reduction:** Ingredients reused across 2+ recipes per week

### Qualitative
- **Reduced Anxiety:** No more "what's for dinner?" paralysis
- **Improved Routine:** Consistent Sunday planning ritual
- **Increased Cooking:** More home meals, fewer emergency takeout orders
- **Mental Clarity:** Decision-making energy preserved for other tasks

---

## Contributing

This is currently a solo project serving as both a functional tool and a portfolio case study. If you're interested in the approach or have suggestions, feel free to reach out.

**Areas Open for Discussion:**
- Additional Aldi price sources
- Recipe blog scraping improvements
- Meal plan optimization algorithms
- Grocery list formatting options

---

## Technical Notes

### Notion API Rate Limits
- 3 requests per second per integration
- Scripts include delays to stay within limits
- Bulk operations batch requests appropriately

### Scraping Considerations
- CSS selectors may break if source sites update
- Retry logic included for transient failures
- Logs capture all scraping activity for debugging

### Data Normalization
- Quantities converted to base units (g/ml/each)
- Package sizes parsed from text (e.g., "1 lb" → 453.59g)
- Price-per-base-unit calculated via Notion formulas

---

## License

Private project — Not open source at this time.

---

## Contact

**Project Owner:** Beth Cartrette  
**Purpose:** Functional tool + UX/UI portfolio case study  
**Tech Stack:** Node.js, Notion API, web scraping  
**Location:** Charlotte, North Carolina

---

## Acknowledgments

**Recipe Sources:**
- DontWasteTheCrumbs
- MomsConfession
- ThriftyFrugalMom
- TheFigJar
- MealsWithMaria
- RootedAtHeart
- SimplePurposefulLiving

**Price Sources:**
- SimpleGroceryDeals
- Manual receipt entry

**Inspiration:**
- Neurodivergent community insights on decision fatigue
- Budget-conscious families sharing meal planning strategies
- Aldi shoppers documenting weekly hauls and costs

---

**Last Updated:** November 2025  
**Version:** 1.0.0 (Active Development)