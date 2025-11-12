/**
 * Grocery List Generator (Notion-first)
 *
 * Reads the weekly meal plan from Notion, gathers linked Aldi ingredients,
 * consolidates quantities, subtracts pantry stock, and outputs aisle-ordered
 * shopping lists. Exports both human-friendly text and structured JSON.
 *
 * Usage:
 *   node scripts/generate-grocery-list.js --week 2025-11-10
 *   node scripts/generate-grocery-list.js --start 2025-11-10 --end 2025-11-16 --pantry data/pantry.json
 */

import {readFile, writeFile} from 'fs/promises';
import notionClient, {queryMealPlanEntries} from '../backend/notion/notionClient.js';
import { getUserPreferences } from '../backend/supabase/preferencesClient.js';

const CATEGORY_SECTIONS = [
  {key: 'produce', names: ['produce', 'vegetable', 'fruit'], icon: '🥦', name: 'Produce', location: 'Front Left', order: 1},
  {key: 'meat', names: ['meat', 'beef', 'chicken', 'pork', 'seafood', 'fish', 'turkey'], icon: '🥩', name: 'Meat & Seafood', location: 'Back Left', order: 2},
  {key: 'dairy', names: ['dairy', 'cheese', 'milk', 'egg', 'yogurt', 'butter'], icon: '🧀', name: 'Dairy & Eggs', location: 'Back Right', order: 3},
  {key: 'frozen', names: ['frozen', 'ice cream'], icon: '🧊', name: 'Frozen', location: 'Middle Right', order: 4},
  {key: 'bakery', names: ['bakery', 'bread', 'tortilla'], icon: '🍞', name: 'Bakery', location: 'Center Aisles', order: 5},
  {key: 'pantry', names: ['pantry', 'canned', 'dry', 'spice', 'grain', 'snack', 'condiment', 'sauce'], icon: '🥫', name: 'Pantry & Dry Goods', location: 'Center Aisles', order: 6}
];

const DEFAULT_SECTION = {key: 'pantry', icon: '🥫', name: 'Pantry & Dry Goods', location: 'Center Aisles', order: 99};
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    week: null,
    startDate: null,
    endDate: null,
    output: 'grocery-list.txt',
    jsonOutput: 'grocery-list.json',
    pantryPath: null
  };

  for (let i = 0; i < args.length; i++) {
    const value = args[i];
    if (value === '--week' && args[i + 1]) {
      options.week = args[++i];
    } else if (value === '--start' && args[i + 1]) {
      options.startDate = args[++i];
    } else if (value === '--end' && args[i + 1]) {
      options.endDate = args[++i];
    } else if (value === '--output' && args[i + 1]) {
      options.output = args[++i];
    } else if (value === '--json' && args[i + 1]) {
      options.jsonOutput = args[++i];
    } else if (value === '--pantry' && args[i + 1]) {
      options.pantryPath = args[++i];
    }
  }

  if (options.week) {
    const weekStart = new Date(options.week);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    options.startDate = weekStart.toISOString().split('T')[0];
    options.endDate = weekEnd.toISOString().split('T')[0];
  }

  if (!options.jsonOutput && options.output.endsWith('.txt')) {
    options.jsonOutput = options.output.replace(/\.txt$/, '.json');
  }

  if (!options.pantryPath) {
    options.pantryPath = 'data/pantry.json';
  }

  return options;
}

function defaultWeekRange(preferences) {
  const today = new Date();
  let reference = new Date(today);

  if (preferences && typeof preferences.grocery_day === 'number') {
    const diff = preferences.grocery_day - today.getDay();
    const daysToAdd = diff >= 0 ? diff : diff + 7;
    reference.setDate(today.getDate() + daysToAdd);
  }

  reference.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(reference);
  startOfWeek.setDate(reference.getDate() - reference.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  return {
    start: startOfWeek.toISOString().split('T')[0],
    end: endOfWeek.toISOString().split('T')[0]
  };
}

async function loadPantryStock(path) {
  try {
    const raw = await readFile(path, 'utf-8');
    const data = JSON.parse(raw);
    const byId = new Map();
    const byName = new Map();

    const entries = Array.isArray(data) ? data : data.items || [];
    for (const entry of entries) {
      const quantity = Number(entry.quantity ?? entry.count ?? entry.packages ?? entry.units ?? 0) || 0;
      if (entry.id) {
        byId.set(entry.id, quantity);
      }
      if (entry.name) {
        byName.set(entry.name.toLowerCase(), quantity);
      }
    }

    if (byId.size === 0 && byName.size === 0) {
      return {byId: new Map(), byName: new Map()};
    }

    console.log(`📦 Loaded pantry fallback from ${path}`);
    return {byId, byName};
  } catch (error) {
    return {byId: new Map(), byName: new Map()};
  }
}

async function fetchRecipe(recipeId, cache) {
  if (cache.has(recipeId)) return cache.get(recipeId);
  const page = await notionClient.pages.retrieve({page_id: recipeId});
  cache.set(recipeId, page);
  return page;
}

async function fetchIngredient(ingredientId, cache) {
  if (cache.has(ingredientId)) return cache.get(ingredientId);
  try {
    const page = await notionClient.pages.retrieve({page_id: ingredientId});
    cache.set(ingredientId, page);
    return page;
  } catch (error) {
    console.error(`  ❌ Failed to load ingredient ${ingredientId}: ${error.message}`);
    cache.set(ingredientId, null);
    return null;
  }
}

function normalizeIngredient(page) {
  if (!page) return null;
  const name = page.properties['Item']?.title?.[0]?.plain_text?.trim();
  if (!name) return null;

  const pricePerPackage = page.properties['Price per Package ($)']?.number ?? 0;
  const category = page.properties['Category']?.select?.name || 'Pantry';
  const packageSize = page.properties['Package Size']?.number || null;
  const packageUnit = page.properties['Package Unit']?.select?.name || page.properties['Unit']?.rich_text?.[0]?.plain_text || '';
  const baseUnit = page.properties['Base Unit']?.select?.name || '';

  return {
    id: page.id,
    name,
    category,
    pricePerPackage,
    packageSize,
    packageUnit,
    baseUnit
  };
}

function resolveSection(categoryName) {
  const normalized = (categoryName || '').toLowerCase();
  for (const section of CATEGORY_SECTIONS) {
    if (section.names.some((name) => normalized.includes(name))) {
      return section;
    }
  }
  return DEFAULT_SECTION;
}

function formatCurrency(value) {
  return `$${(value ?? 0).toFixed(2)}`;
}

async function aggregateIngredients(mealPlanEntries, pantryStock) {
  const recipeCache = new Map();
  const ingredientCache = new Map();
  const aggregated = new Map();

  for (const entry of mealPlanEntries) {
    const dinnerRelation = entry.properties['Dinner']?.relation || [];
    if (dinnerRelation.length === 0) continue; // skip flexible/leftover nights

    for (const relation of dinnerRelation) {
      const recipePage = await fetchRecipe(relation.id, recipeCache);
      const recipeName = recipePage.properties['Recipe Name']?.title?.[0]?.plain_text || 'Recipe';
      const ingredientRelations = recipePage.properties['Aldi Ingredients']?.relation || [];

      for (const ingRel of ingredientRelations) {
        const ingredientPage = await fetchIngredient(ingRel.id, ingredientCache);
        const ingredient = normalizeIngredient(ingredientPage);
        if (!ingredient) continue;

        const key = ingredient.id;
        if (!aggregated.has(key)) {
          aggregated.set(key, {
            ...ingredient,
            occurrences: 0,
            recipes: new Set()
          });
        }

        const item = aggregated.get(key);
        item.occurrences += 1;
        item.recipes.add(recipeName);
      }
    }
  }

  const items = [];
  for (const item of aggregated.values()) {
    const pantryQuantity = pantryStock.byId.get(item.id) ?? pantryStock.byName.get(item.name.toLowerCase()) ?? 0;
    const packagesNeeded = Math.max(0, item.occurrences - pantryQuantity);
    const coveredByPantry = Math.min(item.occurrences, pantryQuantity);
    const estimatedCost = packagesNeeded * (item.pricePerPackage || 0);
    const savings = coveredByPantry * (item.pricePerPackage || 0);

    items.push({
      ...item,
      packagesNeeded,
      pantryQuantity,
      coveredByPantry,
      estimatedCost,
      savings,
      recipeNames: Array.from(item.recipes).sort()
    });
  }

  return items;
}

function groupBySection(items) {
  const sections = new Map();
  const alreadyHave = [];

  for (const item of items) {
    if (item.packagesNeeded === 0) {
      alreadyHave.push(item);
      continue;
    }

    const sectionMeta = resolveSection(item.category);
    if (!sections.has(sectionMeta.key)) {
      sections.set(sectionMeta.key, {
        ...sectionMeta,
        items: []
      });
    }

    sections.get(sectionMeta.key).items.push(item);
  }

  for (const section of sections.values()) {
    section.items.sort((a, b) => a.name.localeCompare(b.name));
  }

  alreadyHave.sort((a, b) => a.name.localeCompare(b.name));

  return {
    sections: Array.from(sections.values()).sort((a, b) => a.order - b.order),
    alreadyHave
  };
}

function buildTextOutput({sections, alreadyHave}, summary, startDate, endDate) {
  let output = '🛒 ALDI GROCERY LIST\n';
  output += '='.repeat(56) + '\n';
  output += `Week: ${startDate} – ${endDate}\n`;
  output += `Estimated spend: ${formatCurrency(summary.totalCost)} (saved ${formatCurrency(summary.savings)} from pantry)\n`;
  output += '='.repeat(56) + '\n\n';

  for (const section of sections) {
    output += `${section.icon} ${section.name} — ${section.location}\n`;
    for (const item of section.items) {
      const portions = `${item.packagesNeeded} pkg${item.packagesNeeded > 1 ? 's' : ''}`;
      const packageInfo = item.packageSize ? ` (${item.packageSize} ${item.packageUnit || ''})` : '';
      const pantryNote = item.pantryQuantity > 0 ? ` (pantry -${item.pantryQuantity})` : '';
      output += `  [ ] ${item.name}${packageInfo} — ${portions} @ ${formatCurrency(item.pricePerPackage)} = ${formatCurrency(item.estimatedCost)}${pantryNote}\n`;
      output += `      ⇢ ${item.recipeNames.join(', ')}\n`;
    }
    output += '\n';
  }

  if (alreadyHave.length > 0) {
    output += '✅ ALREADY ON HAND\n';
    for (const item of alreadyHave) {
      const portions = `${item.coveredByPantry} pkg${item.coveredByPantry > 1 ? 's' : ''}`;
      output += `  • ${item.name} — ${portions} (saved ${formatCurrency(item.savings)})\n`;
    }
    output += '\n';
  }

  output += '='.repeat(56) + '\n';
  output += `TOTAL TO BUY: ${formatCurrency(summary.totalCost)}\n`;
  output += `PANTRY SAVINGS: ${formatCurrency(summary.savings)}\n`;
  output += '='.repeat(56) + '\n';

  return output;
}

async function main() {
  const options = parseArgs();
  let preferences = null;

  try {
    preferences = await getUserPreferences();
  } catch (error) {
    console.warn('⚠️  Unable to load scheduling preferences from Supabase:', error.message);
  }

  if (!options.startDate || !options.endDate) {
    const {start, end} = defaultWeekRange(preferences);
    options.startDate = options.startDate || start;
    options.endDate = options.endDate || end;
  }

  if (!options.endDate && options.startDate) {
    const start = new Date(options.startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    options.endDate = end.toISOString().split('T')[0];
  }

  const pantryStock = await loadPantryStock(options.pantryPath);

  console.log('🛒 Grocery List Generator\n');
  console.log(`📅 Week: ${options.startDate} to ${options.endDate}`);
  if (preferences && typeof preferences.grocery_day === 'number') {
    const todayIndex = new Date().getDay();
    const scheduledName = DAY_NAMES[preferences.grocery_day];
    if (todayIndex === preferences.grocery_day) {
      console.log(`✅ Running on scheduled grocery day (${scheduledName}).\n`);
    } else {
      console.log(
        `⚠️  Scheduled grocery day is ${scheduledName}, but today is ${DAY_NAMES[todayIndex]}.\n`
      );
    }
  }

  try {
    const mealPlanEntries = await queryMealPlanEntries(options.startDate, options.endDate);

    if (mealPlanEntries.length === 0) {
      console.log('\n⚠️  No meal plan entries found for this week.');
      console.log('   Generate a plan first with scripts/generate-meal-plan.js');
      return;
    }

    const items = await aggregateIngredients(mealPlanEntries, pantryStock);
    const {sections, alreadyHave} = groupBySection(items);

    const totalCost = sections.reduce((total, section) =>
      total + section.items.reduce((sum, item) => sum + item.estimatedCost, 0)
    , 0);
    const savings = items.reduce((sum, item) => sum + item.savings, 0);

    const summary = {totalCost, savings};
    const textOutput = buildTextOutput({sections, alreadyHave}, summary, options.startDate, options.endDate);

    await writeFile(options.output, textOutput, 'utf-8');
    console.log(`\n✅ Grocery list saved to ${options.output}`);

    const jsonPayload = {
      weekStart: options.startDate,
      weekEnd: options.endDate,
      generatedAt: new Date().toISOString(),
      totalCost,
      savings,
      sections: sections.map((section) => ({
        key: section.key,
        name: section.name,
        icon: section.icon,
        location: section.location,
        items: section.items.map((item) => ({
          id: item.id,
          name: item.name,
          packagesNeeded: item.packagesNeeded,
          packageSize: item.packageSize,
          packageUnit: item.packageUnit,
          pricePerPackage: item.pricePerPackage,
          estimatedCost: item.estimatedCost,
          pantryQuantity: item.pantryQuantity,
          recipeNames: item.recipeNames
        }))
      })),
      alreadyHave: alreadyHave.map((item) => ({
        id: item.id,
        name: item.name,
        pantryQuantity: item.coveredByPantry,
        savings: item.savings,
        recipeNames: item.recipeNames
      }))
    };

    await writeFile(options.jsonOutput, JSON.stringify(jsonPayload, null, 2), 'utf-8');
    console.log(`✅ Structured data saved to ${options.jsonOutput}`);

    console.log('\n📋 Preview:\n');
    console.log(textOutput);
  } catch (error) {
    console.error('\n❌ Error generating grocery list:', error.message);
    if (error.code === 'object_not_found') {
      console.error('   Ensure NOTION_ALDI_WEEKLY_MEAL_PLANNING_DB_ID is configured in .env');
    }
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
