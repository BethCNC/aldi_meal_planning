#!/usr/bin/env node

/**
 * Import selected recipes from the local Notion snapshot into Supabase.
 *
 * Usage:
 *   node scripts/import-notion-recipes-to-supabase.js [recipe name] [...]
 *
 * If no recipe names are provided, the script will import every Notion recipe
 * that does not currently exist in Supabase (exact name match).
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const { upsertRecipe, findRecipeByName } = await import('../backend/supabase/recipeClient.js');

const SNAPSHOT_PATH = path.join(process.cwd(), 'data', 'notion-recipes.json');

function loadNotionRecipes() {
  if (!fs.existsSync(SNAPSHOT_PATH)) {
    throw new Error(`Snapshot not found at ${SNAPSHOT_PATH}. Run scripts/fetch-notion-databases.js first.`);
  }
  const raw = fs.readFileSync(SNAPSHOT_PATH, 'utf-8');
  return JSON.parse(raw);
}

function normalise(text) {
  return text?.trim() || '';
}

function buildInstructions({ shortDescription, ingredients, instructions, sourceUrl }) {
  const blocks = [];

  if (shortDescription) {
    blocks.push(shortDescription.trim());
    blocks.push('');
  }

  if (ingredients) {
    blocks.push('Ingredients:');
    blocks.push(ingredients.trim());
    blocks.push('');
  }

  if (instructions) {
    blocks.push('Instructions:');
    blocks.push(instructions.trim());
  } else if (sourceUrl) {
    blocks.push('Instructions:');
    blocks.push(`See source for full instructions: ${sourceUrl}`);
  }

  return blocks.join('\n').trim();
}

function parseRecipe(record) {
  const name = normalise(record.recipeName);
  if (!name) {
    throw new Error('Notion recipe is missing a name.');
  }

  const totalCost = Number.isFinite(record.cost) ? Number(record.cost) : null;
  const servings = Number.isFinite(record.servings) ? Number(record.servings) : null;
  const costPerServing =
    totalCost && servings ? Number((totalCost / servings).toFixed(2)) : null;

  const instructionsText = buildInstructions({
    shortDescription: null,
    ingredients: normalise(record.recipeIngredients),
    instructions: normalise(record.instructions),
    sourceUrl: normalise(record.sourceUrl),
  });

  return {
    notionId: record.id,
    name,
    servings,
    category: normalise(record.category) || 'Other',
    totalCost,
    costPerServing,
    instructions: instructionsText || null,
    sourceUrl: normalise(record.sourceUrl) || null,
    tags: record.tags?.map((tag) => tag?.trim()).filter(Boolean) ?? [],
    notionUrl: normalise(record.url) || null,
  };
}

async function recipeExists(name) {
  const existing = await findRecipeByName(name);
  return existing?.id ?? null;
}

async function importRecipe(parsed) {
  const existingId = await recipeExists(parsed.name);

  const saved = await upsertRecipe({
    id: existingId ?? undefined,
    name: parsed.name,
    servings: parsed.servings,
    category: parsed.category,
    totalCost: parsed.totalCost,
    costPerServing: parsed.costPerServing,
    instructions: parsed.instructions,
    sourceUrl: parsed.sourceUrl,
    tags: parsed.tags,
    notionUrl: parsed.notionUrl,
  });

  return {
    name: parsed.name,
    action: existingId ? 'updated' : 'inserted',
    id: saved.id,
  };
}

async function main() {
  const notionRecipes = loadNotionRecipes();

  const filterNames = process.argv.slice(2).map((n) => n.trim()).filter(Boolean);
  const filterSet = new Set(filterNames);

  const candidates = notionRecipes.filter((item) => {
    const name = normalise(item.recipeName);
    if (!name) return false;
    if (filterSet.size > 0) {
      return filterSet.has(name);
    }
    return true;
  });

  if (candidates.length === 0) {
    console.log('No candidate recipes found. Provide recipe names or update the snapshot.');
    process.exit(0);
  }

  const results = [];

  for (const record of candidates) {
    try {
      const parsed = parseRecipe(record);
      const outcome = await importRecipe(parsed);
      results.push(outcome);
    } catch (error) {
      console.error(`❌ Failed to import "${record.recipeName}": ${error.message}`);
    }
  }

  if (results.length === 0) {
    console.log('No recipes imported.');
    process.exit(0);
  }

  console.log('\n✅ Notion recipe import complete!\n');
  for (const entry of results) {
    console.log(` - ${entry.name}: ${entry.action} (id: ${entry.id})`);
  }
  console.log(`\nTotal processed: ${results.length}\n`);
}

main().catch((error) => {
  console.error('\n❌ Import failed:', error.message);
  process.exit(1);
});






