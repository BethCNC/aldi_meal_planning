#!/usr/bin/env node

/**
 * Ingredient Price Updater
 *
 * Supports two flows:
 *  1. Batch update from CSV/JSON (columns: name,item + price)
 *  2. Interactive prompt entry for quick adjustments
 *
 * Usage examples:
 *   node scripts/update-prices.js --file data/prices/aldi_ingredients_with_ppu.csv
 *   node scripts/update-prices.js --dry-run --file updates.json
 *   node scripts/update-prices.js (interactive mode)
 */

import {readFile, writeFile, mkdir} from 'fs/promises';
import path from 'path';
import readline from 'readline';
import {
  searchIngredient,
  updateIngredientPrice
} from '../backend/notion/notionClient.js';

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    file: null,
    dryRun: false
  };

  for (let i = 0; i < args.length; i++) {
    const token = args[i];
    if ((token === '--file' || token === '-f') && args[i + 1]) {
      options.file = args[++i];
    } else if (token === '--dry-run' || token === '--preview') {
      options.dryRun = true;
    }
  }

  return options;
}

async function parseFileRecords(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const raw = await readFile(filePath, 'utf-8');

  if (ext === '.json') {
    const data = JSON.parse(raw);
    const items = Array.isArray(data) ? data : data.items || [];
    return items.map((item) => ({
      name: item.name || item.item,
      price: Number(item.price ?? item.pricePerPackage ?? item.cost)
    })).filter((entry) => entry.name && Number.isFinite(entry.price));
  }

  // Assume CSV with headers including name/item and price columns
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  const header = lines[0].split(',').map((col) => col.trim().toLowerCase());
  const nameIndex = header.findIndex((col) => ['name', 'item'].includes(col));
  const priceIndex = header.findIndex((col) => col.includes('price'));

  if (nameIndex === -1 || priceIndex === -1) {
    console.warn('⚠️  CSV must include columns for name and price');
    return [];
  }

  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const columns = lines[i].split(',');
    const name = columns[nameIndex]?.trim();
    const price = Number(columns[priceIndex]?.trim());
    if (name && Number.isFinite(price)) {
      records.push({name, price});
    }
  }
  return records;
}

function createPrompt() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

async function collectInteractiveRecords() {
  const rl = createPrompt();
  const records = [];

  async function ask(question) {
    return new Promise((resolve) => {
      rl.question(question, (answer) => resolve(answer.trim()));
    });
  }

  console.log('🔧 Interactive price update mode (press Enter on name to finish)');
  while (true) {
    const name = await ask('Ingredient name: ');
    if (!name) break;

    let price = NaN;
    while (!Number.isFinite(price)) {
      const priceAnswer = await ask('New price per package ($): ');
      price = Number(priceAnswer);
      if (!Number.isFinite(price)) {
        console.log('   Please enter a numeric value.');
      }
    }

    records.push({name, price});
  }

  rl.close();
  return records;
}

async function main() {
  const options = parseArgs();

  console.log('🧾 Ingredient Price Updater');
  console.log(options.dryRun ? '   Mode: Preview (no changes applied)\n' : '');

  let records = [];
  if (options.file) {
    try {
      records = await parseFileRecords(options.file);
      console.log(`📂 Loaded ${records.length} records from ${options.file}`);
    } catch (error) {
      console.error(`❌ Failed to parse ${options.file}:`, error.message);
      process.exit(1);
    }
  } else {
    records = await collectInteractiveRecords();
  }

  if (records.length === 0) {
    console.log('⚠️  No records to process.');
    return;
  }

  const results = [];
  for (const record of records) {
    try {
      let ingredient = await searchIngredient(record.name);
      if (!ingredient && record.name !== record.name.toLowerCase()) {
        ingredient = await searchIngredient(record.name.toLowerCase());
      }
      if (!ingredient) {
        console.log(`❌ ${record.name} — not found in Notion`);
        results.push({name: record.name, status: 'missing'});
        continue;
      }

      if (options.dryRun) {
        console.log(`🔍 ${record.name} → ${record.price.toFixed(2)} (preview)`);
        results.push({name: record.name, status: 'preview', price: record.price});
        continue;
      }

      await updateIngredientPrice(ingredient.id, record.price, new Date().toISOString());
      console.log(`✅ ${record.name} updated to $${record.price.toFixed(2)}`);
      results.push({name: record.name, status: 'updated', price: record.price});
    } catch (error) {
      console.error(`❌ ${record.name} — ${error.message}`);
      results.push({name: record.name, status: 'error', error: error.message});
    }
  }

  const summary = {
    updated: results.filter((r) => r.status === 'updated').length,
    previewed: results.filter((r) => r.status === 'preview').length,
    missing: results.filter((r) => r.status === 'missing').length,
    errors: results.filter((r) => r.status === 'error').length,
    total: results.length
  };

  console.log('\n📊 Summary');
  console.log(`   Updated: ${summary.updated}`);
  if (summary.previewed) console.log(`   Previewed: ${summary.previewed}`);
  if (summary.missing) console.log(`   Missing: ${summary.missing}`);
  if (summary.errors) console.log(`   Errors: ${summary.errors}`);

  const logPayload = {
    runAt: new Date().toISOString(),
    options,
    summary,
    results
  };

  const logPath = path.join('logs', `price-updates-${Date.now()}.json`);
  try {
    await mkdir('logs', {recursive: true});
    await writeFile(logPath, JSON.stringify(logPayload, null, 2), 'utf-8');
    console.log(`📝 Log saved to ${logPath}`);
  } catch (error) {
    console.warn('⚠️  Unable to write log file:', error.message);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
