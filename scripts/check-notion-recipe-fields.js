import { Client } from '@notionhq/client';
import dotenv from 'dotenv';

dotenv.config();

const notion = new Client({ auth: process.env.NOTION_API_KEY });

const DB_IDS = {
  recipes: process.env.NOTION_ALDI_RECIPES_DB_ID || process.env.NOTION_RECIPES_DB_ID
};

async function checkRecipeFields(recipeName) {
  console.log(`\n🔍 Checking fields for: "${recipeName}"\n`);

  // Search for the recipe
  const response = await notion.databases.query({
    database_id: DB_IDS.recipes,
    filter: {
      property: 'Recipe Name',
      title: {
        contains: recipeName
      }
    }
  });

  if (response.results.length === 0) {
    console.log('❌ Recipe not found');
    return;
  }

  const page = response.results[0];
  console.log(`✅ Found: ${page.properties['Recipe Name']?.title?.[0]?.plain_text || 'Unknown'}`);
  console.log(`   URL: ${page.url}\n`);

  console.log('📋 All Properties:\n');

  Object.keys(page.properties).forEach(propName => {
    const prop = page.properties[propName];
    const type = prop.type;
    
    let value = 'N/A';
    
    switch (type) {
      case 'title':
        value = prop.title?.[0]?.plain_text || '(empty)';
        break;
      case 'rich_text':
        value = prop.rich_text?.map(rt => rt.plain_text).join('') || '(empty)';
        if (value.length > 100) value = value.substring(0, 100) + '...';
        break;
      case 'number':
        value = prop.number?.toString() || '(empty)';
        break;
      case 'select':
        value = prop.select?.name || '(empty)';
        break;
      case 'url':
        value = prop.url || '(empty)';
        break;
      default:
        value = `[${type}]`;
    }

    console.log(`   ${propName}:`);
    console.log(`      Type: ${type}`);
    console.log(`      Value: ${value}`);
    console.log('');
  });
}

// Check Taco Pasta Casserole
checkRecipeFields('Taco Pasta Casserole');
