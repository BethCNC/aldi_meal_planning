import {Client} from '@notionhq/client';
import dotenv from 'dotenv';

dotenv.config();

const notion = new Client({auth: process.env.NOTION_API_KEY});

const DB_IDS = {
  ingredients: process.env.NOTION_INGREDIENTS_DB_ID,
  recipes: process.env.NOTION_RECIPES_DB_ID
};

export async function createIngredient(data) {
  const properties = {
    'Line Item': {title: [{text: {content: data.item}}]},
    'Unit': {rich_text: [{text: {content: data.unit || ''}}]},
    'Average Unit Price ($)': {number: data.price || null}
  };
  
  if (data.lastPriced) {
    properties['Last Priced At'] = {date: {start: data.lastPriced}};
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
      property: 'Line Item',
      title: {equals: name}
    }
  });
  
  return response.results[0] || null;
}

export async function updateIngredientPrice(pageId, price, date) {
  return await notion.pages.update({
    page_id: pageId,
    properties: {
      'Average Unit Price ($)': {number: price},
      'Last Priced At': {date: {start: date}}
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

export default notion;
