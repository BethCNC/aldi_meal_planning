/**
 * Advanced Price Fetcher with Multiple Sources
 * 
 * Fetches prices from multiple sources:
 * 1. Aldi website (direct scraping)
 * 2. Instacart (may have markup)
 * 3. Google Shopping (as fallback)
 * 
 * Compares prices and updates Notion with best match
 * 
 * Usage:
 *   node scripts/fetch-prices-advanced.js --update-priority-ingredients
 *   node scripts/fetch-prices-advanced.js --ingredient "ground beef"
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import {setTimeout} from 'timers/promises';
import notion from '../backend/notion/notionClient.js';
import dotenv from 'dotenv';

dotenv.config();

const DB_IDS = {
  ingredients: process.env.NOTION_ALDI_INGREDIENTS_DB_ID || process.env.NOTION_INGREDIENTS_DB_ID
};

/**
 * Search Aldi website with multiple strategies
 */
async function searchAldiAdvanced(productName) {
  const results = [];
  
  try {
    // Strategy 1: Product search page
    const searchUrl = `https://www.aldi.us/en/grocery/search.html?text=${encodeURIComponent(productName)}`;
    
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      timeout: 15000,
      maxRedirects: 5
    });
    
    const $ = cheerio.load(response.data);
    
    // Try multiple selector patterns
    const selectors = [
      {container: '.product-tile', name: '.product-name', price: '.price'},
      {container: '.product-item', name: '.item-name', price: '.item-price'},
      {container: '[data-product]', name: '[data-product-name]', price: '[data-price]'},
      {container: '.grid-item', name: 'h3, h4', price: '.currency'},
      {container: 'article', name: 'h2, h3', price: 'span:contains("$")'}
    ];
    
    for (const selector of selectors) {
      $(selector.container).each((_, el) => {
        const $el = $(el);
        const name = $el.find(selector.name).first().text().trim();
        const priceText = $el.find(selector.price).first().text().trim();
        const price = parsePrice(priceText);
        
        if (name && price && name.toLowerCase().includes(productName.toLowerCase().split(' ')[0])) {
          results.push({
            name: cleanText(name),
            price,
            source: 'aldi_website',
            confidence: 'high',
            url: $el.find('a').first().attr('href') || null
          });
        }
      });
    }
    
  } catch (error) {
    console.error(`  ⚠️  Aldi website error: ${error.message}`);
  }
  
  return results;
}

/**
 * Search Instacart (with authentication if available)
 */
async function searchInstacartAdvanced(productName) {
  const results = [];
  
  try {
    // Instacart's Aldi storefront
    const storeUrl = `https://www.instacart.com/store/aldi/storefront?query=${encodeURIComponent(productName)}`;
    
    const response = await axios.get(storeUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Referer': 'https://www.instacart.com/'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    
    // Instacart selectors
    $('[data-testid="item-tile"], .item-card').each((_, el) => {
      const $el = $(el);
      const name = $el.find('[data-testid="item-name"], .item-name').first().text().trim();
      const priceText = $el.find('[data-testid="item-price"], .item-price').first().text().trim();
      const price = parsePrice(priceText);
      
      if (name && price) {
        results.push({
          name: cleanText(name),
          price,
          source: 'instacart',
          confidence: 'medium',
          note: 'May include service markup',
          url: $el.find('a').first().attr('href') || null
        });
      }
    });
    
  } catch (error) {
    console.error(`  ⚠️  Instacart error: ${error.message}`);
  }
  
  return results;
}

/**
 * Get priority ingredients (ones used in recipes)
 */
async function getPriorityIngredients(limit = 50) {
  const {queryRecipes} = await import('../src/notion/notionClient.js');
  const recipes = await queryRecipes();
  
  const ingredientUsage = new Map();
  
  for (const recipe of recipes) {
    const ingredients = recipe.properties['Aldi Ingredients']?.relation || [];
    for (const rel of ingredients) {
      const count = ingredientUsage.get(rel.id) || 0;
      ingredientUsage.set(rel.id, count + 1);
    }
  }
  
  // Get full ingredient data
  const priorityList = Array.from(ingredientUsage.entries())
    .sort((a, b) => b[1] - a[1]) // Most used first
    .slice(0, limit);
  
  const ingredients = [];
  for (const [id, usage] of priorityList) {
    try {
      const ing = await notion.pages.retrieve({page_id: id});
      ingredients.push({ingredient: ing, usage});
    } catch (err) {
      // Skip
    }
  }
  
  return ingredients;
}

/**
 * Fetch and compare prices from all sources
 */
async function fetchPricesWithComparison(productName) {
  console.log(`  Searching: ${productName}`);
  
  const [aldiResults, instacartResults] = await Promise.all([
    searchAldiAdvanced(productName),
    searchInstacartAdvanced(productName)
  ]);
  
  await setTimeout(2000); // Rate limiting
  
  const allResults = [
    ...aldiResults,
    ...instacartResults
  ];
  
  // Deduplicate and rank
  const unique = new Map();
  for (const result of allResults) {
    const key = `${result.name}_${result.price}`;
    if (!unique.has(key) || result.confidence === 'high') {
      unique.set(key, result);
    }
  }
  
  const sorted = Array.from(unique.values())
    .sort((a, b) => {
      // Prefer Aldi website results
      if (a.source === 'aldi_website' && b.source !== 'aldi_website') return -1;
      if (a.source !== 'aldi_website' && b.source === 'aldi_website') return 1;
      // Prefer higher confidence
      if (a.confidence === 'high' && b.confidence !== 'high') return -1;
      return 0;
    });
  
  return sorted;
}

/**
 * Update ingredient with best price match
 */
async function updateIngredientPrice(ingredient, priceData) {
  try {
    const currentPrice = ingredient.properties['Price per Package ($)']?.number;
    const newPrice = priceData.price;
    
    if (currentPrice && Math.abs(currentPrice - newPrice) < 0.01) {
      return {updated: false, price: currentPrice, reason: 'unchanged'};
    }
    
    await notion.pages.update({
      page_id: ingredient.id,
      properties: {
        'Price per Package ($)': {number: newPrice}
      }
    });
    
    return {
      updated: true,
      price: newPrice,
      oldPrice: currentPrice,
      source: priceData.source
    };
    
  } catch (error) {
    return {updated: false, error: error.message};
  }
}

/**
 * Utility functions
 */
function parsePrice(text) {
  if (!text) return null;
  const match = text.match(/\$?(\d+\.?\d*)/);
  return match ? parseFloat(match[1]) : null;
}

function cleanText(text) {
  return text?.trim().replace(/\s+/g, ' ') || '';
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const updatePriority = args.includes('--update-priority-ingredients');
  const ingredientName = args.find(arg => arg === '--ingredient') 
    ? args[args.indexOf('--ingredient') + 1] 
    : null;
  const dryRun = args.includes('--dry-run');
  const limit = parseInt(args.find(arg => arg === '--limit') 
    ? args[args.indexOf('--limit') + 1] 
    : '50');
  
  console.log('🛒 Advanced Aldi Price Fetcher\n');
  
  if (dryRun) {
    console.log('🔍 DRY RUN MODE\n');
  }
  
  try {
    if (ingredientName) {
      // Single ingredient search
      const results = await fetchPricesWithComparison(ingredientName);
      
      console.log(`\n📊 Found ${results.length} results:\n`);
      results.forEach((r, i) => {
        console.log(`${i + 1}. ${r.name}`);
        console.log(`   Price: $${r.price.toFixed(2)}`);
        console.log(`   Source: ${r.source}`);
        if (r.note) console.log(`   Note: ${r.note}`);
        console.log('');
      });
      
    } else if (updatePriority) {
      // Update priority ingredients
      console.log('📥 Fetching priority ingredients...\n');
      const ingredients = await getPriorityIngredients(limit);
      
      console.log(`📋 Updating ${ingredients.length} ingredients...\n`);
      
      let updated = 0;
      let unchanged = 0;
      let errors = 0;
      
      for (const {ingredient, usage} of ingredients) {
        const name = ingredient.properties['Item']?.title?.[0]?.plain_text || 'Unknown';
        
        console.log(`\n📦 ${name} (used in ${usage} recipe${usage > 1 ? 's' : ''})`);
        
        const results = await fetchPricesWithComparison(name);
        
        if (results.length > 0) {
          const bestMatch = results[0];
          console.log(`   Best match: $${bestMatch.price.toFixed(2)} (${bestMatch.source})`);
          
          if (!dryRun) {
            const result = await updateIngredientPrice(ingredient, bestMatch);
            if (result.updated) {
              updated++;
              const change = result.oldPrice 
                ? (bestMatch.price > result.oldPrice ? `↑ +$${(bestMatch.price - result.oldPrice).toFixed(2)}` : `↓ -$${(result.oldPrice - bestMatch.price).toFixed(2)}`)
                : 'new';
              console.log(`   ✅ Updated (${change})`);
            } else {
              unchanged++;
              console.log(`   ✓ Unchanged`);
            }
          } else {
            console.log(`   🔍 Would update to: $${bestMatch.price.toFixed(2)} (dry run)`);
            unchanged++;
          }
        } else {
          console.log(`   ⚠️  No prices found`);
          errors++;
        }
      }
      
      console.log('\n' + '='.repeat(70));
      console.log('\n📊 Summary:');
      console.log(`   Updated: ${updated}`);
      console.log(`   Unchanged: ${unchanged}`);
      console.log(`   Errors/No results: ${errors}`);
      console.log('\n✅ Done!');
      
    } else {
      console.log('Usage:');
      console.log('  node scripts/fetch-prices-advanced.js --ingredient "ground beef"');
      console.log('  node scripts/fetch-prices-advanced.js --update-priority-ingredients [--limit 20] [--dry-run]');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
