# Aldi Meal Planning Scraper

Automate budget‑friendly meal planning with live Aldi pricing and curated recipe plans. This Node.js pipeline scrapes Aldi price data and weekly meal‑plan posts from multiple blogs, normalizes and stores the results as timestamped JSON, and syncs ingredient prices into Notion. It's designed to be respectful to source sites and easy to extend for recipe syncing and budget‑aware planning.

**Repository**: [https://github.com/BethCNC/aldi_meal_planning.git](https://github.com/BethCNC/aldi_meal_planning.git)

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Setup](#environment-setup)
- [Configuration](#configuration)
  - [Source configuration](#source-configuration)
  - [Notion setup](#notion-setup)
- [Usage](#usage)
  - [Scripts](#scripts)
  - [Full pipeline](#full-pipeline)
- [Data Model](#data-model)
- [Notion Integration](#notion-integration)
- [Adding or Updating Sources](#adding-or-updating-sources)
- [Roadmap](#roadmap)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Overview

This project:

- Scrapes Aldi prices from a community-maintained price list
- Scrapes weekly budget meal-plan posts from several food blogs
- Parses cost, family size, meal count, and ingredients where available
- Saves all scrapes to timestamped JSON files
- Syncs ingredient price data to a Notion "Ingredients" database (recipes sync planned)

**Tech stack:**

- Node.js 18+
- axios + cheerio for scraping
- @notionhq/client for Notion API
- Simple utilities for retry, delay, parsing, and logging

## Features

- Price scraping with polite rate limiting and retry
- Recipe plan scraping from 7 sources with site-specific selectors
- Timestamped data snapshots under `data/prices` and `data/recipes`
- Notion sync for ingredients with create-or-update behavior
- Clear modular structure for scrapers, parsers, and Notion client

## Architecture

- `src/index.js`: Orchestrates the full pipeline
- `src/scrapers/pricesScraper.js`: Scrapes Aldi price list
- `src/scrapers/recipesScraper.js`: Scrapes meal-plan posts
- `src/scrapers/sources.js`: Source definitions and CSS selectors
- `src/utils/scraper.js`: HTTP, retries, delays, cheerio helpers
- `src/utils/parser.js`: Ingredient line parsing, numeric extraction, URL normalization
- `src/notion/notionClient.js`: Notion client and CRUD helpers
- `src/notion/syncToNotion.js`: Reads latest prices JSON and syncs to Notion

**Data folders:**

- `data/prices`: Aldi pricing snapshots
- `data/recipes`: Meal-plan snapshots
- `logs`: scrape logs (gitignored)

## Getting Started

### Prerequisites

- Node.js v18+ and npm or yarn
- A Notion account and integration token
- Notion databases for Ingredients (required) and Recipes (optional)

### Installation

```bash
git clone https://github.com/BethCNC/aldi_meal_planning.git
cd aldi_meal_planning
npm install
```

### Environment Setup

1. **Create a `.env` file from the example:**

   ```bash
   cp .env.example .env
   ```

2. **Add your secrets:**

   ```env
   NOTION_API_KEY=secret_...
   NOTION_INGREDIENTS_DB_ID=...
   NOTION_RECIPES_DB_ID=...  # Optional
   ```

3. **Share your Notion databases with the integration:**
   - Open each database in Notion
   - Click the "..." menu → "Add connections"
   - Select your integration
   - This allows the integration to read/write to your databases

## Configuration

### Source configuration

Edit `src/scrapers/sources.js` to:

- Add or remove price sources
- Add recipe sources
- Update CSS selectors if sites change structure

**Current sources:**

- **Pricing**: SimpleGroceryDeals Aldi price list
- **Recipes**: DontWasteTheCrumbs, MomsConfession, ThriftyFrugalMom, TheFigJar, MealsWithMaria, RootedAtHeart, SimplePurposefulLiving

### Notion setup

**Ingredients database recommended properties:**

- `Name` (Title)
- `Price` (Number)
- `Unit` (Text, optional)
- `Source` (Text, optional)
- `URL` (URL, optional)

**Recipes database** (planned for sync):

- `Title` (Title)
- `Total Cost` (Number)
- `Ingredients` (Relation → Ingredients)
- `Source URL` (URL)

## Usage

### Scripts

**Scrape Aldi prices:**

```bash
npm run scrape:prices
```

Outputs: `data/prices/aldi-prices-[timestamp].json`

**Scrape recipe plans:**

```bash
npm run scrape:recipes
```

Outputs: `data/recipes/aldi-recipes-[timestamp].json`

**Sync ingredient prices to Notion:**

```bash
npm run sync:notion
```

Reads latest prices JSON and upserts into Notion Ingredients DB

### Full pipeline

Run end-to-end: prices → recipes → Notion sync

```bash
npm run pipeline
```

Or:

```bash
node src/index.js
```

All scrapes are logged under `logs/` with retry and delay behavior enabled.

## Data Model

**Price snapshot (example):**

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

**Recipe plan snapshot (example):**

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

**Notes on variability:**

- Ingredients and recipe titles may be partially captured depending on site structure
- Selectors are intentionally simple and may need per-site refinements

## Notion Integration

`syncToNotion` reads the newest JSON in `data/prices` and:

- Finds existing ingredient rows by name
- Updates Price and last priced info
- Creates a new row if not found
- Returns counts of created, updated, and failures

Recipes are not yet synced; a similar module can be implemented for the recipes DB.

## Adding or Updating Sources

1. Add a source entry in `src/scrapers/sources.js`

2. Provide:

   - One or more URLs per source
   - CSS selectors for title, cost, ingredients, recipe names
3. Run a scoped scrape and verify:

   ```bash
   npm run scrape:recipes
   ```

4. Inspect the resulting JSON for completeness and adjust selectors as needed

## Roadmap

- Recipe sync to Notion with relations to Ingredients
- More robust per-site extraction for ingredients and recipe titles
- Multi-source pricing or direct first-party pricing where allowed
- Budget-aware planning: compute per-meal costs and suggest menus within a weekly budget

## Troubleshooting

**Notion sync fails:**

- Verify `NOTION_API_KEY` and DB IDs in `.env`
- Ensure databases are shared with the integration

**Scraping gaps or errors:**

- Site structure may have changed; update selectors in `sources.js`
- Some sites block automated requests; check logs for HTTP status and retry notes

**Node compatibility:**

- Confirm Node v18+ with `node --version`

## License

MIT

## Author

Beth Cartrette

---

**Note**: This tool is for personal use. Please respect the terms of service of the websites being scraped and use responsibly.
