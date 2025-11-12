/**
 * Check if RPC Function Exists - Detailed Diagnostic
 * 
 * Checks multiple ways to see if the function exists
 * 
 * Usage: node scripts/check-rpc-function-exists.js
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

async function checkRPCFunction() {
  console.log('🔍 Detailed RPC Function Check\n');
  console.log(`📍 Supabase URL: ${supabaseUrl.substring(0, 30)}...\n`);

  // Method 1: Try to call the function
  console.log('Method 1: Attempting to call function...');
  try {
    const {data, error} = await supabase.rpc('find_recipes_with_pantry_items', {
      pantry_ids: []
    });
    
    if (error) {
      console.log(`   ❌ Error: ${error.message}`);
      console.log(`   Code: ${error.code}`);
      console.log(`   Details: ${error.details || 'N/A'}`);
      console.log(`   Hint: ${error.hint || 'N/A'}\n`);
      
      if (error.code === '42883') {
        console.log('   💡 This means: Function does not exist\n');
      } else if (error.code === '42501') {
        console.log('   💡 This means: Permission denied\n');
      }
    } else {
      console.log('   ✅ Function exists and can be called!');
      console.log(`   Returned ${data?.length || 0} results\n`);
      return;
    }
  } catch (err) {
    console.log(`   ❌ Exception: ${err.message}\n`);
  }

  // Method 2: Check via SQL query (if we can access information_schema)
  console.log('Method 2: Checking function in database catalog...');
  try {
    // Try to query information_schema.routines
    const {data: routines, error: routinesError} = await supabase
      .rpc('exec_sql', {
        query: `
          SELECT routine_name, routine_schema 
          FROM information_schema.routines 
          WHERE routine_name = 'find_recipes_with_pantry_items'
        `
      });
    
    if (routinesError) {
      console.log(`   ⚠️  Cannot query catalog: ${routinesError.message}`);
      console.log('   (This is normal - anon key may not have access)\n');
    } else {
      if (routines && routines.length > 0) {
        console.log('   ✅ Function found in catalog:');
        routines.forEach(r => {
          console.log(`      - ${r.routine_schema}.${r.routine_name}`);
        });
        console.log('');
      } else {
        console.log('   ❌ Function not found in catalog\n');
      }
    }
  } catch (err) {
    console.log(`   ⚠️  Catalog check failed: ${err.message}\n`);
  }

  // Provide troubleshooting steps
  console.log('📋 Troubleshooting Steps:\n');
  console.log('1. Verify you ran the SQL in the correct Supabase project:');
  console.log(`   → Check that this URL matches: ${supabaseUrl.substring(0, 40)}...`);
  console.log('');
  console.log('2. Check for SQL errors:');
  console.log('   → In Supabase SQL Editor, look for any error messages');
  console.log('   → Make sure you saw "Success" message');
  console.log('');
  console.log('3. Verify the function was created:');
  console.log('   → In Supabase Dashboard, go to Database → Functions');
  console.log('   → Look for "find_recipes_with_pantry_items"');
  console.log('');
  console.log('4. Try running the SQL again:');
  console.log('   → Copy SQL from docs/PANTRY_RPC_FUNCTION.sql');
  console.log('   → Make sure to copy the ENTIRE function (including $$; at the end)');
  console.log('   → Run it again in SQL Editor');
  console.log('');
  console.log('5. Check function permissions:');
  console.log('   → The function should be in the "public" schema');
  console.log('   → It should be executable by authenticated users');
  console.log('');
}

checkRPCFunction().catch(console.error);

