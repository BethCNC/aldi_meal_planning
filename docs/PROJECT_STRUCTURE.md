# Project Structure

## Overview
This project has been reorganized into a single root structure suitable for Vercel deployment.

## Directory Layout

```
aldi_meal_planning/
├── index.html              # React app entry point
├── vite.config.js          # Vite configuration
├── tailwind.config.js      # Tailwind CSS config
├── postcss.config.js       # PostCSS config
├── package.json            # All dependencies (frontend + backend)
│
├── src/                    # Frontend React app
│   ├── main.jsx           # React entry point
│   ├── App.jsx            # Root component
│   ├── index.css          # Global styles (Tailwind)
│   ├── components/        # React components
│   ├── pages/             # Page components
│   ├── contexts/          # React contexts
│   ├── lib/               # Frontend libraries (Supabase client)
│   ├── api/               # Frontend API calls
│   └── utils/             # Frontend utilities
│
├── backend/                # Backend scripts and services
│   ├── index.js           # Main backend entry
│   ├── scrapers/          # Web scraping logic
│   ├── notion/            # Notion API integration
│   ├── supabase/          # Supabase backend clients
│   ├── ai/                # AI/OpenAI integration
│   ├── algorithms/        # Business logic (matching, generation)
│   └── utils/             # Backend utilities
│
├── scripts/                # CLI automation scripts
│   ├── add-recipe-interactive.js
│   ├── generate-meal-plan.js
│   ├── generate-grocery-list.js
│   └── ...
│
├── data/                   # Scraped data (JSON files)
│   ├── prices/
│   └── recipes/
│
├── docs/                   # Documentation
│
└── public/                 # Static assets
```

## Key Changes

1. **React app moved to root** - Vercel deploys from root
2. **Backend code moved to `backend/`** - Clear separation from frontend
3. **Single `package.json`** - All dependencies in one place
4. **Frontend code in `src/`** - Standard React/Vite structure

## Scripts

### Frontend
- `npm run dev` - Start Vite dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Backend
- `npm run scrape:prices` - Scrape Aldi prices
- `npm run scrape:recipes` - Scrape recipes
- `npm run sync:notion` - Sync to Notion
- `npm run pipeline` - Run full data pipeline

### Automation
- `npm run plan:generate` - Generate meal plan
- `npm run grocery:list` - Generate grocery list
- `npm run add:recipe` - Interactive recipe addition

## Environment Variables

Create `.env.local` in root:
```
VITE_SUPABASE_URL=your-url
VITE_SUPABASE_ANON_KEY=your-key
VITE_OPENAI_API_KEY=your-key
NOTION_API_KEY=your-key
NOTION_INGREDIENTS_DB_ID=your-id
NOTION_RECIPES_DB_ID=your-id
NOTION_MEAL_PLANNER_DB_ID=your-id
```

## Deployment

This structure is optimized for Vercel:
- Root contains React app (Vite)
- `backend/` can be used for serverless functions if needed
- Build output goes to `dist/` (Vite default)
