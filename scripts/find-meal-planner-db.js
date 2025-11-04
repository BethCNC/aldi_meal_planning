/**
 * Find Meal Planner Database
 * 
 * Inspects Notion pages to find databases inside them
 */

import {Client} from '@notionhq/client';
import dotenv from 'dotenv';

dotenv.config();

const notion = new Client({auth: process.env.NOTION_API_KEY});

// Page IDs from the URLs you provided
const PAGES_TO_CHECK = [
  '29f86edcae2c800e970cd4a2c2b45e90', // Pantry
  '29f86edcae2c801eb440f7f773eaf2e6', // Aldi Meal Planning
  '18b86edcae2c80e698a0e6e9a83efbdd', // Current Meal Planner ID from .env
  'a644ab1b20f04bdbaa1dbf1e1f6ab450'  // Unknown
];

/**
 * Check if a page contains child databases
 */
async function checkPageForDatabases(pageId, pageName) {
  try {
    const page = await notion.pages.retrieve({page_id: pageId});
    
    console.log(`\n📄 Checking: ${pageName || 'Unknown'}`);
    console.log(`   Page ID: ${pageId}`);
    console.log(`   Title: ${page.properties?.title?.title?.[0]?.plain_text || 'N/A'}`);
    
    // Get child blocks (databases might be children)
    try {
      const children = await notion.blocks.children.list({
        block_id: pageId,
        page_size: 100
      });
      
      console.log(`   Child blocks found: ${children.results.length}`);
      
      for (const block of children.results) {
        if (block.type === 'child_database') {
          console.log(`\n   ✅ FOUND DATABASE!`);
          console.log(`      Name: ${block.child_database?.title || 'Untitled'}`);
          console.log(`      Database ID: ${block.id}`);
          console.log(`      URL: https://notion.so/${block.id.replace(/-/g, '')}`);
          
          // Try to get the database schema
          try {
            const db = await notion.databases.retrieve({database_id: block.id});
            console.log(`      Properties:`);
            Object.keys(db.properties).forEach(prop => {
              console.log(`        - ${prop}: ${db.properties[prop].type}`);
            });
            return block.id;
          } catch (err) {
            console.log(`      ⚠️  Could not retrieve database schema: ${err.message}`);
          }
        }
      }
      
      if (children.results.length === 0) {
        console.log(`   ℹ️  No child blocks found`);
      }
      
    } catch (err) {
      console.log(`   ⚠️  Could not list children: ${err.message}`);
    }
    
  } catch (error) {
    if (error.code === 'object_not_found') {
      console.log(`   ❌ Page not found or not accessible`);
    } else {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  return null;
}

/**
 * Try to find database by searching child blocks recursively
 */
async function searchChildrenRecursive(blockId, depth = 0, maxDepth = 3) {
  if (depth > maxDepth) return [];
  
  try {
    const children = await notion.blocks.children.list({
      block_id: blockId,
      page_size: 100
    });
    
    const databases = [];
    
    for (const block of children.results) {
      if (block.type === 'child_database') {
        databases.push({
          id: block.id,
          title: block.child_database?.title || 'Untitled',
          depth
        });
      } else if (block.type === 'child_page' || block.has_children) {
        // Recursively search child pages
        const nested = await searchChildrenRecursive(block.id, depth + 1, maxDepth);
        databases.push(...nested);
      }
    }
    
    return databases;
  } catch (err) {
    return [];
  }
}

async function main() {
  console.log('🔍 Finding Meal Planner Database\n');
  console.log('='.repeat(60));
  
  const foundDatabases = [];
  
  // Check each page
  for (const pageId of PAGES_TO_CHECK) {
    const dbId = await checkPageForDatabases(pageId);
    if (dbId) {
      foundDatabases.push({pageId, databaseId: dbId});
    }
  }
  
  // Also check the "Aldi Meal Planning" page more thoroughly
  console.log('\n' + '='.repeat(60));
  console.log('\n🔍 Deep search in "Aldi Meal Planning" page...\n');
  
  const mealPlanningPageId = '29f86edcae2c801eb440f7f773eaf2e6';
  const allDatabases = await searchChildrenRecursive(mealPlanningPageId);
  
  if (allDatabases.length > 0) {
    console.log(`\n✅ Found ${allDatabases.length} database(s) in nested pages:\n`);
    for (const db of allDatabases) {
      console.log(`   📊 ${db.title}`);
      console.log(`      ID: ${db.id}`);
      console.log(`      Depth: ${db.depth}`);
      
      // Try to verify it's a meal planner by checking properties
      try {
        const dbSchema = await notion.databases.retrieve({database_id: db.id});
        const hasDate = 'Date' in dbSchema.properties;
        const hasMeal = 'Meal' in dbSchema.properties;
        
        if (hasDate && hasMeal) {
          console.log(`      ✅ LOOKS LIKE MEAL PLANNER! (has Date and Meal properties)`);
          foundDatabases.push({
            pageId: mealPlanningPageId,
            databaseId: db.id,
            title: db.title,
            isMealPlanner: true
          });
        } else {
          console.log(`      ℹ️  Properties: ${Object.keys(dbSchema.properties).join(', ')}`);
        }
      } catch (err) {
        console.log(`      ⚠️  Could not verify: ${err.message}`);
      }
      console.log('');
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Summary:\n');
  
  if (foundDatabases.length === 0) {
    console.log('❌ No databases found in the pages checked.');
    console.log('\n💡 Suggestions:');
    console.log('   1. The meal planner might be a standalone database (not in a page)');
    console.log('   2. Check your Notion workspace for a database with:');
    console.log('      - Date property');
    console.log('      - Meal relation (to Recipes)');
    console.log('   3. Get the database ID from the URL when viewing it');
    console.log('   4. Add it to .env as NOTION_ALDI_WEEKLY_MEAL_PLANNING_DB_ID');
  } else {
    console.log(`✅ Found ${foundDatabases.length} database(s):\n`);
    for (const db of foundDatabases) {
      console.log(`   ${db.title || 'Untitled'}`);
      console.log(`   ID: ${db.databaseId}`);
      if (db.isMealPlanner) {
        console.log(`   ✅ Recommended: Use this as Meal Planner`);
      }
      console.log('');
    }
    
    console.log('\n💡 To use: Add this to your .env file:');
    console.log(`   NOTION_ALDI_WEEKLY_MEAL_PLANNING_DB_ID=${foundDatabases.find(d => d.isMealPlanner)?.databaseId || foundDatabases[0].databaseId}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
}
