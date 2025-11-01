# Aldi Meal Planning Scraper

Automated web scraping system to populate your Notion databases with Aldi prices and budget recipes.

## Setup

### 1. Install Dependencies
Run in your **VS Code integrated terminal**:
```bash
cd /Users/bethcartrette/REPOS/aldi_meal_planning
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

Edit `.env` and add your Notion integration key:
1. Go to https://www.notion.so/my-integrations
2. Create new integration → copy Internal Integration Token
3. Share your databases with the integration
4. Paste token into `NOTION_API_KEY`

### 3. Run Scrapers

**Scrape Aldi prices** (from simplegrocerydeals.com):
```bash
npm run scrape:prices
```

**Scrape budget recipes** (from blog ecosystem):
```bash
npm run scrape:recipes
```

**Sync to Notion**:
```bash
npm run sync:notion
```

**Run complete pipeline**:
```bash
npm run pipeline
```

## Project Structure

```
aldi_meal_planning/
├── src/
│   ├── scrapers/
│   │   ├── pricesScraper.js      # Scrapes Aldi pricing data
│   │   ├── recipesScraper.js     # Scrapes budget recipe blogs
│   │   └── sources.js            # Source configurations
│   ├── notion/
│   │   ├── syncToNotion.js       # Notion database sync
│   │   └── notionClient.js       # Notion API wrapper
│   ├── utils/
│   │   ├── scraper.js            # Shared scraping utilities
│   │   └── parser.js             # Data parsing functions
│   └── index.js                  # Main orchestrator
├── data/
│   ├── prices/                   # Scraped price data (JSON)
│   └── recipes/                  # Scraped recipe data (JSON)
└── logs/                         # Scraping logs
```

## Data Sources

### Pricing (Free)
- simplegrocerydeals.com/aldi-price-list
- Community-maintained, updated regularly

### Recipes (Free)
- dontwastethecrumbs.com
- momsconfession.com
- thriftyfrugalmom.com
- figjar.com
- mealswithmaria.site
- rootedatheart.com
- simplepurposefulliving.com

## Usage Notes

- Scrapers include 2-second delays to be respectful
- Data saved locally before Notion sync
- Logs written to `logs/` directory
- Failed requests retry up to 3 times
