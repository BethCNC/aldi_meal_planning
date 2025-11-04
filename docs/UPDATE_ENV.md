# Update Your .env File

## Required Update

Add this line to your `.env` file to fix the Meal Planner database ID:

```bash
NOTION_ALDI_WEEKLY_MEAL_PLANNING_DB_ID=29f86edc-ae2c-808e-a798-e57a82ca904f
```

Or if you already have it with the wrong ID, update it:

```bash
# Old (incorrect - was a page, not database):
NOTION_ALDI_WEEKLY_MEAL_PLANNING_DB_ID=18b86edc-ae2c-80e6-98a0-e6e9a83efbdd

# New (correct - actual database ID):
NOTION_ALDI_WEEKLY_MEAL_PLANNING_DB_ID=29f86edc-ae2c-808e-a798-e57a82ca904f
```

## Verify It Works

After updating, verify with:

```bash
npm run verify:notion
```

You should see the Meal Planner database schema without errors.

---

**Location:** The Meal Planner database is inside the "Aldi Meal Planning" page in your Notion workspace.
