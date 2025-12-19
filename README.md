# Aldi Meal Planner 2.0

Aldi Meal Planner 2.0 is an open‑source application that automates weekly meal planning and grocery list creation using Aldi‑only ingredients. Its goal is to simplify decision making, reduce grocery spending and ensure variety by leveraging a combination of curated recipes, price data and AI‑generated suggestions.

## Features

- **Weekly meal plan generator**: Produce a customised week of dinners based on your budget, dietary preferences and category variety.
- **Grocery list builder**: Generate a consolidated shopping list with quantities, rounding up to whole packages to reflect real shopping.
- **Recipe library**: Store recipes with ingredients, instructions, category, cost and macros. Add new recipes manually, via scraping or through AI.
- **Price management**: Maintain current Aldi prices for accurate cost estimates and update monthly.
- **AI recipe discovery**: Scrape budget‑friendly recipes from community sites and generate new ones via a generative model.
- **User ratings & feedback**: Rate meals and use feedback to improve future plan suggestions.
- **Supabase backend**: All data lives in Supabase, enabling multi‑user accounts and easy hosting.
- **Accessible UI**: Responsive React interface designed with clear navigation and low cognitive load.

## Quickstart

### Prerequisites

- Node.js ≥ 18
- A Supabase account and project
- API keys for the generative model (if using recipe generation)
- Git and npm

### Setup

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd aldi_meal_planner
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file and set the following variables:

   ```
   SUPABASE_URL=<your-supabase-url>
   SUPABASE_ANON_KEY=<your-supabase-anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
   AI_API_KEY=<your-generative-model-api-key>
   ```

4. Run database migrations to set up tables:

   ```bash
   npm run migrate
   ```

5. (Optional) Import existing data from Notion:

   ```bash
   node scripts/import-from-notion.js --recipes=<path-to-exported-recipes.json> --ingredients=<path-to-exported-ingredients.json>
   ```

6. Start the development server:

   ```bash
   npm run dev
   ```

7. Open `http://localhost:3000` in your browser. Create an account or log in to begin planning meals.

### Running scheduled tasks

- **Price updates**: run `node scripts/update-prices.js` monthly after collecting new receipts.
- **Scrape recipes**: run `node scripts/scrape-recipes.js` to fetch new recipes from external sources.
- **Generate weekly plan**: run `node scripts/generate-plan.js` every Sunday to produce a meal plan and grocery list for the coming week. This script can be scheduled via cron.

## Contributing

Contributions are welcome! If you have an idea for a new feature or spot a bug, please open an issue or a pull request. Make sure to run tests (`npm test`) before submitting.

## Roadmap

See `meal_planning_prd.md` for the full product requirements and development milestones.

## License

This project is licensed under the MIT license. See `LICENSE` for details.
