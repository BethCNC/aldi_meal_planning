# Notion Database Summary
**Date:** January 2025  
**Status:** Complete overview of all databases, properties, and connections

---

## 📊 Database Overview

You have **3 Notion databases** configured and working:

1. **Aldi Ingredients** - Master ingredient/price database
2. **Aldi Recipes** - Recipe collection with cost calculations
3. **Aldi Meal Planner** - Weekly meal planning calendar

---

## 1️⃣ Aldi Ingredients Database

**Database ID:** `3d79c2030ca045faa454ff4a72dc1143`  
**Title:** Aldi Ingredients  
**Purpose:** Master database of all Aldi ingredients with pricing and package information

### Properties

| Property Name | Type | Description |
|--------------|------|-------------|
| `Item` | **title** | Ingredient name (primary identifier) |
| `Price per Package ($)` | **number** | Total cost of the package |
| `Package Size` | **number** | Size of the package (numeric value) |
| `Package Unit` | **select** | Unit of measurement for package size |
| `Unit Size` | **number** | Size per individual unit |
| `Base Unit` | **select** | Base unit for calculations (g, ml, each) |
| `Grocery Category` | **select** | Category classification |
| `Units per Package (auto)` | **formula** | Auto-calculated units per package |
| `Units per Package (override)` | **number** | Manual override for units per package |
| `Cost per Unit ($)` | **formula** | Calculated cost per unit |
| `Cost per Base Unit ($)` | **formula** | Calculated cost per base unit |
| `Aldi Recipes` | **relation** | Links to recipes that use this ingredient |

### Package Unit Options
- g, kg, ml, l, oz, lb, each

### Base Unit Options
- g, ml, each

### Grocery Category Options
- Meat
- Carb/Starch
- Dairy
- Produce (Fruit/Vegetable)
- Pantry Staple
- Snack
- Frozen
- Beverages
- Condiments
- Canned/Dry Goods
- Bakery
- Household Items
- Other

### Relationships

**Aldi Recipes (relation):**
- **Type:** Two-way relation
- **Connected to:** Aldi Recipes database (`659afecb3faf43cd883af3e756f7efc9`)
- **Purpose:** Shows which recipes use this ingredient
- **Direction:** Ingredients → Recipes (many-to-many)

### Current State

**Data Status:**
- ~100+ ingredients in database
- **Issue:** Most ingredients missing pricing data
  - `Price per Package ($)` is empty for most entries
  - Formulas cannot calculate without base price data
  - Need to populate pricing information

**Formula Fields:**
- `Cost per Unit ($)` - Calculates: `Price per Package ($) / Units per Package`
- `Cost per Base Unit ($)` - Converts to base unit for standardization
- `Units per Package (auto)` - Calculates based on Package Size and Unit Size

### How It Works

1. **Price Entry:** Enter `Price per Package ($)` (e.g., $4.50 for a 1 lb package of ground beef)
2. **Package Info:** Enter `Package Size` (1) and `Package Unit` (lb)
3. **Unit Info:** Enter `Unit Size` (16) and `Base Unit` (oz) if applicable
4. **Auto-Calculations:** Formulas automatically calculate:
   - Units per package
   - Cost per unit
   - Cost per base unit

---

## 2️⃣ Aldi Recipes Database

**Database ID:** `659afecb3faf43cd883af3e756f7efc9`  
**Title:** Aldi Recipes  
**Purpose:** Recipe collection with cost calculations and ingredient links

### Properties

| Property Name | Type | Description |
|--------------|------|-------------|
| `Recipe Name` | **title** | Recipe name (primary identifier) |
| `Category` | **select** | Recipe category |
| `Servings` | **number** | Number of servings the recipe makes |
| `Recipe Ingredients` | **rich_text** | Full ingredient list as text |
| `Instructions` | **rich_text** | Cooking instructions |
| `Source/Link` | **url** | Link to original recipe source |
| `Rating` | **select** | Recipe rating (1-5 stars) |
| `Notes` | **rich_text** | Additional notes about the recipe |
| `Aldi Ingredients` | **relation** | Links to ingredients in the Ingredients database |
| `Recipe Cost` | **number** | Manual cost entry (optional) |
| `Calculated Cost` | **formula** | Auto-calculated cost from linked ingredients |
| `Cost per Serving ($)` | **formula** | Calculated: `Calculated Cost / Servings` |

### Category Options
- Beef
- Chicken
- Pork
- Vegetarian
- Seafood
- Other

### Rating Options
- ★
- ★★
- ★★★
- ★★★★
- ★★★★★

### Relationships

**Aldi Ingredients (relation):**
- **Type:** Two-way relation
- **Connected to:** Aldi Ingredients database (`3d79c2030ca045faa454ff4a72dc1143`)
- **Purpose:** Links recipe to specific ingredients for cost calculation
- **Direction:** Recipes → Ingredients (many-to-many)
- **Note:** This is the key connection for automatic cost calculation

### Current State

**Data Status:**
- Multiple recipes in database (exact count needs verification)
- **Issue:** Most recipes missing ingredient links
  - `Aldi Ingredients` relation is empty for most recipes
  - Without ingredient links, `Calculated Cost` formula cannot work
  - `Recipe Cost` (manual entry) is also empty for most recipes

**Formula Fields:**
- `Calculated Cost` - Should sum costs from linked `Aldi Ingredients`
- `Cost per Serving ($)` - Calculates: `Calculated Cost / Servings`

### How It Works

**Cost Calculation Flow:**

1. **Link Ingredients:** Connect recipe to ingredients via `Aldi Ingredients` relation
2. **Formula Calculation:** `Calculated Cost` formula sums costs from linked ingredients
   - **Note:** Formula needs to access ingredient `Price per Package ($)` values
   - Currently may not be working if ingredients lack pricing data
3. **Per-Serving Cost:** `Cost per Serving ($)` divides `Calculated Cost` by `Servings`

**Manual Override:**
- Can manually enter `Recipe Cost` if formula calculation isn't desired
- Formula will use manual `Recipe Cost` if available, otherwise calculates from ingredients

---

## 3️⃣ Aldi Meal Planner Database

**Database ID:** `29f86edc-ae2c-808e-a798-e57a82ca904f`  
**Title:** Aldi Meal Planner  
**Purpose:** Weekly meal planning calendar

### Properties

| Property Name | Type | Description |
|--------------|------|-------------|
| `Name` | **title** | Meal entry name |
| `Date` | **date** | Date for this meal |
| `Day` | **select** | Day of week |
| `Dinner` | **relation** | Links to recipe in Aldi Recipes database |
| `Dinner Lable` | **rich_text** | Text label for dinner (note: typo "Lable" instead of "Label") |
| `Breakfast` | **rich_text** | Breakfast meal text |
| `Breakfast Label` | **rich_text** | Label for breakfast |
| `Lunch` | **rich_text** | Lunch meal text |
| `Lunch Label` | **rich_text** | Label for lunch |
| `Snacks` | **rich_text** | Snacks text |
| `Snacks Label` | **rich_text** | Label for snacks |

### Day Options
- Mon
- Tues
- Wed
- Thurs
- Fri
- Sat
- Sun

### Relationships

**Dinner (relation):**
- **Type:** Two-way relation
- **Connected to:** Aldi Recipes database (`659afecb3faf43cd883af3e756f7efc9`)
- **Purpose:** Links meal plan entry to a specific recipe
- **Direction:** Meal Planner → Recipes (many-to-one)

### Current State

**Structure Notes:**
- Has both relation (`Dinner`) and text fields (`Dinner Lable`, `Breakfast`, `Lunch`, `Snacks`)
- Appears designed for flexible meal planning:
  - Use `Dinner` relation for structured recipe links
  - Use text fields for free-form meal descriptions
- Label fields suggest UI organization needs

---

## 🔗 Database Connections

### Connection Flow

```
Aldi Ingredients
    ↓ (Aldi Recipes relation)
Aldi Recipes
    ↓ (Dinner relation)
Aldi Meal Planner
```

### Relationship Details

1. **Ingredients ↔ Recipes (Many-to-Many)**
   - One ingredient can be used in multiple recipes
   - One recipe can use multiple ingredients
   - **Connection:** `Aldi Ingredients` relation in Recipes DB
   - **Reverse:** `Aldi Recipes` relation in Ingredients DB
   - **Purpose:** Cost calculation and ingredient tracking

2. **Recipes ↔ Meal Planner (Many-to-One)**
   - One recipe can be used in multiple meal plan entries
   - One meal plan entry links to one recipe (via `Dinner` relation)
   - **Connection:** `Dinner` relation in Meal Planner DB
   - **Reverse:** Not visible (one-way relation in Meal Planner)
   - **Purpose:** Weekly meal planning and scheduling

---

## ⚠️ Current Issues & Gaps

### 1. Missing Pricing Data

**Problem:**
- Most ingredients in `Aldi Ingredients` database lack `Price per Package ($)` values
- Without pricing data, formulas cannot calculate costs
- Recipe cost calculations cannot work

**Impact:**
- `Cost per Unit ($)` formula returns empty/zero
- `Cost per Base Unit ($)` formula returns empty/zero
- Recipe `Calculated Cost` formula cannot work
- `Cost per Serving ($)` cannot calculate

**Solution Needed:**
- Populate `Price per Package ($)` for all ingredients
- Or import pricing data from external source
- Consider bulk update script

---

### 2. Missing Ingredient Links

**Problem:**
- Most recipes lack links in `Aldi Ingredients` relation
- Without ingredient links, cost calculation formulas cannot work
- Manual cost entry is also missing

**Impact:**
- Recipe `Calculated Cost` formula returns zero/empty
- Cannot automatically recalculate costs when ingredient prices change
- Cannot generate accurate grocery lists from meal plans

**Solution Needed:**
- Link recipes to their ingredients via `Aldi Ingredients` relation
- Consider automated ingredient matching script
- Or manual linking through interactive tool

---

### 3. Formula Field Limitations

**Problem:**
- Notion formulas may have limitations accessing related database values
- `Calculated Cost` formula in Recipes DB needs to:
  1. Access linked `Aldi Ingredients`
  2. Sum their `Price per Package ($)` values
  3. Handle missing values gracefully

**Potential Issues:**
- Notion formulas may not be able to sum across relations
- May need to use rollup properties instead of formulas
- Or calculate costs via scripts rather than formulas

**Solution Needed:**
- Verify if `Calculated Cost` formula actually works with relations
- If not, consider:
  - Using rollup properties
  - Calculating costs via scripts (scripts/calc-recipe-costs.js)
  - Hybrid approach (formulas for simple cases, scripts for complex)

---

### 4. Property Name Inconsistencies

**Problem:**
- Code references properties that don't match actual database names
- Example: Code looks for `Cost` but database uses `Price per Package ($)`
- Example: Code looks for `Database Ingredients ` but database uses `Aldi Ingredients`

**Impact:**
- Scripts may fail to read/write data correctly
- Cost calculations may not work

**Solution Needed:**
- Update all scripts to use correct property names:
  - `Price per Package ($)` (not `Cost`)
  - `Aldi Ingredients` (not `Database Ingredients `)
  - `Recipe Cost` (not `Cost ($)`)
- Verify all property references match actual database schema

---

## ✅ What's Working Well

### 1. Database Structure
- All three databases are properly configured
- Relationships are set up correctly
- Formula fields are defined (though may need data to work)

### 2. Property Types
- Appropriate types for each field (title, number, relation, formula, etc.)
- Select options are well-defined
- Rich text fields allow flexible content

### 3. Relationships
- Two-way relations between Ingredients and Recipes
- One-way relation from Meal Planner to Recipes
- All connections are properly configured

### 4. Formula Architecture
- Formulas are set up for automatic calculations
- Cost per unit and cost per base unit calculations defined
- Per-serving cost calculation defined

---

## 🎯 Recommended Next Steps

### Priority 1: Populate Pricing Data

**Action:**
1. Run bulk price import script
2. Or manually update `Price per Package ($)` for ingredients
3. Verify formulas start calculating correctly

**Scripts Available:**
- `scripts/fetch-aldi-prices.js`
- `scripts/import-csv-prices.js`
- `scripts/bulk-update-ingredients.js`

### Priority 2: Link Ingredients to Recipes

**Action:**
1. Use interactive recipe tool to link ingredients
2. Or run ingredient matching script
3. Verify `Calculated Cost` formulas start working

**Scripts Available:**
- `scripts/add-recipe-interactive.js`
- `scripts/calc-recipe-costs.js`

### Priority 3: Verify Cost Calculations

**Action:**
1. Test `Calculated Cost` formula with linked ingredients
2. If formula doesn't work, implement script-based calculation
3. Update `Recipe Cost` via scripts instead of formulas

**Scripts Available:**
- `scripts/calc-recipe-costs.js`
- `scripts/calc-recipe-costs-v2.js`
- `scripts/calc-recipe-costs-v3.js`

### Priority 4: Update Code References

**Action:**
1. Update all scripts to use correct property names
2. Test all database operations
3. Verify cost calculations work end-to-end

**Files to Update:**
- `src/notion/notionClient.js` (already updated based on verification)
- `scripts/add-recipe-interactive.js`
- `scripts/generate-meal-plan.js`
- `scripts/generate-grocery-list.js`
- All cost calculation scripts

---

## 📋 Summary

### Database Count
- **3 databases** total
- All properly configured and accessible

### Data Status
- **Ingredients:** ~100+ entries, but missing pricing data
- **Recipes:** Multiple entries, but missing ingredient links
- **Meal Planner:** Structure ready, but data status unknown

### Relationships
- **Ingredients ↔ Recipes:** Two-way relation (working)
- **Recipes ↔ Meal Planner:** One-way relation (working)

### Key Issues
1. Missing pricing data in Ingredients
2. Missing ingredient links in Recipes
3. Formula calculations may not work without data
4. Some code property names don't match database

### What's Working
- Database structure is solid
- Relationships are properly configured
- Formulas are defined (need data to work)
- API access is working

---

**Last Updated:** January 2025  
**Status:** Databases configured and accessible, but need data population for full functionality
