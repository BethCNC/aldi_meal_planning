import scrapePrices from '../scrapers/pricesScraper.js';
import { syncPrices } from '../notion/syncToNotion.js';
import { log } from '../utils/scraper.js';

export async function runPriceUpdate() {
  log('Starting scheduled price update...');
  
  try {
    log('Step 1: Scraping prices...');
    await scrapePrices();
    
    log('Step 2: Syncing prices (Supabase/Notion)...');
    await syncPrices();
    
    // In future: Recalculate all recipe costs here
    
    log('Price update complete.', 'success');
  } catch (error) {
    log(`Price update failed: ${error.message}`, 'error');
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runPriceUpdate();
}

