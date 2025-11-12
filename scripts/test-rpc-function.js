/**
 * Test RPC Function
 * 
 * Tests the pantry recipe matching RPC function
 * 
 * Usage: node scripts/test-rpc-function.js
 */

import dotenv from 'dotenv';
import {createClient} from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase environment variables not configured');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRPCFunction() {
  console.log('🧪 Testing RPC Function: find_recipes_with_pantry_items\n');

  try {
    // Step 1: Check if function exists
    console.log('1. Checking if RPC function exists...');
    const {data: testData, error: testError} = await supabase.rpc('find_recipes_with_pantry_items', {
      pantry_ids: []
    });
    
    if (testError) {
      if (testError.code === '42883') {
        console.log('   ❌ RPC function does NOT exist');
        console.log('   📋 Action: Run docs/PANTRY_RPC_FUNCTION.sql in Supabase SQL Editor\n');
        process.exit(1);
      } else {
        console.log(`   ⚠️  Error: ${testError.message}\n`);
      }
    } else {
      console.log('   ✅ RPC function exists\n');
    }

    // Step 2: Get pantry items
    console.log('2. Getting pantry items...');
    const {data: pantryItems, error: pantryError} = await supabase
      .from('user_pantry')
      .select('ingredient_id')
      .gt('quantity', 0);
    
    if (pantryError) {
      console.log(`   ⚠️  Error loading pantry: ${pantryError.message}`);
    }
    
    const pantryIds = (pantryItems || []).map(p => p.ingredient_id).filter(Boolean);
    
    if (pantryIds.length === 0) {
      console.log('   ⚠️  No pantry items found');
      console.log('   💡 Add pantry items first, or test with sample data:\n');
      console.log('   INSERT INTO user_pantry (ingredient_id, quantity, unit, source)');
      console.log('   SELECT id, 1.0, \'lb\', \'test\'');
      console.log('   FROM ingredients');
      console.log('   WHERE item ILIKE \'%chicken%\'');
      console.log('   LIMIT 1;\n');
      
      // Try to create test data
      console.log('   🔧 Attempting to create test data...');
      const {data: testIngredient} = await supabase
        .from('ingredients')
        .select('id, item')
        .ilike('item', '%chicken%')
        .limit(1)
        .single();
      
      if (testIngredient) {
        const {error: insertError} = await supabase
          .from('user_pantry')
          .insert({
            ingredient_id: testIngredient.id,
            quantity: 1.0,
            unit: 'lb',
            source: 'test'
          });
        
        if (!insertError) {
          console.log(`   ✅ Added test ingredient: ${testIngredient.item}`);
          pantryIds.push(testIngredient.id);
        }
      }
    } else {
      console.log(`   ✅ Found ${pantryIds.length} pantry items\n`);
    }

    // Step 3: Test the function
    let matches = null;
    if (pantryIds.length > 0) {
      console.log('3. Testing RPC function with pantry items...');
      const {data: rpcMatches, error: rpcError} = await supabase.rpc('find_recipes_with_pantry_items', {
        pantry_ids: pantryIds
      });
      
      if (rpcError) {
        console.log(`   ❌ Error: ${rpcError.message}`);
        console.log(`   Code: ${rpcError.code}`);
        process.exit(1);
      }
      
      matches = rpcMatches;
      
      if (!matches || matches.length === 0) {
        console.log('   ⚠️  No matches found');
        console.log('   💡 This could mean:');
        console.log('      - No recipes use these pantry ingredients');
        console.log('      - Recipes don\'t have linked ingredients');
        console.log('      - Ingredient names don\'t match\n');
      } else {
        console.log(`   ✅ Found ${matches.length} matching recipes\n`);
        
        // Show top 5 matches
        console.log('4. Top 5 Matches:');
        console.log('─'.repeat(80));
        matches.slice(0, 5).forEach((match, idx) => {
          console.log(`\n${idx + 1}. ${match.name}`);
          console.log(`   Match: ${match.match_percentage}% (${match.pantry_ingredients_used}/${match.total_ingredients} ingredients)`);
          console.log(`   Cost: $${match.total_cost?.toFixed(2)} ($${match.cost_per_serving?.toFixed(2)}/serving)`);
          console.log(`   Pantry items used: ${match.pantry_items_used?.join(', ') || 'N/A'}`);
        });
        console.log('\n' + '─'.repeat(80));
      }
    } else {
      console.log('   ⚠️  Cannot test - no pantry items available\n');
    }

    // Step 4: Analyze match quality
    if (matches && matches.length > 0) {
      console.log('\n5. Match Quality Analysis:');
      const highMatches = matches.filter(m => m.match_percentage >= 50);
      const mediumMatches = matches.filter(m => m.match_percentage >= 25 && m.match_percentage < 50);
      const lowMatches = matches.filter(m => m.match_percentage < 25);
      
      console.log(`   High matches (50%+): ${highMatches.length}`);
      console.log(`   Medium matches (25-49%): ${mediumMatches.length}`);
      console.log(`   Low matches (<25%): ${lowMatches.length}`);
      
      if (highMatches.length === 0) {
        console.log('\n   💡 Recommendation: Add more pantry items for better matches');
      }
    }

    console.log('\n✅ RPC function test complete!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

testRPCFunction();

