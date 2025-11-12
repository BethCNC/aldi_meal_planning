/**
 * Verify Supabase Setup
 * 
 * Checks if Supabase tables exist and counts records
 * 
 * Usage: node scripts/verify-supabase-setup.js
 */

import dotenv from 'dotenv';
import {existsSync} from 'fs';
import {fileURLToPath} from 'url';
import {dirname, join} from 'path';
import {createClient} from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

// Check if environment variables are set
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Supabase environment variables not configured\n');
  console.log('📋 Setup Instructions:\n');
  console.log('1. Create a Supabase project:');
  console.log('   → Go to https://supabase.com');
  console.log('   → Sign up/login and create a new project\n');
  console.log('2. Get your API keys:');
  console.log('   → Go to Settings → API');
  console.log('   → Copy "Project URL" and "anon public" key\n');
  console.log('3. Add to your .env file:');
  console.log('   SUPABASE_URL=https://xxxxx.supabase.co');
  console.log('   SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\n');
  
  // Check if .env file exists
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const envPath = join(__dirname, '..', '.env');
  const envLocalPath = join(__dirname, '..', '.env.local');
  
  if (existsSync(envPath)) {
    console.log('✅ Found .env file at:', envPath);
    console.log('   Add SUPABASE_URL and SUPABASE_KEY to this file\n');
  } else if (existsSync(envLocalPath)) {
    console.log('✅ Found .env.local file at:', envLocalPath);
    console.log('   Add SUPABASE_URL and SUPABASE_KEY to this file\n');
  } else {
    console.log('⚠️  No .env file found');
    console.log('   Create .env file in project root with:');
    console.log('   SUPABASE_URL=your-url');
    console.log('   SUPABASE_KEY=your-key\n');
  }
  
  console.log('📖 See docs/SUPABASE_QUICK_START.md for detailed instructions\n');
  process.exit(1);
}

// Create Supabase client directly (don't import from backend/supabase/client.js)
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifySupabaseSetup() {
  console.log('🔍 Verifying Supabase Setup...\n');
  console.log(`📍 Supabase URL: ${supabaseUrl.substring(0, 30)}...\n`);

  try {
    // Check if we can connect
    console.log('1. Testing Supabase connection...');
    const {data: testData, error: testError} = await supabase
      .from('ingredients')
      .select('id')
      .limit(1);
    
    if (testError && testError.code === '42P01') {
      console.log('   ❌ Cannot connect - tables may not exist\n');
    } else if (testError) {
      console.log(`   ⚠️  Connection error: ${testError.message}\n`);
    } else {
      console.log('   ✅ Connected successfully\n');
    }

    // Check core tables
    const coreTables = ['ingredients', 'recipes', 'recipe_ingredients', 'units', 'unit_conversions'];
    console.log('2. Checking core tables...');
    
    for (const table of coreTables) {
      try {
        const {count, error} = await supabase
          .from(table)
          .select('*', {count: 'exact', head: true});
        
        if (error) {
          if (error.code === '42P01') {
            console.log(`   ❌ Table "${table}" does NOT exist`);
          } else {
            console.log(`   ⚠️  Table "${table}": ${error.message}`);
          }
        } else {
          console.log(`   ✅ Table "${table}": ${count || 0} records`);
        }
      } catch (err) {
        console.log(`   ❌ Table "${table}": ${err.message}`);
      }
    }

    console.log('\n3. Checking pantry feature tables...');
    const pantryTables = ['user_pantry', 'meal_plans', 'grocery_lists', 'pantry_usage', 'user_preferences'];
    
    for (const table of pantryTables) {
      try {
        const {count, error} = await supabase
          .from(table)
          .select('*', {count: 'exact', head: true});
        
        if (error) {
          if (error.code === '42P01') {
            console.log(`   ❌ Table "${table}" does NOT exist (needs to be created)`);
          } else {
            console.log(`   ⚠️  Table "${table}": ${error.message}`);
          }
        } else {
          console.log(`   ✅ Table "${table}": ${count || 0} records`);
        }
      } catch (err) {
        console.log(`   ❌ Table "${table}": ${err.message}`);
      }
    }

    // Check RPC function
    console.log('\n4. Checking RPC function...');
    try {
      const {data, error} = await supabase.rpc('find_recipes_with_pantry_items', {
        pantry_ids: []
      });
      
      if (error) {
        if (error.code === '42883') {
          console.log('   ❌ RPC function "find_recipes_with_pantry_items" does NOT exist');
          console.log('      Run docs/PANTRY_RPC_FUNCTION.sql in Supabase SQL Editor');
        } else {
          console.log(`   ⚠️  RPC function error: ${error.message}`);
        }
      } else {
        console.log('   ✅ RPC function "find_recipes_with_pantry_items" exists');
      }
    } catch (err) {
      console.log(`   ❌ RPC function check failed: ${err.message}`);
    }

    console.log('\n📊 Summary:');
    console.log('   - Check above for missing tables');
    console.log('   - Missing tables: Run SQL scripts in Supabase SQL Editor');
    console.log('   - See docs/PANTRY_TABLES_SQL.sql for pantry tables');
    console.log('   - See docs/PANTRY_RPC_FUNCTION.sql for RPC function');

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    
    if (error.message.includes('supabaseUrl')) {
      console.error('\n⚠️  Supabase URL not configured');
      console.error('   Add SUPABASE_URL to your .env file');
    } else if (error.message.includes('JWT') || error.message.includes('invalid')) {
      console.error('\n⚠️  Supabase key may be invalid');
      console.error('   Check that SUPABASE_KEY matches your anon/public key');
    } else {
      console.error('\nMake sure:');
      console.error('  1. SUPABASE_URL and SUPABASE_KEY are set in .env');
      console.error('  2. Supabase project is accessible');
      console.error('  3. Network connection is working');
    }
    process.exit(1);
  }
}

verifySupabaseSetup();

