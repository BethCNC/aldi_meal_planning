/**
 * Interactive Recipe Import Tool
 *
 * Adds new recipes to Notion with automatic ingredient matching,
 * package-aware costing, and metadata capture for the UX case study.
 *
 * Usage: node scripts/add-recipe-interactive.js
 */

import {
  createRecipe,
  searchIngredient,
  createIngredient,
  findRecipe
} from '../backend/notion/notionClient.js';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function promptNumber(question, defaultValue = null, {allowEmpty = true, min = null} = {}) {
  while (true) {
    const answer = await prompt(question);
    if (answer === '') {
      if (allowEmpty) {
        return defaultValue;
      }
      if (defaultValue !== null) {
        return defaultValue;
      }
      console.log('   Please enter a value.');
      continue;
    }

    const value = parseFloat(answer);
    if (Number.isNaN(value)) {
      console.log('   Please enter a numeric value.');
      continue;
    }

    if (min !== null && value < min) {
      console.log(`   Please enter a value ≥ ${min}.`);
      continue;
    }

    return value;
  }
}

async function promptBoolean(question, defaultValue = true) {
  const answer = (await prompt(question)).toLowerCase();
  if (!answer) return defaultValue;
  return answer === 'y' || answer === 'yes';
}

function formatCurrency(amount) {
  return `$${(amount ?? 0).toFixed(2)}`;
}

function normalizeCategory(input) {
  if (!input) return 'Other';
  const trimmed = input.trim();
  if (!trimmed) return 'Other';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

function parseIngredientLine(line) {
  const cleaned = line.trim();
  const match = cleaned.match(/^([\d\/\.]+)\s*([a-zA-Z]+)?\s*(.+)$/);

  if (match) {
    return {
      quantity: evalQuantity(match[1]),
      unit: match[2] || '',
      name: match[3].trim()
    };
  }

  return {
    quantity: null,
    unit: '',
    name: cleaned
  };
}

function evalQuantity(value) {
  if (!value) return null;
  if (value.includes('/')) {
    const [numerator, denominator] = value.split('/').map(parseFloat);
    if (!Number.isNaN(numerator) && !Number.isNaN(denominator) && denominator !== 0) {
      return numerator / denominator;
    }
  }
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function extractSearchName(parsed) {
  return parsed.name.toLowerCase()
    .replace(/^(fresh|dried|frozen|canned|jarred|bottled|low-sodium|reduced-fat)\s+/i, '')
    .replace(/^([\d\.]+\s*)?(lb|lbs|oz|cup|cups|tbsp|tsp|can|cans|packet|packets|bag|bags|each|clove|cloves)\s+/i, '')
    .trim();
}

async function collectIngredients(recipeName) {
  console.log('\n📝 Enter ingredients (one per line, press Enter twice when done):');

  const rawIngredients = [];
  let line = '';
  let emptyCount = 0;

  while (true) {
    line = await prompt('> ');
    if (line.trim() === '') {
      emptyCount++;
      if (emptyCount >= 2 && rawIngredients.length > 0) {
        break;
      }
      if (rawIngredients.length === 0) {
        console.log('   (Enter at least one ingredient)');
      }
    } else {
      emptyCount = 0;
      rawIngredients.push(line.trim());
    }
  }

  const ingredientRecords = [];
  let totalCost = 0;

  for (const ingredientLine of rawIngredients) {
    const parsed = parseIngredientLine(ingredientLine);
    const searchName = extractSearchName(parsed);
    const existingIngredient = await searchIngredient(searchName);

    if (existingIngredient) {
      const properties = existingIngredient.properties;
      const pricePerPackage = properties['Price per Package ($)']?.number || 0;
      const packageSize = properties['Package Size']?.number || null;
      const packageUnit = properties['Package Unit']?.select?.name || properties['Unit']?.rich_text?.[0]?.plain_text || '';
      const category = properties['Category']?.select?.name || 'Pantry';

      console.log(`✅ Found: ${parsed.name} (${packageSize || '1'} ${packageUnit || 'package'}) at ${formatCurrency(pricePerPackage)}`);

      let packagesUsed = 1;
      if (pricePerPackage > 0) {
        packagesUsed = await promptNumber('   Packages needed? (default 1): ', 1, {allowEmpty: true, min: 0});
      }

      const costContribution = (pricePerPackage || 0) * (packagesUsed || 0);
      totalCost += costContribution;

      ingredientRecords.push({
        id: existingIngredient.id,
        name: parsed.name,
        packagesUsed: packagesUsed || 0,
        pricePerPackage,
        costContribution,
        category,
        packageSize,
        packageUnit,
        source: 'match'
      });
    } else {
      console.log(`❓ Not found: ${parsed.name}`);

      const pricePerPackage = await promptNumber('   Price per package ($): ', 0, {allowEmpty: false, min: 0});
      const packageSize = await promptNumber('   Package size (e.g., 16): ', null, {allowEmpty: true, min: 0});
      const packageUnit = await prompt('   Package unit (oz, lb, each, etc): ');
      const baseUnit = await prompt('   Base unit (optional, e.g., oz, g): ');
      const categoryInput = await prompt('   Category (Produce/Meat/Dairy/Pantry/Frozen/Other): ');
      const category = normalizeCategory(categoryInput);
      const packagesUsed = pricePerPackage > 0
        ? await promptNumber('   Packages needed? (default 1): ', 1, {allowEmpty: true, min: 0})
        : 0;

      const newIngredient = await createIngredient({
        item: parsed.name,
        pricePerPackage,
        packageSize,
        packageUnit: packageUnit || undefined,
        baseUnit: baseUnit || undefined,
        category,
        notes: `Created when adding recipe: ${recipeName}`
      });

      const costContribution = (pricePerPackage || 0) * (packagesUsed || 0);
      totalCost += costContribution;

      console.log(`✨ Created: ${parsed.name} (${category}) at ${formatCurrency(pricePerPackage)}`);

      ingredientRecords.push({
        id: newIngredient.id,
        name: parsed.name,
        packagesUsed: packagesUsed || 0,
        pricePerPackage,
        costContribution,
        category,
        packageSize,
        packageUnit,
        source: 'new'
      });
    }
  }

  return {
    totalCost,
    ingredientRecords,
    ingredientList: rawIngredients
  };
}

async function collectInstructions() {
  console.log('\n📖 Instructions (optional, press Enter twice when done or Enter to skip):');
  const instructions = [];
  let emptyCount = 0;

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

  return instructions;
}

async function main() {
  console.log('\n🍳 Add New Recipe to Notion\n');

  try {
    const recipeName = await prompt('Recipe name: ');
    if (!recipeName) {
      console.log('❌ Recipe name is required');
      rl.close();
      return;
    }

    const existing = await findRecipe(recipeName);
    if (existing) {
      const overwrite = await promptBoolean(`⚠️  Recipe "${recipeName}" already exists. Continue anyway? (y/N): `, false);
      if (!overwrite) {
        console.log('Cancelled.');
        rl.close();
        return;
      }
    }

    const servingsInput = await prompt('Servings (default 4): ');
    const servings = servingsInput ? parseInt(servingsInput, 10) : 4;

    const category = normalizeCategory(await prompt('Category (Beef/Chicken/Pork/Vegetarian/Seafood/Other): '));
    const sourceUrl = await prompt('Source URL (optional, press Enter to skip): ');

    const prepTime = await promptNumber('Prep time in minutes (optional): ', null, {allowEmpty: true, min: 0});

    const familiarityInput = (await prompt('Familiarity (Tried-and-true / Comfortable / New) [T/C/N]: ')).toLowerCase();
    let familiarityLabel = null;
    if (familiarityInput === 't') familiarityLabel = 'Tried-and-true';
    if (familiarityInput === 'c') familiarityLabel = 'Comfortable';
    if (familiarityInput === 'n') familiarityLabel = 'New';

    const isSafe = await promptBoolean('Safe go-to recipe? (Y/n): ', true);

    const {totalCost, ingredientRecords, ingredientList} = await collectIngredients(recipeName);

    const costPerServing = servings ? totalCost / servings : null;

    const instructions = await collectInstructions();

    const ingredientLines = ingredientRecords.map((item) => {
      const packageInfo = item.packageSize ? ` (${item.packageSize} ${item.packageUnit || ''})` : '';
      return `   • ${item.name}${packageInfo}: ${item.packagesUsed || 0} pkg @ ${formatCurrency(item.pricePerPackage)} = ${formatCurrency(item.costContribution)}`;
    }).join('\n');

    const notesSegments = [];
    if (prepTime !== null) notesSegments.push(`Prep Time: ${prepTime} min`);
    if (familiarityLabel) notesSegments.push(`Familiarity: ${familiarityLabel}`);
    if (isSafe) notesSegments.push('Safe recipe');
    notesSegments.push(`Added via CLI on ${new Date().toLocaleDateString()}`);
    const notes = notesSegments.join(' | ');

    const tags = new Set(['Aldi']);
    if (isSafe) tags.add('Safe');
    if (prepTime !== null && prepTime <= 30) tags.add('Quick');

    console.log('\n📋 Recipe Summary:');
    console.log(`   Name: ${recipeName}`);
    console.log(`   Servings: ${servings || 'N/A'}`);
    console.log(`   Category: ${category || 'N/A'}`);
    console.log(`   Prep Time: ${prepTime !== null ? `${prepTime} min` : 'N/A'}`);
    console.log(`   Familiarity: ${familiarityLabel || 'N/A'}`);
    console.log(`   Safe: ${isSafe ? 'Yes' : 'No'}`);
    console.log(`   Total Cost: ${formatCurrency(totalCost)}`);
    console.log(`   Cost per Serving: ${costPerServing ? formatCurrency(costPerServing) : 'N/A'}`);
    console.log('\n💰 Ingredient Breakdown:');
    console.log(ingredientLines || '   (No cost data captured)');

    const confirm = await promptBoolean('\n✨ Create recipe in Notion? (Y/n): ', true);
    if (!confirm) {
      console.log('Cancelled.');
      rl.close();
      return;
    }

    console.log('\n✨ Creating recipe in Notion...');

    const recipeData = {
      name: recipeName,
      category: category || undefined,
      servings,
      totalCost,
      costPerServing,
      ingredientsList: ingredientList.join('\n'),
      instructions: instructions.length > 0 ? instructions.join('\n') : undefined,
      sourceUrl: sourceUrl || undefined,
      ingredientRelations: ingredientRecords.map((item) => item.id),
      tags: Array.from(tags),
      notes
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

main();
