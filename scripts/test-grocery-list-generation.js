/**
 * Test Grocery List Generation
 * 
 * Tests the full grocery list generation flow
 */

import dotenv from 'dotenv';
import {createClient} from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Import the generator function
const {generateGroceryList} = await import('../src/api/groceryListGenerator.js');

async function testGeneration() {
  console.log('🧪 Testing Grocery List Generation\n');
  
  // Get current week start date (Sunday)
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day;
  const sunday = new Date(today.setDate(diff));
  sunday.setHours(0, 0, 0, 0);
  const weekStartDate = sunday.toISOString().split('T')[0];
  
  console.log(`📅 Week Start Date: ${weekStartDate}\n`);
  
  try {
    console.log('Generating grocery list...\n');
    const result = await generateGroceryList(weekStartDate, { usePantry: true });
    
    console.log('✅ Grocery list generated successfully!\n');
    console.log('📊 Summary:');
    console.log(`   Total Cost: $${result.totalCost?.toFixed(2) || '0.00'}`);
    console.log(`   Savings (from pantry): $${result.savings?.toFixed(2) || '0.00'}`);
    console.log(`   Already Have: ${result.alreadyHave?.length || 0} items`);
    console.log(`   Need to Buy: ${Object.values(result.itemsByCategory || {}).reduce((sum, cat) => sum + cat.items.length, 0)} items\n`);
    
    console.log('📦 Items by Category:');
    const categories = Object.values(result.itemsByCategory || {}).sort((a, b) => a.order - b.order);
    for (const category of categories) {
      console.log(`\n   ${category.icon} ${category.name} (${category.location})`);
      console.log(`   ${category.items.length} items`);
      const categoryCost = category.items.reduce((sum, item) => sum + (item.estimated_cost || 0), 0);
      console.log(`   Estimated cost: $${categoryCost.toFixed(2)}`);
      
      // Show first 3 items
      category.items.slice(0, 3).forEach(item => {
        const name = item.ingredient?.item || 'Unknown';
        const qty = item.total_quantity || 0;
        const unit = item.unit || '';
        const cost = item.estimated_cost?.toFixed(2) || '0.00';
        console.log(`      - ${name}: ${qty} ${unit} ($${cost})`);
      });
      if (category.items.length > 3) {
        console.log(`      ... and ${category.items.length - 3} more`);
      }
    }
    
    if (result.alreadyHave && result.alreadyHave.length > 0) {
      console.log('\n   ✅ Already Have:');
      result.alreadyHave.slice(0, 5).forEach(item => {
        const name = item.ingredient?.item || 'Unknown';
        const qty = item.pantry_quantity || 0;
        const unit = item.unit || '';
        console.log(`      - ${name}: ${qty} ${unit} (in pantry)`);
      });
      if (result.alreadyHave.length > 5) {
        console.log(`      ... and ${result.alreadyHave.length - 5} more`);
      }
    }
    
    console.log('\n✅ Test complete!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testGeneration();

