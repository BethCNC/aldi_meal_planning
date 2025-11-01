import {writeFile} from 'fs/promises';
import {fetchHTML, loadHTML, delay, log, cleanText} from '../utils/scraper.js';
import {parseIngredient, extractTotalCost, extractFamilySize, extractMealCount, normalizeURL} from '../utils/parser.js';
import {RECIPE_SOURCES} from './sources.js';

async function scrapeMealPlan(source, url) {
  try {
    const html = await fetchHTML(url);
    const $ = loadHTML(html);
    
    const title = cleanText($(source.selectors.title).first().text());
    const bodyText = $('body').text();
    
    const totalCost = extractTotalCost(bodyText);
    const familySize = extractFamilySize(bodyText);
    const mealCount = extractMealCount(bodyText);
    
    const ingredients = [];
    $(source.selectors.ingredients).each((_, el) => {
      const line = cleanText($(el).text());
      if (line) ingredients.push(parseIngredient(line));
    });
    
    const recipes = [];
    $(source.selectors.recipes).each((_, el) => {
      const recipeTitle = cleanText($(el).text());
      if (recipeTitle && recipeTitle.length > 3) recipes.push(recipeTitle);
    });
    
    return {
      title,
      url: normalizeURL(url),
      source: source.name,
      totalCost,
      familySize,
      mealCount,
      ingredients,
      recipes: recipes.slice(0, 15),
      scrapedAt: new Date().toISOString()
    };
    
  } catch (error) {
    log(`Failed to scrape ${url}: ${error.message}`, 'error');
    return null;
  }
}

async function scrapeRecipes() {
  const allMealPlans = [];
  
  for (const source of RECIPE_SOURCES) {
    log(`Scraping ${source.name}...`);
    
    for (const url of source.mealPlanUrls) {
      const mealPlan = await scrapeMealPlan(source, url);
      
      if (mealPlan) {
        allMealPlans.push(mealPlan);
        log(`✓ Scraped: ${mealPlan.title}`, 'success');
      }
      
      await delay();
    }
  }
  
  const outputPath = `data/recipes/aldi-recipes-${Date.now()}.json`;
  await writeFile(outputPath, JSON.stringify(allMealPlans, null, 2));
  log(`Saved ${allMealPlans.length} meal plans to ${outputPath}`, 'success');
  
  return allMealPlans;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  scrapeRecipes()
    .then(() => log('Recipe scraping complete', 'success'))
    .catch((error) => log(`Recipe scraping failed: ${error.message}`, 'error'));
}

export default scrapeRecipes;
