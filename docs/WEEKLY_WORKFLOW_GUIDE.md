# Weekly Meal Planning Workflow Guide

**Your automated weekly meal planning system is ready!** 🎉

---

## 🚀 Quick Start Workflow

### **Step 1: Build Your Recipe Database**

Add recipes to Notion using the interactive tool:

```bash
npm run add:recipe
```

**What it does:**
- Prompts for recipe name, servings, category
- Lets you paste ingredient list
- Auto-matches ingredients from your database
- Prompts for costs on new ingredients
- Calculates total cost automatically
- Creates recipe in Notion with all links

**Goal:** Get to 20-25 recipes for variety

---

### **Step 2: Calculate Recipe Costs**

After linking ingredients to recipes, calculate costs:

```bash
npm run calc:costs
```

**What it does:**
- Reads all recipes from Notion
- Calculates cost from linked ingredients
- Updates `Cost ($)` and `Cost per Serving ($)` automatically

---

### **Step 3: Generate Weekly Meal Plan**

**Option A: Auto-Generate** (Recommended)

```bash
# Default: $75 budget, 4 servings, 7 days, current week
npm run plan:generate

# Custom budget and settings
npm run plan:generate -- --budget 80 --servings 4 --days 7

# Specific week
npm run plan:generate -- --budget 75 --start-date 2025-01-27
```

**What it does:**
- Finds affordable recipes within budget
- Optimizes for variety (different protein categories)
- Creates meal plan entries in Notion Meal Planner database
- Shows total cost vs budget

**Option B: Drag & Drop in Notion** (Manual)

1. Open your **Aldi Meal Planner** database in Notion
2. Drag recipe cards from Recipes database to calendar
3. Fill in dates
4. Run grocery list generator (see Step 4)

---

### **Step 4: Generate Grocery List**

After meals are planned (auto-generated OR drag-dropped):

```bash
# Current week
npm run grocery:list

# Specific week
npm run grocery:list -- --week 2025-01-27

# Custom date range
npm run grocery:list -- --start 2025-01-27 --end 2025-02-02
```

**What it does:**
- Reads meal plan from Notion
- Aggregates all ingredients from recipes
- Consolidates duplicates
- Groups by category (Meat, Produce, Dairy, Pantry)
- Calculates total estimated cost
- Saves to `grocery-list.txt` (or custom file)

**Output format:**
```
🛒 GROCERY LIST
==================================================
Week: 2025-01-27 to 2025-02-02
Recipes: 7

🥩 MEAT
  • Ground beef - $7.98
  • Chicken breast - $4.50

🥦 PRODUCE
  • Zucchini - $2.90
  • Onions - $1.79

💰 TOTAL ESTIMATED COST: $68.42
```

---

## 📋 Complete Weekly Routine

### **Sunday Morning (15 minutes):**

```bash
# 1. Generate this week's meal plan
npm run plan:generate -- --budget 75

# 2. Generate grocery list
npm run grocery:list

# 3. Open grocery-list.txt and review
# 4. Shop at Aldi!
# 5. Cook the week's meals
```

### **When Adding New Recipes (3-5 minutes):**

```bash
npm run add:recipe
```

Follow the prompts - tool handles ingredient matching and cost calculation.

### **Monthly Price Updates (10 minutes):**

1. Edit ingredient prices in Notion manually, OR
2. Re-import price data if you have updated Excel file
3. Recalculate recipe costs:
   ```bash
   npm run calc:costs
   ```

---

## 🎯 How It Works Together

```
Recipe Database
    ↓ (linked ingredients)
Cost Calculator
    ↓ (budget-aware selection)
Meal Plan Generator
    ↓ (aggregates ingredients)
Grocery List Generator
    ↓ (formatted output)
Print/Digital Shopping List
```

---

## 💡 Workflow Options

### **Fully Automated:**
1. Run `npm run plan:generate`
2. Run `npm run grocery:list`
3. Shop and cook

**Time:** ~15 minutes total

### **Semi-Automated (Drag & Drop):**
1. Open Notion Meal Planner
2. Drag recipes to calendar days
3. Run `npm run grocery:list`
4. Shop and cook

**Time:** ~10 minutes (faster if you know what you want)

### **Manual Review:**
1. Run `npm run plan:generate`
2. Review in Notion, adjust if needed
3. Run `npm run grocery:list`
4. Shop and cook

**Time:** ~20 minutes (includes review time)

---

## 📊 Budget Management

The system helps you stay within budget by:

1. **Auto-Selection:** Only picks recipes that fit your budget per meal
2. **Cost Calculation:** Shows exact totals before you shop
3. **Per-Serving Costs:** Makes it easy to see value
4. **Grocery List Totals:** See estimated cost before shopping

**Example:**
```bash
$ npm run plan:generate -- --budget 75

💰 Total: $68.42 / $75.00
   Remaining: $6.58
```

You'll know exactly what you're spending before you shop!

---

## 🔧 Troubleshooting

### **"No recipes found"**
- Add recipes first: `npm run add:recipe`
- Or link ingredients to existing recipes in Notion

### **"No meal plan entries found"**
- Generate meal plan: `npm run plan:generate`
- Or add meals manually in Notion

### **"Meal Planner database ID not configured"**
- Check `.env` has `NOTION_ALDI_WEEKLY_MEAL_PLANNING_DB_ID`
- Run `npm run verify:notion` to check database structure

### **Grocery list shows $0 costs**
- Make sure ingredients are linked to recipes
- Run `npm run calc:costs` to update recipe costs
- Check ingredient prices are set in Notion

---

## 📝 All Available Commands

| Command | Description |
|---------|-------------|
| `npm run add:recipe` | Add new recipe interactively |
| `npm run calc:costs` | Calculate recipe costs from ingredients |
| `npm run plan:generate` | Generate weekly meal plan |
| `npm run grocery:list` | Generate shopping list from meal plan |
| `npm run verify:notion` | Check Notion database structure |

---

## ✅ Success Checklist

**You're ready when:**
- [ ] 20+ recipes in Notion
- [ ] Recipes have linked ingredients
- [ ] Recipe costs are calculated
- [ ] Meal Planner database exists in Notion
- [ ] Can generate meal plan successfully
- [ ] Can generate grocery list successfully

---

## 🎉 You're All Set!

Your weekly meal planning is now automated. Just:

1. **Build your recipe database** (one-time, ongoing as you find new recipes)
2. **Generate meal plan each week** (15 minutes)
3. **Generate grocery list** (instant)
4. **Shop and cook!**

**Time saved:** ~2 hours per week → 15 minutes = **1 hour 45 minutes saved weekly**

Happy meal planning! 🍽️
