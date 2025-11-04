/**
 * Populate Package Data Helper
 * 
 * Helps fill in missing Package Size and Package Unit
 * by parsing ingredient names or prompting for data
 * 
 * Usage:
 *   node scripts/populate-package-data.js                    # Analyze missing data
 *   node scripts/populate-package-data.js --auto              # Try to auto-fill from names
 *   node scripts/populate-package-data.js --update           # Actually update Notion
 */

import notion from '../src/notion/notionClient.js';
import dotenv from 'dotenv';

dotenv.config();

const DB_IDS = {
  ingredients: process.env.NOTION_ALDI_INGREDIENTS_DB_ID || process.env.NOTION_INGREDIENTS_DB_ID
};

/**
 * Extract package size from ingredient name
 * Examples: "rice, 3 lbs" → 3, "32 oz chicken broth" → 32
 */
function extractPackageSizeFromName(name) {
  const patterns = [
    /(\d+\.?\d*)\s*(lb|lbs|oz|g|kg|ml|l|each|count|ct)\b/i,
    /\((\d+\.?\d*)\s*(lb|lbs|oz|g|kg|ml|l|each|count|ct)\)/i,
    /\b(\d+)\s*(count|ct|pk|pack)\b/i
  ];
  
  for (const pattern of patterns) {
    const match = name.match(pattern);
    if (match) {
      return {
        size: parseFloat(match[1]),
        unit: match[2].toLowerCase()
      };
    }
  }
  
  return null;
}

/**
 * Normalize unit from extracted text
 */
function normalizeExtractedUnit(unit) {
  const unitMap = {
    'lb': 'lb',
    'lbs': 'lb',
    'oz': 'oz',
    'g': 'g',
    'kg': 'kg',
    'ml': 'ml',
    'l': 'l',
    'each': 'each',
    'count': 'each',
    'ct': 'each',
    'pk': 'each',
    'pack': 'each'
  };
  
  return unitMap[unit?.toLowerCase()] || null;
}

/**
 * Infer package size/unit from ingredient name and price
 */
function inferPackageData(ingredient) {
  const name = ingredient.properties['Item']?.title?.[0]?.plain_text || '';
  const price = ingredient.properties['Price per Package ($)']?.number;
  
  // Try to extract from name
  const extracted = extractPackageSizeFromName(name);
  
  if (extracted) {
    const normalizedUnit = normalizeExtractedUnit(extracted.unit);
    return {
      packageSize: extracted.size,
      packageUnit: normalizedUnit,
      source: 'name',
      confidence: 'high'
    };
  }
  
  // Try to infer from common patterns
  const nameLower = name.toLowerCase();
  
  // Common package sizes
  const commonPatterns = [
    {pattern: /bread|buns|rolls/i, size: 1, unit: 'each', reason: 'bread items often sold individually'},
    {pattern: /dozen|12/i, size: 12, unit: 'each', reason: 'common dozen packaging'},
    {pattern: /4\s*pack|4pk/i, size: 4, unit: 'each', reason: '4-pack pattern'},
    {pattern: /6\s*pack|6pk/i, size: 6, unit: 'each', reason: '6-pack pattern'},
    {pattern: /cheese/i, size: 8, unit: 'oz', reason: 'common cheese size'},
    {pattern: /broth|stock/i, size: 32, unit: 'oz', reason: 'common broth size'},
    {pattern: /milk/i, size: 1, unit: 'l', reason: 'common milk size'},
  ];
  
  for (const pattern of commonPatterns) {
    if (nameLower.match(pattern.pattern)) {
      return {
        packageSize: pattern.size,
        packageUnit: pattern.unit,
        source: 'pattern',
        confidence: 'medium',
        reason: pattern.reason
      };
    }
  }
  
  return null;
}

/**
 * Suggest base unit based on package unit
 */
function suggestBaseUnit(packageUnit) {
  if (!packageUnit) return null;
  
  const unit = packageUnit.toLowerCase();
  
  // Weight units
  if (['lb', 'lbs', 'oz', 'g', 'kg'].includes(unit)) {
    return 'g'; // Base unit for weight
  }
  
  // Volume units
  if (['ml', 'l', 'cup', 'cups', 'fl oz'].includes(unit)) {
    return 'ml'; // Base unit for volume
  }
  
  // Count units
  if (['each', 'count', 'ct'].includes(unit)) {
    return 'each'; // Base unit for count
  }
  
  return null;
}

/**
 * Get all ingredients missing package data
 */
async function getIngredientsNeedingData() {
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
  
  // Filter for ones with price but missing package info
  const needingData = allIngredients.filter(ing => {
    const price = ing.properties['Price per Package ($)']?.number;
    const packageSize = ing.properties['Package Size']?.number;
    const packageUnit = ing.properties['Package Unit']?.select?.name;
    
    return price && price > 0 && (!packageSize || !packageUnit);
  });
  
  return needingData;
}

/**
 * Update ingredient with package data
 */
async function updateIngredientPackageData(ingredientId, packageSize, packageUnit, baseUnit, dryRun = false) {
  if (dryRun) {
    return true;
  }
  
  try {
    const properties = {
      'Package Size': {number: packageSize}
    };
    
    if (packageUnit) {
      properties['Package Unit'] = {select: {name: packageUnit}};
    }
    
    if (baseUnit) {
      properties['Base Unit'] = {select: {name: baseUnit}};
    }
    
    await notion.pages.update({
      page_id: ingredientId,
      properties
    });
    
    return true;
  } catch (error) {
    console.error(`  ❌ Error updating: ${error.message}`);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || !args.includes('--update');
  const autoFill = args.includes('--auto');
  const updateNotion = args.includes('--update') && !dryRun;
  
  console.log('📦 Package Data Populator\n');
  
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }
  
  try {
    console.log('📥 Analyzing ingredients...\n');
    const ingredients = await getIngredientsNeedingData();
    
    console.log(`✅ Found ${ingredients.length} ingredients with price but missing package data\n`);
    console.log('='.repeat(70));
    
    if (ingredients.length === 0) {
      console.log('✅ All ingredients with prices have complete package data!');
      return;
    }
    
    const results = {
      autoFilled: 0,
      needsManual: 0,
      errors: 0,
      suggestions: []
    };
    
    // Show first 20
    const toProcess = ingredients.slice(0, 20);
    
    console.log('\n📋 Ingredients Needing Data:\n');
    
    for (const ingredient of toProcess) {
      const name = ingredient.properties['Item']?.title?.[0]?.plain_text || 'Unknown';
      const price = ingredient.properties['Price per Package ($)']?.number;
      const currentSize = ingredient.properties['Package Size']?.number;
      const currentUnit = ingredient.properties['Package Unit']?.select?.name;
      
      console.log(`📦 ${name}`);
      console.log(`   Price: $${price?.toFixed(2) || 'N/A'}`);
      console.log(`   Current: ${currentSize || 'N/A'} ${currentUnit || ''}`);
      
      // Try to infer
      if (autoFill) {
        const inferred = inferPackageData(ingredient);
        
        if (inferred) {
          const suggestedBaseUnit = suggestBaseUnit(inferred.packageUnit);
          
          console.log(`   💡 Auto-suggested:`);
          console.log(`      Package Size: ${inferred.packageSize}`);
          console.log(`      Package Unit: ${inferred.packageUnit}`);
          if (suggestedBaseUnit) {
            console.log(`      Base Unit: ${suggestedBaseUnit}`);
          }
          console.log(`      Confidence: ${inferred.confidence}`);
          if (inferred.reason) {
            console.log(`      Reason: ${inferred.reason}`);
          }
          
          if (updateNotion && inferred.confidence === 'high') {
            const updated = await updateIngredientPackageData(
              ingredient.id,
              inferred.packageSize,
              inferred.packageUnit,
              suggestedBaseUnit,
              dryRun
            );
            
            if (updated) {
              console.log(`      ✅ Updated in Notion`);
              results.autoFilled++;
            } else {
              results.errors++;
            }
          } else {
            results.suggestions.push({
              name,
              ...inferred,
              baseUnit: suggestedBaseUnit
            });
            results.needsManual++;
          }
        } else {
          console.log(`   ⚠️  Could not auto-detect - needs manual entry`);
          results.needsManual++;
        }
      } else {
        console.log(`   ⚠️  Missing package data`);
        results.needsManual++;
      }
      
      console.log('');
    }
    
    if (ingredients.length > 20) {
      console.log(`   ... and ${ingredients.length - 20} more\n`);
    }
    
    console.log('='.repeat(70));
    console.log('\n📊 Summary:\n');
    console.log(`   Analyzed: ${toProcess.length}`);
    if (autoFill) {
      console.log(`   Auto-filled: ${results.autoFilled}`);
      console.log(`   Needs manual: ${results.needsManual}`);
      console.log(`   Errors: ${results.errors}`);
      
      if (results.suggestions.length > 0 && dryRun) {
        console.log(`\n💡 Suggestions (use --update to apply high-confidence ones):`);
        results.suggestions.forEach(s => {
          console.log(`   ${s.name}: ${s.packageSize} ${s.packageUnit} (${s.confidence})`);
        });
      }
    } else {
      console.log(`   Run with --auto to see auto-fill suggestions`);
    }
    
    console.log('\n✅ Analysis complete!');
    console.log('\n💡 Next steps:');
    console.log('   1. Review suggestions above');
    console.log('   2. Run with --auto --update to auto-fill high-confidence ones');
    console.log('   3. Manually fill in the rest in Notion');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
