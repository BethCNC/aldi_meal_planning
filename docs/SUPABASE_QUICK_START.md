# Supabase Quick Start Guide

## 🚀 Complete Setup in 10 Minutes

Follow these steps to get Supabase working with your meal planning project.

---

## Step 1: Create Supabase Account (2 min)

1. Go to **[supabase.com](https://supabase.com)**
2. Click **"Start your project"**
3. Sign up with **GitHub** (easiest method)
4. Verify your email if needed

✅ **Done when:** You see the Supabase dashboard

---

## Step 2: Create Project (2 min)

1. Click **"New Project"** button (green)
2. Fill in:
   - **Organization:** Choose your org (or create new)
   - **Name:** `aldi-meal-planning`
   - **Database Password:** Choose a strong password ⚠️ **SAVE THIS!**
   - **Region:** Choose closest to you (US East, US West, etc.)
3. Click **"Create new project"**
4. Wait ~2 minutes for setup (coffee break ☕)

✅ **Done when:** You see "Project is ready!" message

---

## Step 3: Get Your API Keys (1 min)

1. In your project dashboard, click **Settings** (gear icon in sidebar)
2. Click **API** in the settings menu
3. You'll see:
   - **Project URL:** `https://xxxxx.supabase.co` ← Copy this
   - **anon public key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` ← Copy this

✅ **Done when:** You have both values copied

---

## Step 4: Add Keys to Your Project (1 min)

1. Open your project's `.env` file
2. Add these lines (replace with your actual values):

```bash
# Supabase Configuration
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Keep your existing Notion keys below
NOTION_API_KEY=your-existing-key
NOTION_INGREDIENTS_DB_ID=your-existing-id
NOTION_RECIPES_DB_ID=your-existing-id
```

3. Save the file

✅ **Done when:** Your .env file has SUPABASE_URL and SUPABASE_KEY

---

## Step 5: Create Database Schema (2 min)

1. In Supabase dashboard, click **SQL Editor** in the sidebar
2. Click **"New query"** button
3. Open `docs/DATABASE_SCHEMA_SUPABASE.md` in your project
4. **Copy the entire SQL script** (it's in a code block)
5. **Paste** into the Supabase SQL Editor
6. Click **"Run"** button (or press Cmd/Ctrl + Enter)
7. You should see: **"Success. No rows returned"**

✅ **Done when:** You see "Success" message

---

## Step 6: Verify Schema (1 min)

Run this command in your terminal:

```bash
node scripts/setup-supabase.js --check
```

You should see:
```
✅ Table "ingredients" exists
✅ Table "recipes" exists
✅ Table "recipe_ingredients" exists
✅ Table "units" exists
✅ Table "unit_conversions" exists
✅ All tables exist! Schema is set up correctly.
```

✅ **Done when:** All tables are verified

---

## Step 7: Import Your Data (2 min)

Run this command:

```bash
node scripts/migrate-to-supabase.js
```

This will:
- Fetch all ingredients from Notion
- Fetch all recipes from Notion
- Import everything into Supabase
- Link recipes to ingredients

✅ **Done when:** You see "Migration complete!" message

---

## Step 8: Explore Your Data! (1 min)

1. In Supabase dashboard, click **Table Editor** in sidebar
2. Click on **"recipes"** table
3. You should see all your recipes! 🎉
4. Click on **"ingredients"** to see all ingredients
5. Click on **"recipe_ingredients"** to see the links

✅ **Done when:** You can see your data in Supabase

---

## 🎉 You're Done!

Your data is now in Supabase. You can:

- ✅ **View/edit data** in the web dashboard
- ✅ **Run SQL queries** in SQL Editor
- ✅ **Calculate recipe costs** with SQL
- ✅ **Share access** with others (optional)

---

## Next Steps: Learn SQL

### Try These Queries in SQL Editor

**1. See all recipes:**
```sql
SELECT * FROM recipes;
```

**2. See recipes with costs:**
```sql
SELECT name, servings, cost_per_serving 
FROM recipes 
ORDER BY cost_per_serving;
```

**3. Find budget recipes (under $5/serving):**
```sql
SELECT name, cost_per_serving 
FROM recipes 
WHERE cost_per_serving < 5 
ORDER BY cost_per_serving;
```

**4. Calculate recipe costs (using the view):**
```sql
SELECT * FROM recipe_cost_summary
ORDER BY cost_per_serving;
```

---

## Troubleshooting

### "Connection error"
- ✅ Check SUPABASE_URL starts with `https://`
- ✅ Check SUPABASE_KEY is the "anon public" key (not service_role)
- ✅ Make sure you saved .env file

### "Schema not found" 
- ✅ Run the SQL schema in SQL Editor first
- ✅ Check you clicked "Run" and saw "Success"

### "Table doesn't exist"
- ✅ Go back to Step 5 and run the schema SQL again
- ✅ Check for any error messages in SQL Editor

### "Migration error"
- ✅ Make sure Notion keys are in .env
- ✅ Check internet connection
- ✅ Verify Supabase project is ready (not still setting up)

---

## What You Learned

✅ **Supabase basics** - Cloud PostgreSQL database  
✅ **Database schema** - How tables relate  
✅ **Data migration** - Moving data between systems  
✅ **SQL queries** - Querying your data  

---

## Resources

- 📖 [Supabase Docs](https://supabase.com/docs)
- 📖 [SQL Tutorial](https://www.sqlitetutorial.net/sql-cheat-sheet/)
- 📖 [PostgreSQL Tutorial](https://www.postgresqltutorial.com/)

---

**Need help?** Check `docs/SQL_QUERIES.md` for more SQL examples!
