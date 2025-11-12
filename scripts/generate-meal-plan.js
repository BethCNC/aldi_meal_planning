/**
 * Meal Plan Generator
 *
 * Builds a weekly plan directly from Notion recipes, balancing cost, variety,
 * and UX expectations (six dinners + flexible + leftover guidance).
 *
 * Usage examples:
 *   node scripts/generate-meal-plan.js --budget 75 --servings 4
 *   node scripts/generate-meal-plan.js --start-date 2025-01-27 --yes
 *   node scripts/generate-meal-plan.js --read-only
 */

import readline from 'readline';
import notionClient, {
  queryRecipes,
  createMealPlanEntry,
  queryMealPlanEntries
} from '../backend/notion/notionClient.js';
import { getUserPreferences } from '../backend/supabase/preferencesClient.js';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function createPrompt() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

function askYesNo(question) {
  const rl = createPrompt();
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      const normalized = answer.trim().toLowerCase();
      resolve(normalized === '' || normalized === 'y' || normalized === 'yes');
    });
  });
}

function formatCurrency(value) {
  return `$${(value ?? 0).toFixed(2)}`;
}

function normalizeRecipe(page) {
  const name = page.properties['Recipe Name']?.title?.[0]?.plain_text?.trim() || 'Untitled';
  const servings = page.properties['Servings']?.number || null;
  const totalCost = page.properties['Cost ($)']?.number ?? page.properties['Recipe Cost']?.number ?? null;
  const costPerServing = page.properties['Cost per Serving ($)']?.number ?? (totalCost && servings ? totalCost / servings : null);
  const category = page.properties['Category']?.select?.name || 'Other';
  const tags = (page.properties['Tags']?.multi_select || []).map((tag) => tag.name);
  const ratingName = page.properties['Rating']?.select?.name || '';
  const ratingScore = ratingName ? (ratingName.match(/★/g) || []).length : 0;
  const safe = tags.some((tag) => tag.toLowerCase().includes('safe'));
  const ingredientRelations = (page.properties['Aldi Ingredients']?.relation || [])
    .map((rel) => rel.id);

  return {
    id: page.id,
    name,
    servings,
    totalCost,
    costPerServing,
    category,
    tags,
    ratingScore,
    safe,
    ingredientRelations,
    raw: page
  };
}

function sortCandidates(recipes) {
  return [...recipes].sort((a, b) => {
    if (a.safe !== b.safe) {
      return a.safe ? -1 : 1; // safe recipes first
    }
    if (a.ratingScore !== b.ratingScore) {
      return b.ratingScore - a.ratingScore; // higher rating first
    }
    if (a.costPerServing != null && b.costPerServing != null) {
      return a.costPerServing - b.costPerServing;
    }
    if (a.totalCost != null && b.totalCost != null) {
      return a.totalCost - b.totalCost;
    }
    return a.name.localeCompare(b.name);
  });
}

function recentCategoriesOk(selected, candidateCategory) {
  if (selected.length === 0) return true;
  const recent = selected.slice(-2).map((item) => item.category);
  return !recent.every((cat) => cat === candidateCategory);
}

function selectMeals(recipes, mealSlots) {
  const prioritized = sortCandidates(recipes).filter((r) => r.totalCost != null);
  const selected = [];
  const usedIds = new Set();

  for (const candidate of prioritized) {
    if (selected.length >= mealSlots) break;
    if (usedIds.has(candidate.id)) continue;
    if (!recentCategoriesOk(selected, candidate.category)) continue;

    selected.push(candidate);
    usedIds.add(candidate.id);
  }

  if (selected.length < mealSlots) {
    // Relax category constraint and fill remaining slots
    for (const candidate of prioritized) {
      if (selected.length >= mealSlots) break;
      if (usedIds.has(candidate.id)) continue;
      selected.push(candidate);
      usedIds.add(candidate.id);
    }
  }

  return {
    selected,
    remaining: prioritized.filter((recipe) => !usedIds.has(recipe.id))
  };
}

function enforceBudget(selected, remaining, budget) {
  let currentSelection = [...selected];
  let totalCost = currentSelection.reduce((sum, recipe) => sum + (recipe.totalCost || 0), 0);

  if (totalCost <= budget) {
    return {selection: currentSelection, totalCost, withinBudget: true};
  }

  const availablePool = [...remaining].sort((a, b) => (a.totalCost || 0) - (b.totalCost || 0));

  while (totalCost > budget) {
    const mostExpensive = [...currentSelection].sort((a, b) => (b.totalCost || 0) - (a.totalCost || 0))[0];
    if (!mostExpensive) break;

    const cheaperReplacementIndex = availablePool.findIndex((candidate) =>
      (candidate.totalCost || 0) < (mostExpensive.totalCost || 0)
    );

    if (cheaperReplacementIndex === -1) {
      break;
    }

    const replacement = availablePool.splice(cheaperReplacementIndex, 1)[0];
    currentSelection = currentSelection.map((recipe) =>
      recipe.id === mostExpensive.id ? replacement : recipe
    );
    totalCost = currentSelection.reduce((sum, recipe) => sum + (recipe.totalCost || 0), 0);
  }

  return {
    selection: currentSelection,
    totalCost,
    withinBudget: totalCost <= budget
  };
}

function buildWeekStructure(startDate) {
  const baseDate = new Date(startDate);
  baseDate.setHours(0, 0, 0, 0);

  const structure = [
    {offset: 0, dayName: 'Sunday', type: 'flex', note: 'Flexible night – order out or enjoy leftovers'},
    {offset: 1, dayName: 'Monday', type: 'meal'},
    {offset: 2, dayName: 'Tuesday', type: 'meal'},
    {offset: 3, dayName: 'Wednesday', type: 'meal'},
    {offset: 4, dayName: 'Thursday', type: 'meal'},
    {offset: 5, dayName: 'Friday', type: 'meal'},
    {offset: 6, dayName: 'Saturday', type: 'meal', note: 'Cook double or plan easy leftovers for Sunday'}
  ];

  return structure.map((slot) => {
    const date = new Date(baseDate);
    date.setDate(baseDate.getDate() + slot.offset);
    return {
      ...slot,
      date: date.toISOString().split('T')[0]
    };
  });
}

function summarizePlan(slots) {
  console.log('\n📅 Generated Meal Plan:\n');
  for (const slot of slots) {
    if (slot.type === 'meal' && slot.recipe) {
      const {recipe} = slot;
      const tagLabel = recipe.safe ? 'Safe favorite' : recipe.category;
      console.log(`  ${slot.dayName}: ${recipe.name} — ${formatCurrency(recipe.totalCost)} (${tagLabel})`);
    } else if (slot.type === 'flex') {
      console.log(`  ${slot.dayName}: Flexible night (order out / rest)`);
    } else {
      console.log(`  ${slot.dayName}: ${slot.note || 'Leftovers / easy night'}`);
    }
  }
}

function buildPlanSummary(slots, budget) {
  const foodCost = slots.reduce((sum, slot) => sum + (slot.recipe?.totalCost || 0), 0);
  return {
    totalCost: foodCost,
    budget,
    remaining: budget - foodCost,
    withinBudget: foodCost <= budget
  };
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    budget: 75,
    servings: 4,
    days: 7,
    startDate: null,
    readOnly: false,
    autoApprove: false
  };

  for (let i = 0; i < args.length; i++) {
    const current = args[i];
    if (current === '--budget' && args[i + 1]) {
      options.budget = parseFloat(args[++i]);
    } else if (current === '--servings' && args[i + 1]) {
      options.servings = parseInt(args[++i], 10);
    } else if (current === '--days' && args[i + 1]) {
      options.days = parseInt(args[++i], 10);
    } else if ((current === '--start-date' || current === '--start') && args[i + 1]) {
      options.startDate = args[++i];
    } else if (current === '--read-only') {
      options.readOnly = true;
    } else if (current === '--yes' || current === '--y' || current === '--force') {
      options.autoApprove = true;
    }
  }

  return options;
}

function defaultWeekStart(preferences) {
  const today = new Date();
  let reference = new Date(today);

  if (preferences && typeof preferences.meal_plan_day === 'number') {
    const diff = preferences.meal_plan_day - today.getDay();
    const daysToAdd = diff >= 0 ? diff : diff + 7;
    reference.setDate(today.getDate() + daysToAdd);
  }

  reference.setHours(0, 0, 0, 0);
  const weekStart = new Date(reference);
  weekStart.setDate(reference.getDate() - reference.getDay());
  return weekStart.toISOString().split('T')[0];
}

async function printExistingPlan(existingEntries) {
  if (existingEntries.length === 0) {
    console.log('⚠️  No existing meal plan found for this range.');
    return;
  }

  console.log('📋 Current Meal Plan:\n');
  let total = 0;

  for (const entry of existingEntries) {
    const date = entry.properties['Date']?.date?.start;
    const dayName = date ? DAY_NAMES[new Date(date).getDay()] : 'Unknown';
    const mealRelation = entry.properties['Dinner']?.relation || [];
    const note = entry.properties['Dinner Lable']?.rich_text?.[0]?.plain_text;

    if (mealRelation.length > 0) {
      const recipe = await notionClient.pages.retrieve({page_id: mealRelation[0].id});
      const name = recipe.properties['Recipe Name']?.title?.[0]?.plain_text || 'Recipe';
      const cost = recipe.properties['Cost ($)']?.number || 0;
      total += cost;
      console.log(`  ${dayName}: ${name} — ${formatCurrency(cost)}`);
    } else {
      console.log(`  ${dayName}: ${note || 'No dinner assigned'}`);
    }
  }

  console.log(`\n💰 Total: ${formatCurrency(total)}`);
}

async function main() {
  const options = parseArgs();
  let preferences = null;

  try {
    preferences = await getUserPreferences();
  } catch (error) {
    console.warn('⚠️  Unable to load scheduling preferences from Supabase:', error.message);
  }

  if (!options.startDate) {
    options.startDate = defaultWeekStart(preferences);
  }

  if (options.days !== 7) {
    console.log('ℹ️  Aligning to 7-day weekly plan per UX requirements.');
    options.days = 7;
  }

  console.log('🎯 Meal Plan Generator\n');
  console.log(`📅 Week starting: ${options.startDate}`);
  console.log(`💰 Budget: ${formatCurrency(options.budget)}`);
  console.log(`👥 Servings: ${options.servings}`);
  console.log(`📆 Days: ${options.days}\n`);

  if (preferences && typeof preferences.meal_plan_day === 'number') {
    const todayIndex = new Date().getDay();
    const scheduledName = DAY_NAMES[preferences.meal_plan_day];
    if (todayIndex === preferences.meal_plan_day) {
      console.log(`✅ Running on scheduled meal plan day (${scheduledName}).`);
    } else {
      console.log(
        `⚠️  Scheduled meal plan day is ${scheduledName}, but today is ${DAY_NAMES[todayIndex]}.`
      );
    }
    console.log('');
  }

  try {
    const endDate = new Date(options.startDate);
    endDate.setDate(endDate.getDate() + options.days - 1);
    const existingEntries = await queryMealPlanEntries(
      options.startDate,
      endDate.toISOString().split('T')[0]
    );

    if (options.readOnly) {
      await printExistingPlan(existingEntries);
      return;
    }

    if (existingEntries.length > 0) {
      console.log(`⚠️  Found ${existingEntries.length} existing entries for this week.`);
      console.log('   Delete them in Notion or run with --read-only to review.\n');
    }

    console.log('🔍 Loading recipes from Notion...');
    const recipePages = await queryRecipes();

    if (recipePages.length === 0) {
      console.log('❌ No recipes found in Notion. Add recipes with cost data first.');
      process.exit(1);
    }

    const normalized = recipePages.map(normalizeRecipe).filter((recipe) => recipe.totalCost != null);

    if (normalized.length === 0) {
      console.log('❌ No recipes with cost data available. Ensure recipes have Cost ($) or Cost per Serving.');
      process.exit(1);
    }

    const weekStructure = buildWeekStructure(options.startDate);
    const mealSlots = weekStructure.filter((slot) => slot.type === 'meal').length;

    const {selected, remaining} = selectMeals(normalized, mealSlots);

    if (selected.length < mealSlots) {
      console.log(`⚠️  Only ${selected.length} meals available for ${mealSlots} slots. Add more recipes to Notion.`);
    }

    const {selection: budgetSelection, totalCost, withinBudget} = enforceBudget(selected, remaining, options.budget);

    const planSlots = weekStructure.map((slot) => {
      if (slot.type !== 'meal') {
        return {...slot};
      }
      const recipe = budgetSelection.shift();
      return {...slot, recipe};
    });

    summarizePlan(planSlots);

    const summary = buildPlanSummary(planSlots, options.budget);
    console.log(`\n💰 Total: ${formatCurrency(summary.totalCost)} / ${formatCurrency(summary.budget)}`);
    console.log(`   Remaining: ${formatCurrency(summary.remaining)}`);
    if (!withinBudget) {
      console.log('   ⚠️  Stayed over budget after swaps. Consider adding lower-cost recipes.');
    }

    if (!options.autoApprove) {
      const approved = await askYesNo('\nProceed to create this plan in Notion? (Y/n): ');
      if (!approved) {
        console.log('🚫 Cancelled without writing to Notion.');
        return;
      }
    }

    console.log('\n✨ Writing meal plan to Notion...\n');

    let created = 0;
    let skipped = 0;

    for (const slot of planSlots) {
      const existing = existingEntries.find((entry) => {
        const entryDate = entry.properties['Date']?.date?.start;
        return entryDate === slot.date;
      });

      if (existing) {
        console.log(`  ⏭️  ${slot.dayName}: Skipped (already exists)`);
        skipped++;
        continue;
      }

      try {
        await createMealPlanEntry({
          date: slot.date,
          dayOfWeek: slot.dayName,
          mealRecipeId: slot.recipe?.id || null,
          name: slot.type === 'meal' && slot.recipe ? undefined : slot.dayName,
          status: 'Planned',
          note: slot.note
        });
        const label = slot.recipe ? `${slot.recipe.name}` : slot.note || slot.dayName;
        console.log(`  ✅ ${slot.dayName}: ${label}`);
        created++;
      } catch (error) {
        console.error(`  ❌ ${slot.dayName}: ${error.message}`);
      }
    }

    console.log('\n✅ Meal plan complete!');
    console.log(`   Created: ${created}`);
    console.log(`   Skipped: ${skipped}`);
    console.log('\n📝 Next steps:');
    console.log(`   1. Review meal plan in Notion (week of ${options.startDate})`);
    console.log('   2. Run: node scripts/generate-grocery-list.js --week ' + options.startDate);
    console.log('   3. Shop and cook! 🍳');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.message?.includes('NOTION_ALDI_WEEKLY_MEAL_PLANNING_DB_ID')) {
      console.error('\n💡 Ensure the meal planner database ID is configured in .env');
    }
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
