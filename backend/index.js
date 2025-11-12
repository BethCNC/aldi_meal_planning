import scrapePrices from './scrapers/pricesScraper.js';
import scrapeRecipes from './scrapers/recipesScraper.js';
import {syncAll} from './notion/syncToNotion.js';
import {log} from './utils/scraper.js';

async function runPipeline() {
  log('Starting Aldi meal planning data pipeline...');
  
  try {
    log('Step 1: Scraping prices...');
    await scrapePrices();
    
    log('Step 2: Scraping recipes...');
    await scrapeRecipes();
    
    log('Step 3: Syncing to Notion...');
    await syncAll();
    
    log('Pipeline complete!', 'success');
  } catch (error) {
    log(`Pipeline failed: ${error.message}`, 'error');
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runPipeline();
}

export default runPipeline;
