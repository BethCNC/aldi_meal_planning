import { Client } from '@notionhq/client';
import dotenv from 'dotenv';

dotenv.config();

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DB_IDS = {
  recipes: process.env.NOTION_ALDI_RECIPES_DB_ID || process.env.NOTION_RECIPES_DB_ID
};

function getPropertyValue(page, propertyName) {
  const prop = page.properties[propertyName];
  if (!prop) return null;
  
  switch (prop.type) {
    case 'title':
      return prop.title?.[0]?.plain_text || '';
    case 'rich_text':
      return prop.rich_text?.map(rt => rt.plain_text).join('') || '';
    default:
      return null;
  }
}

async function checkRecipe() {
  console.log('\n🔍 Checking Spaghetti & Meatless Meatballs\n');
  console.log('════════════════════════════════════════════════════════════\n');

  const response = await notion.databases.query({
    database_id: DB_IDS.recipes,
    filter: {
      property: 'Recipe Name',
      title: {
        contains: 'Spaghetti & Meatless Meatballs'
      }
    }
  });

  if (response.results.length === 0) {
    console.log('❌ Recipe not found in Notion');
    return;
  }

  const page = response.results[0];
  const recipeName = getPropertyValue(page, 'Recipe Name');
  const ingredientText = getPropertyValue(page, 'Recipe Ingredients');

  console.log(`Recipe Name: ${recipeName}`);
  console.log(`Notion URL: ${page.url}\n`);
  
  if (!ingredientText || ingredientText.trim() === '') {
    console.log('❌ No ingredient text found');
  } else {
    console.log('📋 Ingredient Text:\n');
    console.log(ingredientText);
    console.log('\n');
    
    // Show line by line
    const lines = ingredientText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    console.log(`Total lines: ${lines.length}\n`);
    lines.forEach((line, i) => {
      console.log(`${i + 1}. ${line}`);
    });
  }
}

checkRecipe();
