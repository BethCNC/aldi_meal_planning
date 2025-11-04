import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Pricing data from images
// Try to match existing items or create new ones
const priceUpdates = [
  {
    searchTerms: ['vegetable oil', 'oil'],
    exactMatch: 'vegetable oil',
    pricePerPackage: 3.19,
    packageSize: 48,
    packageUnit: 'fl oz',
    baseUnit: 'fl oz',
    pricePerBaseUnit: 3.19 / 48, // $0.0664 per fl oz
    category: 'Oils & Vinegars',
    createIfMissing: true
  },
  {
    searchTerms: ['breadcrumb', 'bread crumb'],
    exactMatch: 'breadcrumbs',
    pricePerPackage: 1.35,
    packageSize: 15,
    packageUnit: 'oz',
    baseUnit: 'oz',
    pricePerBaseUnit: 1.35 / 15, // $0.09 per oz
    category: 'Baking Supplies & Ingredients',
    createIfMissing: true
  },
  {
    searchTerms: ['salad greens', 'spring mix', 'mixed greens'],
    exactMatch: 'salad greens (bag)',
    pricePerPackage: 3.19,
    packageSize: 5,
    packageUnit: 'oz',
    baseUnit: 'oz',
    pricePerBaseUnit: 3.19 / 5, // $0.638 per oz
    category: '🥦 Veggie',
    createIfMissing: true // Create as separate product
  },
  {
    searchTerms: ['balsamic vinegar', 'vinegar'],
    exactMatch: 'balsamic vinegar',
    pricePerPackage: 2.85,
    packageSize: 16.9,
    packageUnit: 'fl oz',
    baseUnit: 'fl oz',
    pricePerBaseUnit: 2.85 / 16.9, // $0.1686 per fl oz
    category: 'Oils & Vinegars',
    createIfMissing: true
  },
  {
    searchTerms: ['pork chop', 'pork'],
    exactMatch: 'pork chops (boneless)',
    pricePerPackage: 5.28, // average package
    packageSize: 1.125, // average package size
    packageUnit: 'lb',
    baseUnit: 'lb',
    pricePerBaseUnit: 4.69, // price per lb
    category: '🥩 Meat',
    createIfMissing: true
  }
];

async function checkJamPreserves() {
  console.log('\n🔍 Checking for jam/preserves ingredient...\n');
  
  // Search for variations
  const searchTerms = ['jam', 'preserves', 'strawberry jam', 'jelly'];
  
  for (const term of searchTerms) {
    const { data } = await supabase
      .from('ingredients')
      .select('id, item, price_per_base_unit, base_unit')
      .ilike('item', `%${term}%`);
    
    if (data && data.length > 0) {
      console.log(`✅ Found ${data.length} ingredient(s) matching "${term}":`);
      data.forEach(ing => {
        const priceText = ing.price_per_base_unit 
          ? `$${ing.price_per_base_unit.toFixed(4)}/${ing.base_unit || 'unit'}` 
          : 'MISSING';
        console.log(`   • ${ing.item} - Price: ${priceText}`);
      });
      console.log('');
      return data;
    }
  }
  
  console.log('❌ No jam/preserves ingredient found in database\n');
  return null;
}

async function updatePrices() {
  console.log('\n💰 Updating Missing Ingredient Prices\n');
  console.log('════════════════════════════════════════════════════════════\n');

  // Check for jam/preserves
  const jamResults = await checkJamPreserves();
  if (!jamResults || jamResults.length === 0) {
    console.log('⚠️  Jam/preserves ingredient not found - you may need to add it manually\n');
  }

  console.log('📝 Updating prices...\n');

  let updated = 0;
  let created = 0;
  let notFound = 0;
  const results = [];

  for (const update of priceUpdates) {
    // Search using all search terms
    let ingredients = [];
    for (const term of update.searchTerms) {
      const { data } = await supabase
        .from('ingredients')
        .select('*')
        .ilike('item', `%${term}%`);
      
      if (data && data.length > 0) {
        ingredients = data;
        break; // Use first search term that finds results
      }
    }

    let ingredient = null;
    
    if (ingredients && ingredients.length > 0) {
      // First, try exact match
      ingredient = ingredients.find(ing => 
        ing.item.toLowerCase() === update.exactMatch.toLowerCase()
      );
      
      // If no exact match, try partial match (contains exact match words)
      if (!ingredient) {
        const exactWords = update.exactMatch.toLowerCase().split(/\s+/);
        ingredient = ingredients.find(ing => {
          const itemLower = ing.item.toLowerCase();
          return exactWords.every(word => itemLower.includes(word));
        });
      }
      
      // If still no match and we should create, don't use a wrong match
      if (!ingredient && update.createIfMissing) {
        // Don't use a wrong match - we'll create a new one
      } else if (ingredient && ingredient.item.toLowerCase() !== update.exactMatch.toLowerCase()) {
        // Only use partial match if createIfMissing is false
        if (!update.createIfMissing) {
          if (ingredients.length > 1) {
            console.log(`⚠️  Multiple matches for "${update.exactMatch}":`);
            ingredients.forEach(ing => console.log(`   • ${ing.item}`));
            console.log(`   Using closest: ${ingredient.item}\n`);
          }
        } else {
          // We have a partial match but should create exact, so skip this match
          ingredient = null;
        }
      }
    }

    // If not found and we should create it
    if (!ingredient && update.createIfMissing) {
      console.log(`📝 Creating new ingredient: ${update.exactMatch}`);
      
      // Generate a simple ID (in production, you'd want a proper UUID)
      const newId = `new_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const { data: newIngredient, error: createError } = await supabase
        .from('ingredients')
        .insert({
          id: newId,
          item: update.exactMatch,
          price_per_package: Math.round(update.pricePerPackage * 100) / 100,
          package_size: update.packageSize,
          package_unit: update.packageUnit,
          base_unit: update.baseUnit,
          price_per_base_unit: Math.round(update.pricePerBaseUnit * 10000) / 10000,
          category: update.category,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.log(`❌ Error creating ${update.exactMatch}: ${createError.message}`);
        notFound++;
        continue;
      }

      ingredient = newIngredient;
      created++;
      console.log(`✅ Created: ${update.exactMatch}`);
      console.log(`   Package: ${update.packageSize} ${update.packageUnit} @ $${update.pricePerPackage}`);
      console.log(`   Price per ${update.baseUnit}: $${update.pricePerBaseUnit.toFixed(4)}\n`);
      continue;
    }

    if (!ingredient) {
      console.log(`❌ Not found: ${update.exactMatch} (and createIfMissing = false)`);
      notFound++;
      results.push({ item: update.exactMatch, status: 'not_found' });
      continue;
    }

    // Update the ingredient
    const { error } = await supabase
      .from('ingredients')
      .update({
        price_per_package: Math.round(update.pricePerPackage * 100) / 100,
        package_size: update.packageSize,
        package_unit: update.packageUnit,
        base_unit: update.baseUnit,
        price_per_base_unit: Math.round(update.pricePerBaseUnit * 10000) / 10000, // Round to 4 decimals
        category: update.category || ingredient.category,
        updated_at: new Date().toISOString()
      })
      .eq('id', ingredient.id);

    if (error) {
      console.log(`❌ Error updating ${ingredient.item}: ${error.message}`);
      results.push({ item: update.item, status: 'error', error: error.message });
    } else {
      console.log(`✅ Updated: ${ingredient.item}`);
      console.log(`   Package: ${update.packageSize} ${update.packageUnit} @ $${update.pricePerPackage}`);
      console.log(`   Price per ${update.baseUnit}: $${update.pricePerBaseUnit.toFixed(4)}\n`);
      updated++;
      results.push({ 
        item: ingredient.item, 
        status: 'updated',
        pricePerBaseUnit: update.pricePerBaseUnit
      });
    }
  }

  console.log('\n════════════════════════════════════════════════════════════\n');
  console.log('📊 Summary:\n');
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ✨ Created: ${created}`);
  console.log(`   ❌ Not found: ${notFound}`);
  console.log(`   📋 Total: ${priceUpdates.length}\n`);

  if (updated > 0) {
    console.log('✅ Price updates complete!\n');
  }

  if (notFound > 0) {
    console.log('⚠️  Some ingredients were not found. They may need to be added manually.\n');
  }
}

updatePrices();
