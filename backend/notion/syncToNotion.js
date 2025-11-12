import {readdir, readFile} from 'fs/promises';
import {syncIngredients} from './notionClient.js';
import {log} from '../utils/scraper.js';

async function getLatestFile(directory) {
  const files = await readdir(directory);
  const jsonFiles = files.filter((f) => f.endsWith('.json')).sort().reverse();
  return jsonFiles[0] ? `${directory}/${jsonFiles[0]}` : null;
}

async function syncPrices() {
  log('Syncing prices to Notion...');
  
  const latestFile = await getLatestFile('data/prices');
  if (!latestFile) {
    log('No price data found', 'error');
    return;
  }
  
  const data = JSON.parse(await readFile(latestFile, 'utf-8'));
  log(`Loading ${data.length} prices from ${latestFile}`);
  
  const results = await syncIngredients(data);
  log(`Created: ${results.created}, Updated: ${results.updated}, Errors: ${results.errors}`, 'success');
}

export async function syncAll() {
  await syncPrices();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  syncAll()
    .then(() => log('Notion sync complete', 'success'))
    .catch((error) => log(`Sync failed: ${error.message}`, 'error'));
}

export {syncPrices};
