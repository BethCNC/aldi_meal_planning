/**
 * Interactive Recipe Import Tool
 * 
 * Adds new recipes to Notion with automatic ingredient matching and cost calculation
 * 
 * Usage: node scripts/add-recipe-interactive.js
 */

import {createRecipe, searchIngredient, createIngredient, linkRecipeToIngredients, findRecipe} from '../src/notion/notionClient.js';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Prompt user for input
 */
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Parse ingredient line into quantity, unit, and name
 */
function parseIngredientLine(line) {
  const cleaned = line.trim();
  
  // Pattern: "1 lb ground beef" or "2 cups rice" or "ground beef"
  const match = cleaned.match(/^(\d+\.?\d*)\s*([a-zA-Z]+)?\s*(.+)$/);
  
  if (match) {
    return {
      quantity: parseFloat(match[1]),
      unit: match[2] || '',
      name: match[3].trim()
    };
  }
  
  // No quantity found
  return {
    quantity: null,
    unit: '',
    name: cleaned
  };
}

/**
 * Extract ingredient name from parsed ingredient (for searching)
 */
function extractSearchName(parsed) {
  // Remove common prefixes that might be in the name
  const name = parsed.name.toLowerCase()
    .replace(/^(fresh|dried|frozen|canned|jarred|bottled)\s+/i, '')
    .replace(/^(\d+\s*)?(lb|lbs|oz|cup|cups|tbsp|tsp|can|cans|packet|packets|bag|bags)\s+/i, '')
    .trim();
  
  return name;
}

/**
 * Main interactive flow
 */
async function main() {
  console.log('\n🍳 Add New Recipe to Notion\n');
  
  try {
    // Step 1: Get recipe details
    const recipeName = await prompt('Recipe name: ');
    if (!recipeName) {
      console.log('❌ Recipe name is required');
      rl.close();
      return;
    }
    
    // Check if recipe already exists
    const existing = await findRecipe(recipeName);
    if (existing) {
      const overwrite = await prompt(`⚠️  Recipe "${recipeName}" already exists. Continue anyway? (y/N): `);
      if (overwrite.toLowerCase() !== 'y') {
        console.log('Cancelled.');
        rl.close();
        return;
      }
    }
    
    const servingsInput = await prompt('Servings: ');
    const servings = parseInt(servingsInput) || null;
    
    const category = await prompt('Category (Beef/Chicken/Pork/Vegetarian/Seafood/Other): ');
    const sourceUrl = await prompt('Source URL (optional, press Enter to skip): ');
    
    // Step 2: Get ingredients
    console.log('\n📝 Enter ingredients (one per line, press Enter twice when done):');
    
    const ingredients = [];
    let line = '';
    let emptyCount = 0;
    
    while (true) {
      line = await prompt('> ');
      if (line.trim() === '') {
        emptyCount++;
        if (emptyCount >= 2 && ingredients.length > 0) {
          break;
        }
        if (ingredients.length === 0) {
          console.log('   (Enter at least one ingredient)');
        }
      } else {
        emptyCount = 0;
        ingredients.push(line.trim());
      }
    }
    
    // Step 3: Process ingredients
    console.log('\n🔍 Processing ingredients...\n');
    
    const ingredientRelations = [];
    const ingredientsList = [];
    let totalCost = 0;
    
    for (const ingredientLine of ingredients) {
      const parsed = parseIngredientLine(ingredientLine);
      ingredientsList.push(ingredientLine);
      
      // Search for ingredient in database
      const searchName = extractSearchName(parsed);
      const existingIngredient = await searchIngredient(searchName);
      
      if (existingIngredient) {
        // Found in database - use 'Price per Package ($)'
        const cost = existingIngredient.properties['Price per Package ($)']?.number || 0;
        
        console.log(`✅ Found: ${parsed.name} ($${cost.toFixed(2)})`);
        
        // Add to cost (assuming 1 unit per recipe for simplicity)
        totalCost += cost;
        ingredientRelations.push({id: existingIngredient.id});
      } else {
        // Not found - prompt for cost
        console.log(`❓ Not found: ${parsed.name}`);
        const costInput = await prompt('   Enter cost: $');
        const cost = parseFloat(costInput) || 0;
        
        if (cost > 0) {
          // Create new ingredient
          const newIngredient = await createIngredient({
            item: parsed.name,
            unit: parsed.unit,
            price: cost,
            notes: `Created when adding recipe: ${recipeName}`
          });
          
          console.log(`✨ Created: ${parsed.name} ($${cost.toFixed(2)})`);
          
          totalCost += cost;
          ingredientRelations.push({id: newIngredient.id});
        } else {
          console.log(`⚠️  Skipping ${parsed.name} (no cost entered)`);
        }
      }
    }
    
    const costPerServing = servings ? totalCost / servings : null;
    
    console.log('\n💰 Cost Summary:');
    console.log(`   Total: $${totalCost.toFixed(2)}`);
    if (costPerServing) {
      console.log(`   Per Serving: $${costPerServing.toFixed(2)}`);
    }
    
    // Step 4: Get instructions (optional)
    console.log('\n📖 Instructions (optional, press Enter twice when done or just Enter to skip):');
    const instructions = [];
    emptyCount = 0;
    
    while (true) {
      const instructionLine = await prompt('> ');
      if (instructionLine.trim() === '') {
        emptyCount++;
        if (emptyCount >= 2 || (instructions.length === 0 && emptyCount >= 1)) {
          break;
        }
      } else {
        emptyCount = 0;
        instructions.push(instructionLine.trim());
      }
    }
    
    // Step 5: Confirm and create
    console.log('\n📋 Recipe Summary:');
    console.log(`   Name: ${recipeName}`);
    console.log(`   Servings: ${servings || 'N/A'}`);
    console.log(`   Category: ${category || 'N/A'}`);
    console.log(`   Total Cost: $${totalCost.toFixed(2)}`);
    console.log(`   Cost per Serving: ${costPerServing ? '$' + costPerServing.toFixed(2) : 'N/A'}`);
    console.log(`   Ingredients: ${ingredients.length}`);
    
    const confirm = await prompt('\n✨ Create recipe in Notion? (Y/n): ');
    
    if (confirm.toLowerCase() === 'n') {
      console.log('Cancelled.');
      rl.close();
      return;
    }
    
    console.log('\n✨ Creating recipe in Notion...');
    
    const recipeData = {
      name: recipeName,
      category: category || undefined,
      servings: servings,
      totalCost: totalCost,
      costPerServing: costPerServing,
      ingredientsList: ingredientsList.join('\n'),
      instructions: instructions.length > 0 ? instructions.join('\n') : undefined,
      sourceUrl: sourceUrl || undefined,
      ingredientRelations: ingredientRelations.map(rel => rel.id)
    };
    
    const createdRecipe = await createRecipe(recipeData);
    
    console.log('\n✅ Recipe added successfully!');
    console.log(`🔗 ${createdRecipe.url}`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code) {
      console.error(`   Code: ${error.code}`);
    }
  } finally {
    rl.close();
  }
}

// Run the script
main();
