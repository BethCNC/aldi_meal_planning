import {writeFile} from 'fs/promises';
import {fetchHTML, loadHTML, delay, log, parsePrice} from '../utils/scraper.js';
import {PRICE_SOURCES} from './sources.js';

async function scrapePrices() {
  const allPrices = [];
  
  for (const source of PRICE_SOURCES) {
    log(`Scraping ${source.name}...`);
    
    try {
      const html = await fetchHTML(source.url);
      const $ = loadHTML(html);
      const prices = [];
      
      $(source.selectors.products).each((_, element) => {
        const $el = $(element);
        const name = $el.find(source.selectors.name).text().trim();
        const priceText = $el.find(source.selectors.price).text().trim();
        const unit = $el.find(source.selectors.unit)?.text().trim() || '';
        
        if (name && priceText) {
          const price = parsePrice(priceText);
          if (price) {
            prices.push({
              item: name,
              price,
              unit,
              source: source.name,
              url: source.url,
              scrapedAt: new Date().toISOString()
            });
          }
        }
      });
      
      log(`Found ${prices.length} prices from ${source.name}`, 'success');
      allPrices.push(...prices);
      await delay();
      
    } catch (error) {
      log(`Failed to scrape ${source.name}: ${error.message}`, 'error');
    }
  }
  
  const outputPath = `data/prices/aldi-prices-${Date.now()}.json`;
  await writeFile(outputPath, JSON.stringify(allPrices, null, 2));
  log(`Saved ${allPrices.length} prices to ${outputPath}`, 'success');
  
  return allPrices;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  scrapePrices()
    .then(() => log('Price scraping complete', 'success'))
    .catch((error) => log(`Price scraping failed: ${error.message}`, 'error'));
}

export default scrapePrices;
