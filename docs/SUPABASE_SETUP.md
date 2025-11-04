# Supabase Setup Guide

## What is Supabase?

**Supabase = PostgreSQL (SQL) in the Cloud + Dashboard**

Supabase gives you:
- ✅ PostgreSQL database (same SQL as we're using)
- ✅ Web dashboard to view/edit data
- ✅ Auto-generated REST API
- ✅ Real-time subscriptions
- ✅ Free tier (perfect for personal projects)

---

## Quick Start: 5 Steps

### Step 1: Create Account
1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up with GitHub (easiest)

### Step 2: Create Project
1. Click "New Project"
2. Fill in:
   - **Name:** aldi-meal-planning
   - **Database Password:** (save this!)
   - **Region:** Choose closest to you
3. Click "Create new project"
4. Wait ~2 minutes for setup

### Step 3: Get Connection Info
1. Go to **Settings** (gear icon)
2. Click **API**
3. Copy:
   - **Project URL:** `https://xxxxx.supabase.co`
   - **anon/public key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Step 4: Add to .env
```bash
# Add to your .env file
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 5: Create Schema
1. Go to **SQL Editor** in Supabase dashboard
2. Copy the schema from `docs/DATABASE_SCHEMA.md`
3. Paste and click "Run"

---

## Using Supabase Dashboard

### View Tables
1. Go to **Table Editor** in sidebar
2. See all your tables (recipes, ingredients, etc.)
3. Click any table to view/edit data

### Run SQL Queries
1. Go to **SQL Editor**
2. Type any SQL query
3. Click "Run" to see results

**Example query:**
```sql
SELECT * FROM recipes 
WHERE cost_per_serving < 5 
ORDER BY cost_per_serving;
```

### View Cost Calculations
```sql
SELECT * FROM recipe_cost_summary
ORDER BY cost_per_serving;
```

---

## Migrate from SQLite

Once you have SQLite working:

```bash
# Install Supabase client
npm install @supabase/supabase-js

# Run migration
node scripts/migrate-to-supabase.js --data
```

---

## Benefits Over SQLite

| Feature | SQLite | Supabase |
|---------|--------|----------|
| Web Dashboard | ❌ | ✅ |
| Share with others | ❌ | ✅ |
| Real-time updates | ❌ | ✅ |
| Automatic backups | ❌ | ✅ |
| Mobile access | ❌ | ✅ |
| API access | ❌ | ✅ |

---

## Free Tier Limits

✅ **500MB database** - Enough for 10,000+ recipes  
✅ **2GB bandwidth/month** - Plenty for personal use  
✅ **Unlimited API requests** - No rate limits  
✅ **2GB file storage** - For recipe images  

**Perfect for your meal planning project!**

---

## Next Steps

1. **Start with SQLite** (learn SQL basics)
2. **Migrate to Supabase** (when you want dashboard/sharing)
3. **Build web app** (optional, using Supabase API)

---

## Resources

- [Supabase Docs](https://supabase.com/docs)
- [Supabase Dashboard](https://app.supabase.com)
- [PostgreSQL Tutorial](https://www.postgresqltutorial.com/)
