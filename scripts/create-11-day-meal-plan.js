import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { addDays, format, parseISO } from 'date-fns';
import puppeteer from 'puppeteer';
import dotenv from 'dotenv';

import { getRecipes } from '../backend/supabase/recipeClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(projectRoot, '.env.local') });
dotenv.config();

const START_DATE = '2025-11-12';
const END_DATE = '2025-11-23';

const LEFTOVER_DAYS = new Set(['Wednesday', 'Friday', 'Sunday']);
const COOK_EXCEPTIONS = new Set(['2025-11-12', '2025-11-14']);

const CATEGORY_ORDER = ['Produce', 'Meat', 'Dairy', 'Pantry', 'Frozen', 'Bakery', 'Other'];
const EXCLUDED_RECIPE_NAMES = new Set([
  'Crab Ravioli with Lemon-Garlic No-Cream Sauce',
  'Spaghetti Night',
  'Smash Burger Bowls'
]);

const PREFERRED_RECIPE_NAMES = [
  'Easy One Pot Cajun Chicken Pasta Recipe - Savvy Bites'
];

const MANUAL_RECIPE_DATA = {
  'Lemon Garlic Butter Shrimp & Zucchini': {
    ingredients: [
      {name: 'Large shrimp (peeled and deveined)', quantity: 1, unit: 'lb', category: 'Meat'},
      {name: 'Zucchini', quantity: 2, unit: 'each', category: 'Produce'},
      {name: 'Unsalted butter', quantity: 3, unit: 'tbsp', category: 'Dairy'},
      {name: 'Garlic cloves, minced', quantity: 3, unit: 'each', category: 'Produce'},
      {name: 'Lemon, juiced', quantity: 1, unit: 'each', category: 'Produce'},
      {name: 'Cooked rice (for serving)', quantity: 4, unit: 'cup', category: 'Pantry', optional: true},
      {name: 'Salt and black pepper', optional: true, category: 'Pantry'},
      {name: 'Red pepper flakes', optional: true, category: 'Pantry'}
    ]
  },
  'Soy-Glazed Chicken with Scallion-Ginger Oil': {
    ingredients: [
      {name: 'Soy sauce', quantity: 3, unit: 'tbsp', category: 'Pantry'},
      {name: 'Honey', quantity: 2, unit: 'tbsp', category: 'Pantry'},
      {name: 'Sesame oil', quantity: 1, unit: 'tsp', category: 'Pantry'},
      {name: 'Vegetable oil', quantity: 1, unit: 'tbsp', category: 'Pantry'},
      {name: 'Fresh ginger, minced', quantity: 1, unit: 'tbsp', category: 'Produce'},
      {name: 'Rice vinegar', quantity: 1, unit: 'tsp', category: 'Pantry', optional: true},
      {name: 'Hoisin sauce', quantity: 1, unit: 'tbsp', category: 'Pantry', optional: true},
      {name: 'Garlic clove, minced', quantity: 1, unit: 'each', category: 'Produce', optional: true}
    ]
  },
  'Sausage & Spinach Pasta': {
    ingredients: [
      {name: 'Olive oil', quantity: 1, unit: 'tbsp', category: 'Pantry'},
      {name: 'Yellow onion, diced', quantity: 0.5, unit: 'each', category: 'Produce'},
      {name: 'Garlic cloves, minced', quantity: 2, unit: 'each', category: 'Produce'},
      {name: 'Penne pasta', quantity: 12, unit: 'oz', category: 'Pantry'},
      {name: 'Italian seasoning', quantity: 1, unit: 'tsp', category: 'Pantry', optional: true},
      {name: 'Parmesan cheese, grated', quantity: 0.5, unit: 'cup', category: 'Dairy', optional: true}
    ]
  },
  'Ginger Chicken': {
    ingredients: [
      {name: 'Fresh ginger, grated', quantity: 1, unit: 'tbsp', category: 'Produce'},
      {name: 'Brown sugar', quantity: 2, unit: 'tbsp', category: 'Pantry'},
      {name: 'Rice vinegar', quantity: 1, unit: 'tbsp', category: 'Pantry'},
      {name: 'Sesame oil', quantity: 1, unit: 'tsp', category: 'Pantry', optional: true},
      {name: 'Vegetable oil', quantity: 1, unit: 'tbsp', category: 'Pantry'},
      {name: 'Green onions, sliced', quantity: 2, unit: 'each', category: 'Produce', optional: true}
    ]
  },
  'Philly Cheesesteak Tin Foil Dinners': {
    ingredients: [
      {name: 'Bell peppers, sliced', quantity: 2, unit: 'each', category: 'Produce'},
      {name: 'Yellow onion, sliced', quantity: 1, unit: 'each', category: 'Produce'},
      {name: 'Russet potatoes, thinly sliced', quantity: 2, unit: 'each', category: 'Produce'},
      {name: 'Garlic powder', quantity: 1, unit: 'tsp', category: 'Pantry'},
      {name: 'Vegetable oil', quantity: 2, unit: 'tbsp', category: 'Pantry'}
    ]
  },
  'Teriyaki Chicken': {
    ingredients: [
      {name: 'Garlic cloves, minced', quantity: 2, unit: 'each', category: 'Produce'},
      {name: 'Fresh ginger, minced', quantity: 1, unit: 'tbsp', category: 'Produce'},
      {name: 'Rice vinegar', quantity: 1, unit: 'tbsp', category: 'Pantry'},
      {name: 'Cornstarch', quantity: 1, unit: 'tbsp', category: 'Pantry'},
      {name: 'Sesame seeds', quantity: 1, unit: 'tbsp', category: 'Pantry', optional: true}
    ]
  },
  'Taco Pasta Casserole': {
    ingredients: [
      {name: 'Pasta shells or rotini', quantity: 12, unit: 'oz', category: 'Pantry'},
      {name: 'Taco seasoning', quantity: 1, unit: 'packet', category: 'Pantry'},
      {name: 'Black beans, drained', quantity: 1, unit: 'can', category: 'Pantry', optional: true},
      {name: 'Diced tomatoes with green chiles', quantity: 1, unit: 'can', category: 'Pantry', optional: true},
      {name: 'Sour cream', quantity: 0.5, unit: 'cup', category: 'Dairy', optional: true},
      {name: 'Green onions, sliced', quantity: 2, unit: 'each', category: 'Produce', optional: true}
    ]
  }
};

function isChickenPastaName(name = '') {
  const lower = name.toLowerCase();
  return lower.includes('chicken') && (lower.includes('pasta') || lower.includes('noodle'));
}

function ensureSupabaseEnv() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    throw new Error('Supabase environment variables are required. Populate SUPABASE_URL and SUPABASE_KEY.');
  }
}

function buildSchedule(start, end) {
  const days = [];
  let cursor = parseISO(start);
  const last = parseISO(end);

  while (cursor <= last) {
    const iso = cursor.toISOString().split('T')[0];
    const dayName = format(cursor, 'EEEE');
    const isException = COOK_EXCEPTIONS.has(iso);
    const isLeftover = LEFTOVER_DAYS.has(dayName) && !isException;

    days.push({
      date: iso,
      dayName,
      type: isLeftover ? 'leftover' : 'cook'
    });

    cursor = addDays(cursor, 1);
  }

  return days;
}

function normalizeRecipes(rawRecipes) {
  return rawRecipes
    .filter((recipe) => !EXCLUDED_RECIPE_NAMES.has(recipe?.name))
    .filter((recipe) => recipe?.total_cost != null && Array.isArray(recipe.recipe_ingredients) && recipe.recipe_ingredients.length > 0)
    .map((recipe) => ({
      id: recipe.id,
      name: recipe.name,
      category: recipe.category || 'Other',
      totalCost: recipe.total_cost || 0,
      servings: recipe.servings || null,
      costPerServing: recipe.cost_per_serving || (recipe.total_cost && recipe.servings ? recipe.total_cost / recipe.servings : null),
      instructions: recipe.instructions || '',
      sourceUrl: recipe.source_url || '',
      ingredientRelations: recipe.recipe_ingredients || [],
      manualIngredients: MANUAL_RECIPE_DATA[recipe.name]?.ingredients || [],
      manualInstructions: MANUAL_RECIPE_DATA[recipe.name]?.instructions || ''
    }))
    .sort((a, b) => (a.totalCost || 0) - (b.totalCost || 0));
}

function assignRecipes(schedule, recipes) {
  const used = new Set();
  const assigned = schedule.map((day) => ({ ...day }));

  for (const day of assigned) {
    if (day.type !== 'cook') continue;

    const recentCategory = assigned
      .filter((d) => d.recipe)
      .slice(-1)
      .map((d) => d.recipe.category)[0];

    let candidate = recipes.find(
      (recipe) => !used.has(recipe.id) && recipe.category !== recentCategory
    );

    if (!candidate) {
      candidate = recipes.find((recipe) => !used.has(recipe.id));
    }

    if (!candidate) {
      throw new Error('Not enough recipes available to fill the schedule.');
    }

    used.add(candidate.id);
    day.recipe = candidate;
  }

  return assigned;
}

function ensureChickenPasta(schedule, recipes) {
  const alreadyHasChickenPasta = schedule.some((day) => day.recipe && isChickenPastaName(day.recipe.name));
  if (alreadyHasChickenPasta) return;

  const usedIds = new Set(schedule.filter((day) => day.recipe).map((day) => day.recipe.id));
  const candidate = recipes.find((recipe) => isChickenPastaName(recipe.name) && !usedIds.has(recipe.id));
  if (!candidate) return;

  const targetIndex = schedule.findIndex((day) => day.type === 'cook' && day.recipe);
  if (targetIndex === -1) return;

  schedule[targetIndex].recipe = candidate;
}

function ensurePreferredRecipes(schedule, recipes) {
  const usedIds = new Set(schedule.filter((day) => day.recipe).map((day) => day.recipe.id));
  for (const preferredName of PREFERRED_RECIPE_NAMES) {
    const alreadyScheduled = schedule.some((day) => day.recipe && day.recipe.name === preferredName);
    if (alreadyScheduled) continue;

    const candidate = recipes.find((recipe) => recipe.name === preferredName && !usedIds.has(recipe.id));
    if (!candidate) continue;

    const replaceIndex = schedule.findIndex((day) => day.type === 'cook' && day.recipe && !PREFERRED_RECIPE_NAMES.includes(day.recipe.name));
    if (replaceIndex !== -1) {
      schedule[replaceIndex].recipe = candidate;
      usedIds.add(candidate.id);
    }
  }
}

function normalizeManualIngredient(manual) {
  const unit = manual.unit || null;
  const quantity = manual.quantity != null ? Number(manual.quantity) : null;

  return {
    ingredient_id: manual.ingredientId || null,
    ingredient: {
      id: manual.ingredientId || null,
      item: manual.name,
      category: manual.category || 'Pantry',
      package_size: manual.packageSize || null,
      package_unit: manual.packageUnit || null,
      price_per_package: manual.pricePerPackage || null,
      price_per_base_unit: manual.pricePerBaseUnit || null
    },
    ingredient_name: manual.name,
    raw_line: manual.rawLine || manual.name,
    quantity,
    unit,
    calculated_cost: manual.calculatedCost || null,
    optional: manual.optional || false,
    manual: true
  };
}

function getAllRecipeIngredients(recipe) {
  const base = recipe.ingredientRelations || [];
  const existingNames = new Set(
    base.map((ing) => (ing.ingredient_name || ing.raw_line || '').toLowerCase())
  );

  const manual = (recipe.manualIngredients || [])
    .filter((item) => item?.name)
    .filter((item) => !existingNames.has(item.name.toLowerCase()))
    .map(normalizeManualIngredient);

  return [...base, ...manual];
}

function consolidateIngredients(selectedDays) {
  const map = new Map();

  for (const day of selectedDays) {
    if (!day.recipe) continue;

    for (const ingredient of getAllRecipeIngredients(day.recipe)) {
      const key = ingredient.ingredient_id || ingredient.ingredient?.id || ingredient.ingredient?.item || ingredient.raw_line || `${day.recipe.id}-${ingredient.ingredient_name}`;
      if (!map.has(key)) {
        map.set(key, {
          ingredientId: ingredient.ingredient_id || ingredient.ingredient?.id || null,
          name: ingredient.ingredient?.item || ingredient.ingredient_name || ingredient.raw_line || 'Ingredient',
          category: ingredient.ingredient?.category || 'Pantry',
          specifiedQuantity: 0,
          unspecifiedCount: 0,
          unit: ingredient.unit || ingredient.ingredient?.base_unit || null,
          baseUnit: ingredient.ingredient?.base_unit || null,
          pricePerPackage: ingredient.ingredient?.price_per_package || null,
          packageSize: ingredient.ingredient?.package_size || null,
          packageUnit: ingredient.ingredient?.package_unit || null,
          pricePerBaseUnit: ingredient.ingredient?.price_per_base_unit || null,
          recipes: new Set(),
          optional: ingredient.optional || false
        });
      }

      const entry = map.get(key);
      if (ingredient.quantity != null && !Number.isNaN(ingredient.quantity)) {
        entry.specifiedQuantity += Number(ingredient.quantity);
        if (!entry.unit && ingredient.unit) {
          entry.unit = ingredient.unit;
        }
      } else {
        entry.unspecifiedCount += 1;
      }
      entry.recipes.add(day.recipe.name);
    }
  }

  const items = Array.from(map.values()).map((item) => {
    const {
      specifiedQuantity,
      unspecifiedCount,
      packageSize,
      pricePerPackage,
      packageUnit,
      unit,
      pricePerBaseUnit,
      baseUnit
    } = item;
    let packagesToBuy = null;
    let estimatedCost = null;

    if (pricePerPackage != null && specifiedQuantity > 0 && packageSize && packageUnit) {
      if (unit && unit === packageUnit) {
        packagesToBuy = Math.ceil(specifiedQuantity / packageSize);
        estimatedCost = packagesToBuy * pricePerPackage;
      } else if (!unit && baseUnit && baseUnit === packageUnit) {
        packagesToBuy = Math.ceil(specifiedQuantity / packageSize);
        estimatedCost = packagesToBuy * pricePerPackage;
      }
    }

    if (estimatedCost == null && pricePerBaseUnit != null && specifiedQuantity > 0) {
      estimatedCost = specifiedQuantity * pricePerBaseUnit;
    }

    return {
      ...item,
      recipes: Array.from(item.recipes).sort(),
      specifiedQuantity,
      unspecifiedCount,
      packagesToBuy,
      estimatedCost
    };
  });

  items.sort((a, b) => {
    const orderA = CATEGORY_ORDER.indexOf(a.category);
    const orderB = CATEGORY_ORDER.indexOf(b.category);
    if (orderA !== orderB) {
      return (orderA === -1 ? CATEGORY_ORDER.length : orderA) - (orderB === -1 ? CATEGORY_ORDER.length : orderB);
    }
    return a.name.localeCompare(b.name);
  });

  return items;
}

function escapeHtml(value) {
  const stringValue = value == null ? '' : String(value);
  return stringValue
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatCurrency(amount) {
  if (amount == null || Number.isNaN(amount)) return '$0.00';
  return `$${amount.toFixed(2)}`;
}

function renderHtml({ schedule, groceryItems, totalCost }) {
  const startLabel = format(parseISO(schedule[0].date), 'MMMM d, yyyy');
  const endLabel = format(parseISO(schedule[schedule.length - 1].date), 'MMMM d, yyyy');
  const recipeNames = Array.from(
    new Set(schedule.filter((day) => day.recipe).map((day) => day.recipe.name))
  );

  const scheduleRows = schedule
    .map((day) => {
      const label = day.recipe
        ? `${escapeHtml(day.recipe.name)} (${formatCurrency(day.recipe.totalCost)})`
        : 'Leftovers / Flex Night';
      return `<tr>
        <td>${format(parseISO(day.date), 'EEE MMM d')}</td>
        <td>${escapeHtml(day.dayName)}</td>
        <td>${label}</td>
      </tr>`;
    })
    .join('\n');

  const recipesList = recipeNames
    .map((name) => `<li>${escapeHtml(name)}</li>`)
    .join('\n');

  const grocerySections = groceryItems
    .reduce((sections, item) => {
      const key = item.category || 'Pantry';
      if (!sections[key]) sections[key] = [];
      sections[key].push(item);
      return sections;
    }, {});

  const groceryHtml = Object.entries(grocerySections)
    .map(([category, items]) => {
      const rows = items
        .map((item) => {
          const qtyLabel = item.specifiedQuantity > 0
            ? item.unit
              ? `${item.specifiedQuantity} ${item.unit}`
              : `${item.specifiedQuantity}`
            : item.unspecifiedCount > 0
              ? `${item.unspecifiedCount}×`
              : '';
          const details = qtyLabel ? ` – ${escapeHtml(qtyLabel)}` : '';
          return `<li><span class="checkbox"></span><span class="checklist-text">${escapeHtml(item.name)}${details}</span></li>`;
        })
        .join('\n');

      return `<section class="grocery-category">
        <h3>${escapeHtml(category)}</h3>
        <ul class="checklist">
          ${rows}
        </ul>
      </section>`;
    })
    .join('\n');

  const recipePages = schedule
    .filter((day) => day.recipe)
    .map((day) => {
      const recipe = day.recipe;
      const ingredientItems = getAllRecipeIngredients(recipe)
        .map((ingredient) => {
          const label = ingredient.raw_line || ingredient.ingredient_name || ingredient.ingredient?.item || 'Ingredient';
          const optional = ingredient.optional ? ' (optional)' : '';
          return `<li>${escapeHtml(label)}${optional}</li>`;
        })
        .join('\n');

      const instructionsText = recipe.manualInstructions || recipe.instructions;

      const instructionSteps = instructionsText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => `<li>${escapeHtml(line)}</li>`)
        .join('\n');

      const servingLabel = recipe.servings ? `${recipe.servings} servings` : 'Servings not specified';

      return `<section class="recipe-page">
        <header>
          <p class="recipe-day">${format(parseISO(day.date), 'EEEE, MMM d')}</p>
          <h2>${escapeHtml(recipe.name)}</h2>
          <p class="recipe-meta">${escapeHtml(recipe.category)} • ${servingLabel} • ${formatCurrency(recipe.totalCost)}</p>
        </header>
        <div class="two-column">
          <div>
            <h3>Grocery List</h3>
            <ul>${ingredientItems}</ul>
          </div>
          <div>
            <h3>Instructions</h3>
            <ol>${instructionSteps}</ol>
          </div>
        </div>
      </section>`;
    })
    .join('<div class="page-break"></div>');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      font-family: 'Helvetica Neue', Arial, sans-serif;
      color: #1f2933;
    }
    .page {
      padding: 48px;
      min-height: 100vh;
    }
    .page-break {
      page-break-after: always;
    }
    h1, h2, h3 {
      font-weight: 700;
      margin: 0 0 16px 0;
    }
    h1 {
      font-size: 48px;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    h2 {
      font-size: 28px;
    }
    h3 {
      font-size: 18px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }
    p {
      margin: 0 0 12px 0;
      line-height: 1.5;
      font-size: 14px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
    }
    th, td {
      text-align: left;
      padding: 10px 12px;
      border-bottom: 1px solid #e0e6ed;
      font-size: 13px;
    }
    th {
      text-transform: uppercase;
      letter-spacing: 0.7px;
      font-size: 12px;
      color: #52606d;
    }
    ul {
      padding-left: 20px;
      margin: 0 0 16px 0;
    }
    ol {
      padding-left: 20px;
      margin: 0;
    }
    li {
      margin-bottom: 6px;
      font-size: 13px;
      line-height: 1.45;
    }
    .cover {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: flex-start;
      height: 100vh;
      background: #ffffff;
      color: #1f2933;
      padding: 72px;
      border-left: 8px solid #fbbf24;
      border-top: 8px solid #fde68a;
    }
    .cover p {
      font-size: 16px;
    }
    .summary .totals {
      margin-top: 16px;
      padding: 12px;
      background: #f1f5f9;
      border-radius: 8px;
      font-size: 14px;
    }
    .recipes-list ul {
      columns: 2;
      column-gap: 32px;
      list-style-type: '• ';
      font-size: 14px;
    }
    .grocery-page {
      padding-top: 32px;
    }
    .grocery-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 20px 32px;
    }
    .grocery-category {
      break-inside: avoid;
    }
    .grocery-category ul {
      list-style: none;
      padding-left: 0;
      margin: 0;
    }
    .checklist {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .checklist li {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      font-size: 13px;
    }
    .checkbox {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 1.5px solid #cbd2d9;
      border-radius: 2px;
      margin-top: 2px;
      flex-shrink: 0;
    }
    .checklist-text {
      flex: 1;
      line-height: 1.4;
    }
    .recipe-notes {
      display: none;
    }
    .recipe-page header {
      margin-bottom: 20px;
    }
    .recipe-day {
      text-transform: uppercase;
      letter-spacing: 1px;
      font-size: 11px;
      color: #7b8794;
    }
    .recipe-meta {
      font-size: 13px;
      color: #52606d;
    }
    .two-column {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 24px;
    }
  </style>
</head>
<body>
  <section class="cover page">
    <p class="recipe-day">Aldi Meal Planning • Budget Edition</p>
    <h1>Aldi Meal Plan</h1>
    <p>${startLabel} &ndash; ${endLabel}</p>
    <p>Cook once, rest often. Designed for leftover nights on Wednesdays, Fridays, and Sundays.</p>
  </section>
  <div class="page-break"></div>

  <section class="summary page">
    <h2>11-Day Dinner Schedule</h2>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Day</th>
          <th>Dinner</th>
        </tr>
      </thead>
      <tbody>
        ${scheduleRows}
      </tbody>
    </table>
    <div class="totals">
      <p>Total recipe cost: ${formatCurrency(totalCost)}</p>
      <p>Leftover / rest nights: ${schedule.filter((d) => d.type === 'leftover').length}</p>
      <p>Cooking nights: ${schedule.filter((d) => d.recipe).length}</p>
    </div>
  </section>
  <div class="page-break"></div>

  <section class="recipes-list page">
    <h2>This Plan’s Recipes</h2>
    <ul>
      ${recipesList}
    </ul>
  </section>
  <div class="page-break"></div>

  <section class="page grocery-page">
    <h2>Grocery List</h2>
    <div class="grocery-grid">
      ${groceryHtml}
    </div>
  </section>
  <div class="page-break"></div>

  ${recipePages}
</body>
</html>`;
}

async function generatePdf(html, outputPath) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: outputPath,
      format: 'A4',
      margin: { top: '24mm', bottom: '24mm', left: '20mm', right: '20mm' },
      printBackground: true
    });
  } finally {
    await browser.close();
  }
}

async function main() {
  try {
    ensureSupabaseEnv();

    const rawRecipes = await getRecipes();
    const recipes = normalizeRecipes(rawRecipes);

    if (recipes.length === 0) {
      console.error('No recipes with costs and ingredient links were found in Supabase.');
      process.exit(1);
    }

    const schedule = assignRecipes(buildSchedule(START_DATE, END_DATE), recipes);
    ensurePreferredRecipes(schedule, recipes);
    ensureChickenPasta(schedule, recipes);
    const groceryItems = consolidateIngredients(schedule);

    const totalCost = schedule
      .filter((day) => day.recipe)
      .reduce((sum, day) => sum + (day.recipe.totalCost || 0), 0);

    const html = renderHtml({ schedule, groceryItems, totalCost });

    const outputPath = path.join(projectRoot, `Meal_Plan_${START_DATE}_to_${END_DATE}.pdf`);
    await generatePdf(html, outputPath);

    console.log('✅ Meal plan generated successfully!');
    console.log(`   Schedule dates: ${START_DATE} to ${END_DATE}`);
    console.log(`   Cooking nights: ${schedule.filter((d) => d.recipe).length}`);
    console.log(`   Total recipe cost: ${formatCurrency(totalCost)}`);
    console.log(`   PDF saved to: ${outputPath}`);
  } catch (error) {
    console.error('❌ Failed to generate 11-day meal plan.');
    console.error(error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}


