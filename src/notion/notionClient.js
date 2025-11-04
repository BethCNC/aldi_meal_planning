import {Client} from '@notionhq/client';
import dotenv from 'dotenv';

dotenv.config();

const notion = new Client({auth: process.env.NOTION_API_KEY});

// Support both naming conventions from .env
const DB_IDS = {
  ingredients: process.env.NOTION_ALDI_INGREDIENTS_DB_ID || process.env.NOTION_INGREDIENTS_DB_ID,
  recipes: process.env.NOTION_ALDI_RECIPES_DB_ID || process.env.NOTION_RECIPES_DB_ID,
  mealPlanner: process.env.NOTION_ALDI_WEEKLY_MEAL_PLANNING_DB_ID || process.env.NOTION_MEAL_PLANNER_DB_ID
};

export async function createIngredient(data) {
  const properties = {
    'Item': {title: [{text: {content: data.item}}]},
    'Price per Package ($)': {number: data.pricePerPackage || data.price || null}
  };
  
  // Package size information
  if (data.packageSize) {
    properties['Package Size'] = {number: data.packageSize};
  }
  
  if (data.packageUnit) {
    properties['Package Unit'] = {select: {name: data.packageUnit}};
  }
  
  if (data.baseUnit) {
    properties['Base Unit'] = {select: {name: data.baseUnit}};
  }
  
  if (data.notes) {
    properties['Notes'] = {rich_text: [{text: {content: data.notes}}]};
  }
  
  return await notion.pages.create({
    parent: {database_id: DB_IDS.ingredients},
    properties
  });
}

export async function findIngredient(name) {
  const response = await notion.databases.query({
    database_id: DB_IDS.ingredients,
    filter: {
      property: 'Item',
      title: {equals: name}
    }
  });
  
  return response.results[0] || null;
}

export async function updateIngredientPrice(pageId, price, date) {
  // Your database uses 'Price per Package ($)' not 'Cost'
  return await notion.pages.update({
    page_id: pageId,
    properties: {
      'Price per Package ($)': {number: price}
    }
  });
}

export async function syncIngredients(ingredients) {
  const results = {created: 0, updated: 0, errors: 0};
  
  for (const ingredient of ingredients) {
    try {
      const existing = await findIngredient(ingredient.item);
      
      if (existing) {
        await updateIngredientPrice(existing.id, ingredient.price, ingredient.scrapedAt);
        results.updated++;
      } else {
        await createIngredient({
          ...ingredient,
          lastPriced: ingredient.scrapedAt,
          notes: `Source: ${ingredient.source}`
        });
        results.created++;
      }
    } catch (error) {
      console.error(`Failed to sync ${ingredient.item}:`, error.message);
      results.errors++;
    }
  }
  
  return results;
}

/**
 * Recipe Functions
 */

export async function createRecipe(data) {
  const properties = {
    'Recipe Name': {title: [{text: {content: data.name}}]},
    'Servings': {number: data.servings || null},
    'Category': data.category ? {select: {name: data.category}} : undefined,
    'Recipe Cost': {number: data.totalCost || null}, // Your database uses 'Recipe Cost'
    'Cost ($)': {number: data.totalCost || null}, // Also set legacy field if exists
    'Cost per Serving ($)': {number: data.costPerServing || null}
  };
  
  if (data.ingredientsList) {
    properties['Recipe Ingredients'] = {
      rich_text: [{text: {content: data.ingredientsList}}]
    };
  }
  
  if (data.instructions) {
    properties['Instructions'] = {
      rich_text: [{text: {content: data.instructions}}]
    };
  }
  
  if (data.sourceUrl) {
    properties['Source/Link'] = {url: data.sourceUrl};
  }
  
  if (data.tags && data.tags.length > 0) {
    properties['Tags'] = {
      multi_select: data.tags.map(tag => ({name: tag}))
    };
  }
  
  if (data.ingredientRelations && data.ingredientRelations.length > 0) {
    // Your database uses 'Aldi Ingredients' relation (not 'Database Ingredients ')
    properties['Aldi Ingredients'] = {
      relation: data.ingredientRelations.map(id => ({id}))
    };
  }
  
  // Remove undefined properties
  Object.keys(properties).forEach(key => {
    if (properties[key] === undefined) delete properties[key];
  });
  
  return await notion.pages.create({
    parent: {database_id: DB_IDS.recipes},
    properties
  });
}

export async function findRecipe(name) {
  const response = await notion.databases.query({
    database_id: DB_IDS.recipes,
    filter: {
      property: 'Recipe Name',
      title: {contains: name}
    }
  });
  
  return response.results[0] || null;
}

export async function queryRecipes(filters = {}) {
  let queryFilter = {};
  
  // Build filter from options
  const conditions = [];
  
  if (filters.category) {
    conditions.push({
      property: 'Category',
      select: {equals: filters.category}
    });
  }
  
  if (filters.maxCostPerServing) {
    conditions.push({
      property: 'Cost per Serving ($)',
      number: {less_than_or_equal_to: filters.maxCostPerServing}
    });
  }
  
  if (filters.maxTotalCost) {
    conditions.push({
      property: 'Cost ($)',
      number: {less_than_or_equal_to: filters.maxTotalCost}
    });
  }
  
  if (conditions.length > 0) {
    if (conditions.length === 1) {
      queryFilter = conditions[0];
    } else {
      queryFilter = {and: conditions};
    }
  }
  
  const response = await notion.databases.query({
    database_id: DB_IDS.recipes,
    filter: Object.keys(queryFilter).length > 0 ? queryFilter : undefined
  });
  
  return response.results;
}

export async function updateRecipeCost(pageId, totalCost, costPerServing) {
  return await notion.pages.update({
    page_id: pageId,
    properties: {
      'Recipe Cost': {number: totalCost}, // Your database uses 'Recipe Cost'
      'Cost ($)': {number: totalCost}, // Also update legacy field if it exists
      'Cost per Serving ($)': {number: costPerServing}
    }
  });
}

export async function linkRecipeToIngredients(recipeId, ingredientIds) {
  // Your database uses 'Aldi Ingredients' relation
  return await notion.pages.update({
    page_id: recipeId,
    properties: {
      'Aldi Ingredients': {
        relation: ingredientIds.map(id => ({id}))
      }
    }
  });
}

/**
 * Meal Planner Functions
 */

export async function createMealPlanEntry(data) {
  if (!DB_IDS.mealPlanner) {
    throw new Error('Meal Planner database ID not configured. Add NOTION_ALDI_WEEKLY_MEAL_PLANNING_DB_ID to .env');
  }
  
  // Map day names to your database format (Mon, Tues, Wed, etc.)
  const dayMap = {
    'Monday': 'Mon',
    'Tuesday': 'Tues',
    'Wednesday': 'Wed',
    'Thursday': 'Thurs',
    'Friday': 'Fri',
    'Saturday': 'Sat',
    'Sunday': 'Sun'
  };
  
  const properties = {
    'Date': {date: {start: data.date}}
  };
  
  // Your database uses 'Dinner' (relation), not 'Meal'
  if (data.mealRecipeId) {
    properties['Dinner'] = {
      relation: [{id: data.mealRecipeId}]
    };
  }
  
  // Your database uses 'Day' (select), not 'Day of Week'
  if (data.dayOfWeek) {
    const dayName = dayMap[data.dayOfWeek] || data.dayOfWeek.substring(0, 3);
    properties['Day'] = {
      select: {name: dayName}
    };
  }
  
  // Your database has 'Name' property (title)
  if (data.name) {
    properties['Name'] = {
      title: [{text: {content: data.name}}]
    };
  } else if (data.mealRecipeId) {
    // Auto-generate name from recipe if not provided
    try {
      const recipe = await notion.pages.retrieve({page_id: data.mealRecipeId});
      const recipeName = recipe.properties['Recipe Name']?.title?.[0]?.plain_text || 'Dinner';
      properties['Name'] = {
        title: [{text: {content: recipeName}}]
      };
    } catch (err) {
      // Fallback if recipe can't be retrieved
      properties['Name'] = {
        title: [{text: {content: 'Dinner'}}]
      };
    }
  }
  
  // Optional: Breakfast, Lunch, Snacks (rich_text)
  if (data.breakfast) {
    properties['Breakfast'] = {
      rich_text: [{text: {content: data.breakfast}}]
    };
  }
  
  if (data.lunch) {
    properties['Lunch'] = {
      rich_text: [{text: {content: data.lunch}}]
    };
  }
  
  if (data.snacks) {
    properties['Snacks'] = {
      rich_text: [{text: {content: data.snacks}}]
    };
  }
  
  return await notion.pages.create({
    parent: {database_id: DB_IDS.mealPlanner},
    properties
  });
}

export async function queryMealPlanEntries(startDate, endDate) {
  if (!DB_IDS.mealPlanner) {
    throw new Error('Meal Planner database ID not configured');
  }
  
  const response = await notion.databases.query({
    database_id: DB_IDS.mealPlanner,
    filter: {
      and: [
        {
          property: 'Date',
          date: {on_or_after: startDate}
        },
        {
          property: 'Date',
          date: {on_or_before: endDate}
        }
      ]
    }
  });
  
  return response.results;
}

/**
 * Helper: Search ingredients with fuzzy matching
 */
export async function searchIngredient(searchTerm) {
  // First try exact match
  const exact = await findIngredient(searchTerm);
  if (exact) return exact;
  
  // Then try contains search
  const response = await notion.databases.query({
    database_id: DB_IDS.ingredients,
    filter: {
      property: 'Item',
      title: {contains: searchTerm}
    }
  });
  
  return response.results[0] || null;
}

export default notion;
