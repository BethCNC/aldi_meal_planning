/**
 * Analyze Database Structure
 * 
 * Deep dive into actual database structure, properties, and relationships
 * to understand how costs should be calculated
 */

import {queryRecipes, searchIngredient} from '../src/notion/notionClient.js';
import notion from '../src/notion/notionClient.js';
import dotenv from 'dotenv';

dotenv.config();

const DB_IDS = {
  ingredients: process.env.NOTION_ALDI_INGREDIENTS_DB_ID || process.env.NOTION_INGREDIENTS_DB_ID,
  recipes: process.env.NOTION_ALDI_RECIPES_DB_ID || process.env.NOTION_RECIPES_DB_ID
};

/**
 * Analyze ingredient structure
 */
async function analyzeIngredients() {
  console.log('\n📊 INGREDIENTS DATABASE ANALYSIS\n');
  console.log('='.repeat(70));
  
  try {
    // Get database schema
    const db = await notion.databases.retrieve({database_id: DB_IDS.ingredients});
    
    console.log('\n🔍 Database Properties:\n');
    Object.entries(db.properties).forEach(([name, prop]) => {
      console.log(`  ${name}:`);
      console.log(`    Type: ${prop.type}`);
      if (prop.type === 'select' && prop.select?.options) {
        console.log(`    Options: ${prop.select.options.map(o => o.name).join(', ')}`);
      }
      if (prop.type === 'relation') {
        console.log(`    Related DB: ${prop.relation?.database_id || 'N/A'}`);
      }
    });
    
    // Sample ingredients
    console.log('\n📋 Sample Ingredients (first 10):\n');
    const response = await notion.databases.query({
      database_id: DB_IDS.ingredients,
      page_size: 10
    });
    
    for (const ingredient of response.results) {
      const item = ingredient.properties['Item']?.title?.[0]?.plain_text || 'Unknown';
      const cost = ingredient.properties['Cost']?.number;
      const pricePerUnit = ingredient.properties['Price per unit']?.number;
      const unit = ingredient.properties['Unit']?.rich_text?.[0]?.plain_text || '';
      const category = ingredient.properties['Category']?.select?.name || 'N/A';
      const notes = ingredient.properties['Notes']?.rich_text?.[0]?.plain_text || '';
      
      console.log(`  📦 ${item}`);
      console.log(`     Category: ${category}`);
      console.log(`     Cost: $${cost || 'N/A'}`);
      console.log(`     Price per unit: $${pricePerUnit || 'N/A'}`);
      console.log(`     Unit: ${unit || 'N/A'}`);
      if (notes) console.log(`     Notes: ${notes.substring(0, 50)}...`);
      console.log('');
    }
    
    // Analyze cost structure
    console.log('\n💰 Cost Structure Analysis:\n');
    const allIngredients = await notion.databases.query({
      database_id: DB_IDS.ingredients,
      page_size: 100
    });
    
    let hasCost = 0;
    let hasPricePerUnit = 0;
    let hasBoth = 0;
    let hasUnit = 0;
    let missingData = 0;
    
    for (const ing of allIngredients.results) {
      const cost = ing.properties['Cost']?.number;
      const pricePerUnit = ing.properties['Price per unit']?.number;
      const unit = ing.properties['Unit']?.rich_text?.[0]?.plain_text;
      
      if (cost !== null && cost !== undefined) hasCost++;
      if (pricePerUnit !== null && pricePerUnit !== undefined) hasPricePerUnit++;
      if (cost && pricePerUnit) hasBoth++;
      if (unit) hasUnit++;
      if (!cost && !pricePerUnit) missingData++;
    }
    
    console.log(`  Total ingredients: ${allIngredients.results.length}`);
    console.log(`  Have 'Cost': ${hasCost}`);
    console.log(`  Have 'Price per unit': ${hasPricePerUnit}`);
    console.log(`  Have both: ${hasBoth}`);
    console.log(`  Have 'Unit': ${hasUnit}`);
    console.log(`  Missing both: ${missingData}`);
    
  } catch (error) {
    console.error('Error analyzing ingredients:', error.message);
  }
}

/**
 * Analyze recipe structure
 */
async function analyzeRecipes() {
  console.log('\n📊 RECIPES DATABASE ANALYSIS\n');
  console.log('='.repeat(70));
  
  try {
    // Get database schema
    const db = await notion.databases.retrieve({database_id: DB_IDS.recipes});
    
    console.log('\n🔍 Database Properties:\n');
    Object.entries(db.properties).forEach(([name, prop]) => {
      console.log(`  ${name}:`);
      console.log(`    Type: ${prop.type}`);
      if (prop.type === 'select' && prop.select?.options) {
        console.log(`    Options: ${prop.select.options.map(o => o.name).join(', ')}`);
      }
      if (prop.type === 'relation') {
        console.log(`    Related DB: ${prop.relation?.database_id || 'N/A'}`);
      }
    });
    
    // Analyze recipes with ingredients
    console.log('\n📋 Recipe Analysis:\n');
    const recipes = await queryRecipes();
    
    let withIngredients = 0;
    let withCosts = 0;
    let withServings = 0;
    let completeRecipes = 0;
    
    console.log('\n  Sample Recipes:\n');
    
    for (const recipe of recipes.slice(0, 10)) {
      const name = recipe.properties['Recipe Name']?.title?.[0]?.plain_text || 'Unknown';
      const cost = recipe.properties['Cost ($)']?.number;
      const costPerServing = recipe.properties['Cost per Serving ($)']?.number;
      const servings = recipe.properties['Servings']?.number;
      const category = recipe.properties['Category']?.select?.name || 'N/A';
      
      const ingredients = recipe.properties['Database Ingredients ']?.relation || 
                         recipe.properties['Database Ingredients']?.relation || 
                         [];
      
      console.log(`  🍳 ${name}`);
      console.log(`     Category: ${category}`);
      console.log(`     Servings: ${servings || 'N/A'}`);
      console.log(`     Cost: $${cost || 'N/A'}`);
      console.log(`     Cost per Serving: $${costPerServing || 'N/A'}`);
      console.log(`     Linked Ingredients: ${ingredients.length}`);
      
      if (ingredients.length > 0) {
        // Get ingredient details
        const ingDetails = [];
        for (const rel of ingredients.slice(0, 3)) {
          try {
            const ing = await notion.pages.retrieve({page_id: rel.id});
            const ingName = ing.properties['Item']?.title?.[0]?.plain_text || 'Unknown';
            const ingCost = ing.properties['Cost']?.number || 0;
            ingDetails.push(`${ingName} ($${ingCost.toFixed(2)})`);
          } catch (err) {
            // Skip if can't retrieve
          }
        }
        if (ingDetails.length > 0) {
          console.log(`     Sample: ${ingDetails.join(', ')}`);
        }
      }
      
      console.log('');
      
      if (ingredients.length > 0) withIngredients++;
      if (cost !== null && cost !== undefined) withCosts++;
      if (servings) withServings++;
      if (ingredients.length > 0 && cost && servings) completeRecipes++;
    }
    
    console.log(`\n📊 Recipe Statistics:\n`);
    console.log(`  Total recipes: ${recipes.length}`);
    console.log(`  With linked ingredients: ${withIngredients}`);
    console.log(`  With cost data: ${withCosts}`);
    console.log(`  With servings: ${withServings}`);
    console.log(`  Complete (ingredients + cost + servings): ${completeRecipes}`);
    
  } catch (error) {
    console.error('Error analyzing recipes:', error.message);
  }
}

/**
 * Analyze cost calculation logic
 */
async function analyzeCostCalculation() {
  console.log('\n📊 COST CALCULATION ANALYSIS\n');
  console.log('='.repeat(70));
  
  try {
    const recipes = await queryRecipes();
    
    console.log('\n🔍 Current Cost Calculation Issues:\n');
    
    let issues = [];
    
    for (const recipe of recipes) {
      const name = recipe.properties['Recipe Name']?.title?.[0]?.plain_text || 'Unknown';
      const currentCost = recipe.properties['Cost ($)']?.number;
      const ingredients = recipe.properties['Database Ingredients ']?.relation || 
                         recipe.properties['Database Ingredients']?.relation || 
                         [];
      
      if (ingredients.length === 0) continue;
      
      // Calculate what cost should be
      let calculatedCost = 0;
      let ingredientDetails = [];
      
      for (const rel of ingredients) {
        try {
          const ing = await notion.pages.retrieve({page_id: rel.id});
          const ingName = ing.properties['Item']?.title?.[0]?.plain_text || 'Unknown';
          const ingCost = ing.properties['Cost']?.number || 0;
          const pricePerUnit = ing.properties['Price per unit']?.number;
          const unit = ing.properties['Unit']?.rich_text?.[0]?.plain_text || '';
          
          // Issue: We're just adding Cost, but we should consider:
          // - If Cost is per package, but recipe uses partial package
          // - If Price per unit exists, we need quantity
          calculatedCost += ingCost;
          
          ingredientDetails.push({
            name: ingName,
            cost: ingCost,
            pricePerUnit: pricePerUnit,
            unit: unit
          });
        } catch (err) {
          // Skip
        }
      }
      
      const difference = currentCost ? Math.abs(currentCost - calculatedCost) : null;
      const percentDiff = currentCost && calculatedCost ? 
        ((difference / currentCost) * 100).toFixed(1) : null;
      
      if (currentCost && difference && difference > 0.50) {
        issues.push({
          recipe: name,
          currentCost,
          calculatedCost,
          difference,
          percentDiff,
          ingredients: ingredientDetails
        });
      }
    }
    
    if (issues.length > 0) {
      console.log(`\n  Found ${issues.length} recipes with cost discrepancies:\n`);
      
      for (const issue of issues.slice(0, 5)) {
        console.log(`  ⚠️  ${issue.recipe}`);
        console.log(`     Current: $${issue.currentCost.toFixed(2)}`);
        console.log(`     Calculated: $${issue.calculatedCost.toFixed(2)}`);
        console.log(`     Difference: $${issue.difference.toFixed(2)} (${issue.percentDiff}%)`);
        console.log(`     Ingredients:`);
        issue.ingredients.forEach(ing => {
          console.log(`       - ${ing.name}: $${ing.cost.toFixed(2)}${ing.pricePerUnit ? ` ($${ing.pricePerUnit}/${ing.unit || 'unit'})` : ''}`);
        });
        console.log('');
      }
    } else {
      console.log('\n  ✅ No major discrepancies found');
    }
    
    console.log('\n💡 Issues Identified:\n');
    console.log('  1. Cost calculation assumes 1 unit per ingredient');
    console.log('  2. No quantity tracking in recipe-ingredient relationship');
    console.log('  3. Price per unit exists but not used in calculations');
    console.log('  4. Need to know how much of each ingredient recipe uses');
    
  } catch (error) {
    console.error('Error analyzing cost calculation:', error.message);
  }
}

async function main() {
  console.log('\n🔍 COMPREHENSIVE DATABASE ANALYSIS\n');
  console.log('Analyzing structure for cost calculation improvements...\n');
  
  await analyzeIngredients();
  await analyzeRecipes();
  await analyzeCostCalculation();
  
  console.log('\n' + '='.repeat(70));
  console.log('\n✅ Analysis Complete\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
}
