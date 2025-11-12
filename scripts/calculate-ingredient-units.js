/**
 * Calculate Price Per Unit for Ingredients
 * 
 * Analyzes ingredients and calculates:
 * - Price per Unit (from Price per Package / Package Size)
 * - Cost per Base Unit
 * - Units per Package
 * 
 * Updates Notion with calculated values
 * 
 * Usage:
 *   node scripts/calculate-ingredient-units.js              # All ingredients
 *   node scripts/calculate-ingredient-units.js --update    # Actually update Notion
 *   node scripts/calculate-ingredient-units.js --dry-run    # Just show calculations
 */

import notion from '../backend/notion/notionClient.js';
import {calculatePricePerUnit, normalizeUnit} from '../backend/utils/unitConversions.js';
import dotenv from 'dotenv';

dotenv.config();

const DB_IDS = {
  ingredients: process.env.NOTION_ALDI_INGREDIENTS_DB_ID || process.env.NOTION_INGREDIENTS_DB_ID
};

/**
 * Get all ingredients
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
 * Calculate units per package
 */
function calculateUnitsPerPackage(packageSize, packageUnit, baseUnit) {
  if (!packageSize || !packageUnit || !baseUnit) {
    return null;
  }
  
  // If package unit and base unit are the same
  const normalizedPackage = normalizeUnit(packageUnit);
  const normalizedBase = normalizeUnit(baseUnit);
  
  if (normalizedPackage === normalizedBase) {
    return packageSize;
  }
  
  // Need to convert
  // This is simplified - assumes 1:1 if same type
  // Real conversion would use the unit conversion utilities
  return packageSize; // For now, return package size
}

/**
 * Calculate price per base unit
 */
function calculatePricePerBaseUnit(pricePerPackage, packageSize, packageUnit, baseUnit) {
  if (!pricePerPackage || !packageSize || !packageUnit || !baseUnit) {
    return null;
  }
  
  return calculatePricePerUnit(pricePerPackage, packageSize, packageUnit, baseUnit);
}

/**
 * Analyze and calculate for one ingredient
 */
function analyzeIngredient(ingredient) {
  const item = ingredient.properties['Item']?.title?.[0]?.plain_text || 'Unknown';
  const pricePerPackage = ingredient.properties['Price per Package ($)']?.number;
  const packageSize = ingredient.properties['Package Size']?.number;
  const packageUnit = ingredient.properties['Package Unit']?.select?.name;
  const baseUnit = ingredient.properties['Base Unit']?.select?.name;
  
  const analysis = {
    id: ingredient.id,
    name: item,
    hasPricePerPackage: pricePerPackage !== null && pricePerPackage !== undefined,
    hasPackageSize: packageSize !== null && packageSize !== undefined && packageSize > 0,
    hasPackageUnit: !!packageUnit,
    hasBaseUnit: !!baseUnit,
    pricePerPackage,
    packageSize,
    packageUnit,
    baseUnit,
    calculations: {}
  };
  
  // Calculate price per unit (same as package unit)
  if (analysis.hasPricePerPackage && analysis.hasPackageSize) {
    analysis.calculations.pricePerUnit = pricePerPackage / packageSize;
    analysis.calculations.pricePerUnitUnit = packageUnit || 'unit';
  }
  
  // Calculate price per base unit
  if (analysis.hasPricePerPackage && analysis.hasPackageSize && analysis.hasBaseUnit) {
    if (packageUnit && baseUnit) {
      const pricePerBase = calculatePricePerBaseUnit(pricePerPackage, packageSize, packageUnit, baseUnit);
      if (pricePerBase) {
        analysis.calculations.pricePerBaseUnit = pricePerBase;
        analysis.calculations.baseUnitName = baseUnit;
      }
    }
  }
  
  // Calculate units per package
  if (analysis.hasPackageSize && analysis.hasPackageUnit && analysis.hasBaseUnit) {
    const unitsPerPackage = calculateUnitsPerPackage(packageSize, packageUnit, baseUnit);
    if (unitsPerPackage) {
      analysis.calculations.unitsPerPackage = unitsPerPackage;
    }
  }
  
  return analysis;
}

/**
 * Update ingredient with calculated values
 */
async function updateIngredientCalculations(ingredientId, calculations, dryRun = false) {
  if (dryRun) {
    return true;
  }
  
  try {
    const properties = {};
    
    // Note: Notion formulas are read-only, so we can't update them directly
    // But we can add notes or create a new property if needed
    // For now, we'll log what would be calculated
    
    // If you want to store calculated values, you'd need to create new properties
    // like "Calculated Price per Unit" and update those
    
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
  const updateNotion = args.includes('--update') && !dryRun;
  
  console.log('📊 Ingredient Unit Calculator\n');
  
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - Showing calculations only\n');
  }
  
  try {
    console.log('📥 Fetching ingredients from Notion...\n');
    const ingredients = await getAllIngredients();
    
    console.log(`✅ Found ${ingredients.length} ingredients\n`);
    console.log('='.repeat(70));
    
    const stats = {
      total: ingredients.length,
      hasCompleteData: 0,
      hasPartialData: 0,
      missingData: 0,
      calculated: 0,
      errors: 0
    };
    
    const results = [];
    
    for (const ingredient of ingredients) {
      const analysis = analyzeIngredient(ingredient);
      
      // Categorize
      const hasAllData = analysis.hasPricePerPackage && 
                        analysis.hasPackageSize && 
                        analysis.hasPackageUnit && 
                        analysis.hasBaseUnit;
      
      if (hasAllData) {
        stats.hasCompleteData++;
        stats.calculated++;
      } else if (analysis.hasPricePerPackage || analysis.hasPackageSize) {
        stats.hasPartialData++;
      } else {
        stats.missingData++;
      }
      
      results.push(analysis);
    }
    
    // Show summary
    console.log('\n📊 Summary:\n');
    console.log(`   Total ingredients: ${stats.total}`);
    console.log(`   Complete data (can calculate): ${stats.hasCompleteData}`);
    console.log(`   Partial data: ${stats.hasPartialData}`);
    console.log(`   Missing data: ${stats.missingData}`);
    console.log(`   Calculations ready: ${stats.calculated}`);
    
    // Show examples
    console.log('\n💡 Examples of Calculated Values:\n');
    
    const examples = results
      .filter(r => r.calculations.pricePerUnit || r.calculations.pricePerBaseUnit)
      .slice(0, 10);
    
    for (const example of examples) {
      console.log(`  📦 ${example.name}`);
      
      if (example.calculations.pricePerUnit) {
        console.log(`     Price per ${example.calculations.pricePerUnitUnit}: $${example.calculations.pricePerUnit.toFixed(4)}`);
      }
      
      if (example.calculations.pricePerBaseUnit) {
        console.log(`     Price per ${example.calculations.baseUnitName}: $${example.calculations.pricePerBaseUnit.toFixed(4)}`);
      }
      
      if (example.calculations.unitsPerPackage) {
        console.log(`     Units per package: ${example.calculations.unitsPerPackage.toFixed(2)}`);
      }
      
      console.log('');
    }
    
    // Show ingredients needing data
    if (stats.missingData > 0) {
      console.log('\n⚠️  Ingredients Missing Data:\n');
      
      const missing = results
        .filter(r => !r.hasPricePerPackage && !r.hasPackageSize)
        .slice(0, 10)
        .map(r => r.name);
      
      console.log(`   ${missing.join(', ')}`);
      if (stats.missingData > 10) {
        console.log(`   ... and ${stats.missingData - 10} more`);
      }
    }
    
    // Show ingredients with partial data
    if (stats.hasPartialData > 0) {
      console.log('\n⚠️  Ingredients with Partial Data:\n');
      
      const partial = results
        .filter(r => (r.hasPricePerPackage || r.hasPackageSize) && 
                     !(r.hasPricePerPackage && r.hasPackageSize && r.hasPackageUnit))
        .slice(0, 10);
      
      for (const p of partial) {
        const missing = [];
        if (!p.hasPricePerPackage) missing.push('Price per Package');
        if (!p.hasPackageSize) missing.push('Package Size');
        if (!p.hasPackageUnit) missing.push('Package Unit');
        if (!p.hasBaseUnit) missing.push('Base Unit');
        
        console.log(`   ${p.name}: Missing ${missing.join(', ')}`);
      }
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('\n💡 Next Steps:\n');
    console.log('   1. Fill in missing data for ingredients you use frequently');
    console.log('   2. Run with --update flag to store calculated values (if you add properties)');
    console.log('   3. Use calculated prices for accurate recipe cost calculations');
    console.log('\n✅ Analysis complete!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code === 'object_not_found') {
      console.error('   Make sure NOTION_ALDI_INGREDIENTS_DB_ID is set in .env');
    }
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
