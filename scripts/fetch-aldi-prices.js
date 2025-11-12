/**
 * Fetch Current Aldi Prices
 * 
 * Scrapes prices from:
 * 1. Aldi's website (aldi.us) - product search/browse
 * 2. Instacart (optional, may have markup)
 * 
 * Updates Notion ingredients with current prices
 * 
 * Usage:
 *   node scripts/fetch-aldi-prices.js --search "ground beef"
 *   node scripts/fetch-aldi-prices.js --update-all              # Update all ingredients
 *   node scripts/fetch-aldi-prices.js --ingredient-id <id>      # Update one ingredient
 *   node scripts/fetch-aldi-prices.js --instacart               # Also check Instacart
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import {setTimeout} from 'timers/promises';
import notion from '../backend/notion/notionClient.js';
import {searchIngredient, updateIngredientPrice} from '../backend/notion/notionClient.js';
import dotenv from 'dotenv';

dotenv.config();

const DB_IDS = {
  ingredients: process.env.NOTION_ALDI_INGREDIENTS_DB_ID || process.env.NOTION_INGREDIENTS_DB_ID
};

const DELAY_MS = 2000; // Be respectful to Aldi's servers

/**
 * Search Aldi website for a product
 * Aldi uses a search API endpoint
 */
async function searchAldiWebsite(productName) {
  try {
    // Aldi's search endpoint (may need to be updated based on actual site structure)
    const searchUrl = `https://www.aldi.us/en/grocery/search.html?text=${encodeURIComponent(productName)}`;
    
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 15000,
      validateStatus: (status) => status < 500 // Accept redirects
    });
    
    const $ = cheerio.load(response.data);
    
    // Try different selectors based on Aldi's actual HTML structure
    // These may need to be adjusted
    const products = [];
    
    // Common patterns for Aldi product listings
    $('.product-tile, .product-item, [data-product-id]').each((_, element) => {
      const $el = $(element);
      
      // Try various selectors for name and price
      const name = $el.find('.product-name, .product-title, h3, h4, [data-product-name]').first().text().trim() ||
                   $el.attr('data-product-name') ||
                   $el.find('a').first().text().trim();
      
      const priceText = $el.find('.price, .product-price, [data-price]').first().text().trim() ||
                       $el.attr('data-price') ||
                       $el.find('.currency-value').first().text().trim();
      
      const price = parsePrice(priceText);
      
      if (name && price) {
        products.push({
          name: cleanText(name),
          price,
          priceText,
          source: 'aldi_website',
          url: $el.find('a').first().attr('href') || null
        });
      }
    });
    
    // If no products found with standard selectors, try JSON-LD or script tags
    if (products.length === 0) {
      const jsonLd = $('script[type="application/ld+json"]').first().html();
      if (jsonLd) {
        try {
          const data = JSON.parse(jsonLd);
          // Parse structured data if available
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
    
    return products;
    
  } catch (error) {
    console.error(`Error searching Aldi website: ${error.message}`);
    return [];
  }
}

/**
 * Search Instacart for Aldi products
 * Note: Prices may be marked up
 */
async function searchInstacart(productName, storeLocation = null) {
  try {
    // Instacart search URL
    // This is simplified - actual implementation may need authentication
    const storeId = 'aldi_us'; // Aldi's Instacart store ID
    const searchUrl = `https://www.instacart.com/store/aldi/storefront?query=${encodeURIComponent(productName)}`;
    
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Referer': 'https://www.instacart.com/'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    
    const products = [];
    
    // Instacart product selectors (may need adjustment)
    $('[data-testid="item-tile"], .item-tile, .product-tile').each((_, element) => {
      const $el = $(element);
      
      const name = $el.find('[data-testid="item-name"], .item-name').first().text().trim();
      const priceText = $el.find('[data-testid="item-price"], .item-price').first().text().trim();
      const price = parsePrice(priceText);
      
      if (name && price) {
        products.push({
          name: cleanText(name),
          price,
          priceText,
          source: 'instacart',
          note: 'May include markup compared to in-store',
          url: $el.find('a').first().attr('href') || null
        });
      }
    });
    
    return products;
    
  } catch (error) {
    console.error(`Error searching Instacart: ${error.message}`);
    return [];
  }
}

/**
 * Fetch price for a specific ingredient from Notion
 */
async function fetchPriceForIngredient(ingredient, useInstacart = false) {
  const itemName = ingredient.properties['Item']?.title?.[0]?.plain_text || 'Unknown';
  
  console.log(`\n🔍 Searching for: ${itemName}`);
  
  // Search Aldi website
  console.log('   Checking Aldi website...');
  const aldiResults = await searchAldiWebsite(itemName);
  await setTimeout(DELAY_MS);
  
  let instacartResults = [];
  if (useInstacart) {
    console.log('   Checking Instacart...');
    instacartResults = await searchInstacart(itemName);
    await setTimeout(DELAY_MS);
  }
  
  // Combine and rank results
  const allResults = [
    ...aldiResults.map(r => ({...r, priority: 1})),
    ...instacartResults.map(r => ({...r, priority: 2}))
  ];
  
  if (allResults.length === 0) {
    console.log(`   ⚠️  No prices found`);
    return null;
  }
  
  // Show results
  console.log(`   Found ${allResults.length} result(s):`);
  allResults.forEach((result, i) => {
    const source = result.source === 'aldi_website' ? 'Aldi' : 'Instacart';
    const note = result.note ? ` (${result.note})` : '';
    console.log(`     ${i + 1}. ${result.name}: $${result.price.toFixed(2)} (${source})${note}`);
  });
  
  // Return best match (Aldi website results preferred)
  const bestMatch = allResults.sort((a, b) => a.priority - b.priority)[0];
  
  return {
    name: bestMatch.name,
    price: bestMatch.price,
    source: bestMatch.source,
    allResults
  };
}

/**
 * Update ingredient price in Notion
 */
async function updateIngredientWithPrice(ingredient, priceData) {
  try {
    const itemName = ingredient.properties['Item']?.title?.[0]?.plain_text || 'Unknown';
    const currentPrice = ingredient.properties['Price per Package ($)']?.number;
    
    if (currentPrice && Math.abs(currentPrice - priceData.price) < 0.01) {
      console.log(`   ✓ Price unchanged: $${priceData.price.toFixed(2)}`);
      return false;
    }
    
    // Update price
    await notion.pages.update({
      page_id: ingredient.id,
      properties: {
        'Price per Package ($)': {number: priceData.price}
      }
    });
    
    const change = currentPrice 
      ? (priceData.price > currentPrice ? `↑ +$${(priceData.price - currentPrice).toFixed(2)}` : `↓ -$${(currentPrice - priceData.price).toFixed(2)}`)
      : 'new';
    
    console.log(`   ✅ Updated: $${currentPrice?.toFixed(2) || 'N/A'} → $${priceData.price.toFixed(2)} (${change})`);
    
    return true;
    
  } catch (error) {
    console.error(`   ❌ Error updating: ${error.message}`);
    return false;
  }
}

/**
 * Parse price from text
 */
function parsePrice(text) {
  if (!text) return null;
  
  // Try different patterns
  const patterns = [
    /\$(\d+\.?\d*)/,           // $4.99
    /(\d+\.?\d*)\s*\$/,        // 4.99$
    /price[:\s]+(\d+\.?\d*)/i, // price: 4.99
    /(\d+\.?\d*)/              // just number
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const price = parseFloat(match[1]);
      if (price > 0 && price < 1000) { // Sanity check
        return price;
      }
    }
  }
  
  return null;
}

/**
 * Clean text
 */
function cleanText(text) {
  return text?.trim().replace(/\s+/g, ' ') || '';
}

/**
 * Get all ingredients from Notion
 */
async function getAllIngredients() {
  const allIngredients = [];
  let cursor = undefined;
  
  do {
    const response = await notion.databases.query({
      database_id: DB_IDS.ingredients,
      start_cursor: cursor,
      page_size: 100
    });
    
    allIngredients.push(...response.results);
    cursor = response.next_cursor;
  } while (cursor);
  
  return allIngredients;
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    search: null,
    updateAll: false,
    ingredientId: null,
    ingredientName: null,
    useInstacart: false,
    dryRun: false,
    limit: null
  };
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--search' && args[i + 1]) {
      options.search = args[i + 1];
      i++;
    } else if (args[i] === '--update-all') {
      options.updateAll = true;
    } else if (args[i] === '--ingredient-id' && args[i + 1]) {
      options.ingredientId = args[i + 1];
      i++;
    } else if (args[i] === '--ingredient' && args[i + 1]) {
      options.ingredientName = args[i + 1];
      i++;
    } else if (args[i] === '--instacart') {
      options.useInstacart = true;
    } else if (args[i] === '--dry-run') {
      options.dryRun = true;
    } else if (args[i] === '--limit' && args[i + 1]) {
      options.limit = parseInt(args[i + 1]);
      i++;
    }
  }
  
  return options;
}

/**
 * Main function
 */
async function main() {
  const options = parseArgs();
  
  console.log('🛒 Aldi Price Fetcher\n');
  
  if (options.dryRun) {
    console.log('🔍 DRY RUN MODE - No updates will be made\n');
  }
  
  try {
    // Single search
    if (options.search) {
      console.log(`Searching for: ${options.search}\n`);
      
      const aldiResults = await searchAldiWebsite(options.search);
      console.log(`\nAldi Results (${aldiResults.length}):`);
      aldiResults.forEach(r => {
        console.log(`  ${r.name}: $${r.price.toFixed(2)}`);
      });
      
      if (options.useInstacart) {
        await setTimeout(DELAY_MS);
        const instacartResults = await searchInstacart(options.search);
        console.log(`\nInstacart Results (${instacartResults.length}):`);
        instacartResults.forEach(r => {
          console.log(`  ${r.name}: $${r.price.toFixed(2)} ${r.note ? '(' + r.note + ')' : ''}`);
        });
      }
      
      return;
    }
    
    // Update specific ingredient
    if (options.ingredientId || options.ingredientName) {
      let ingredient;
      
      if (options.ingredientId) {
        ingredient = await notion.pages.retrieve({page_id: options.ingredientId});
      } else {
        const found = await searchIngredient(options.ingredientName);
        if (!found) {
          console.log(`❌ Ingredient "${options.ingredientName}" not found`);
          return;
        }
        ingredient = found;
      }
      
      const priceData = await fetchPriceForIngredient(ingredient, options.useInstacart);
      
      if (priceData && !options.dryRun) {
        await updateIngredientWithPrice(ingredient, priceData);
      } else if (priceData) {
        console.log(`   🔍 Would update to: $${priceData.price.toFixed(2)} (dry run)`);
      }
      
      return;
    }
    
    // Update all ingredients
    if (options.updateAll) {
      console.log('📥 Fetching all ingredients from Notion...\n');
      const ingredients = await getAllIngredients();
      
      const limit = options.limit || ingredients.length;
      const toProcess = ingredients.slice(0, limit);
      
      console.log(`📋 Processing ${toProcess.length} ingredients...\n`);
      
      let updated = 0;
      let unchanged = 0;
      let errors = 0;
      
      for (const ingredient of toProcess) {
        try {
          const priceData = await fetchPriceForIngredient(ingredient, options.useInstacart);
          
          if (priceData) {
            if (!options.dryRun) {
              const wasUpdated = await updateIngredientWithPrice(ingredient, priceData);
              if (wasUpdated) updated++;
              else unchanged++;
            } else {
              unchanged++;
            }
          } else {
            errors++;
          }
          
          // Rate limiting
          await setTimeout(DELAY_MS);
          
        } catch (error) {
          console.error(`   ❌ Error: ${error.message}`);
          errors++;
        }
      }
      
      console.log('\n' + '='.repeat(70));
      console.log('\n📊 Summary:');
      console.log(`   Processed: ${toProcess.length}`);
      console.log(`   Updated: ${updated}`);
      console.log(`   Unchanged: ${unchanged}`);
      console.log(`   Errors/No results: ${errors}`);
      console.log('\n✅ Done!');
      
      return;
    }
    
    // No action specified
    console.log('Usage:');
    console.log('  node scripts/fetch-aldi-prices.js --search "ground beef"');
    console.log('  node scripts/fetch-aldi-prices.js --ingredient-name "ground beef" [--instacart]');
    console.log('  node scripts/fetch-aldi-prices.js --update-all [--limit 10] [--instacart]');
    console.log('  node scripts/fetch-aldi-prices.js --dry-run --update-all --limit 5');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
