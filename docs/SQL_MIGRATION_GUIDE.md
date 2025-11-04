# SQL Backend Migration Guide

## Why Move from Notion to SQL?

### Notion Limitations You're Hitting:

1. **No Complex Calculations**: Notion formulas can't handle unit conversions, fuzzy matching, or package fraction calculations
2. **Slow Performance**: Calculating costs for 36 recipes requires multiple API calls
3. **Limited Querying**: Can't easily find "all recipes under $10" or "recipes using ground beef"
4. **No Joins**: Can't efficiently relate recipes to ingredients to calculate costs
5. **Rate Limits**: Notion API has strict rate limits (3 requests/second)

### SQL Advantages:

✅ **Complex Calculations**: Built-in math, CASE statements, window functions
✅ **Fast Queries**: Optimized for data retrieval and calculations
✅ **Powerful Filtering**: WHERE clauses, GROUP BY, aggregations
✅ **Proper Relationships**: Foreign keys, JOINs, normalization
✅ **No Rate Limits**: Local database = instant queries
✅ **Better for Automation**: Scripts can calculate costs without API overhead

---

## Architecture Overview

```
┌─────────────┐
│   Notion    │  ← Source of truth (continue using for data entry)
│  Databases  │
└──────┬──────┘
       │
       │ Export/Import (one-way sync)
       ▼
┌─────────────┐
│  SQLite DB  │  ← Calculation engine (costs, queries, analysis)
│ (local.db)  │
└──────┬──────┘
       │
       │ Query via SQL or scripts
       ▼
┌─────────────┐
│  Results    │  ← Updated costs back to Notion (optional)
│   Scripts   │
└─────────────┘
```

**Workflow:**
1. Enter recipes/ingredients in Notion (your current workflow)
2. Export to SQLite periodically (daily/weekly)
3. Calculate costs in SQL (fast, accurate)
4. Optionally sync costs back to Notion

---

## Database Schema Design

### Tables:

1. **ingredients** - All ingredient data
2. **recipes** - Recipe metadata
3. **recipe_ingredients** - Junction table linking recipes to ingredients with quantities
4. **units** - Unit conversion reference
5. **unit_conversions** - Conversion factors

### Relationships:

```
recipes (1) ──< (many) recipe_ingredients (many) >── (1) ingredients
                                                          │
                                                          │ uses
                                                          ▼
                                                    units/unit_conversions
```

---

## SQLite vs PostgreSQL

### SQLite (Recommended for Start)
- ✅ File-based (no server setup)
- ✅ Perfect for single-user/small data
- ✅ Zero configuration
- ✅ Great for learning

### PostgreSQL (Future)
- ✅ Better for production/multi-user
- ✅ More advanced features
- ✅ Better performance at scale
- ❌ Requires server setup

**Recommendation**: Start with SQLite, migrate to PostgreSQL later if needed.

---

## Migration Steps

### Phase 1: Setup SQLite Database
1. Create database schema
2. Migrate data from Notion
3. Verify data integrity

### Phase 2: Cost Calculation Queries
1. Write SQL queries for recipe cost calculation
2. Test with sample recipes
3. Compare to manual calculations

### Phase 3: Automation Scripts
1. Automated export from Notion
2. Automated cost calculation
3. Optional: Sync results back to Notion

---

## SQL Concepts You'll Learn

### 1. JOINs - Linking Related Data
```sql
SELECT r.name, i.item, ri.quantity, ri.unit
FROM recipes r
JOIN recipe_ingredients ri ON r.id = ri.recipe_id
JOIN ingredients i ON ri.ingredient_id = i.id
WHERE r.name = 'Easy Sesame Chicken';
```

### 2. Aggregations - Summing Costs
```sql
SELECT 
    r.name,
    SUM(ri.cost) AS total_cost
FROM recipes r
JOIN recipe_ingredients ri ON r.id = ri.recipe_id
GROUP BY r.id, r.name;
```

### 3. Subqueries - Complex Calculations
```sql
SELECT 
    r.name,
    (SELECT SUM(cost) FROM recipe_ingredients WHERE recipe_id = r.id) AS total_cost
FROM recipes r;
```

### 4. CASE Statements - Conditional Logic
```sql
SELECT 
    i.item,
    CASE 
        WHEN i.base_unit = 'lb' THEN i.price_per_base_unit * 16
        ELSE i.price_per_base_unit
    END AS price_per_oz
FROM ingredients i;
```

---

## Next Steps

1. **Read the schema design** (`docs/DATABASE_SCHEMA.md`)
2. **Run the migration script** (`scripts/migrate-to-sqlite.js`)
3. **Try the example queries** (`docs/SQL_QUERIES.md`)
4. **Run cost calculations** (`scripts/calculate-costs-sql.js`)

---

## Resources

- [SQLite Tutorial](https://www.sqlitetutorial.net/)
- [SQL JOINs Explained](https://www.w3schools.com/sql/sql_join.asp)
- [SQL Aggregation Functions](https://www.w3schools.com/sql/sql_count_avg_sum.asp)
