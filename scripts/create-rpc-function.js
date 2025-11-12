/**
 * Create RPC Function in Supabase
 * 
 * Attempts to create the RPC function via Supabase API
 * Falls back to providing SQL to copy/paste if API method doesn't work
 * 
 * Usage: node scripts/create-rpc-function.js
 */

import dotenv from 'dotenv';
import {createClient} from '@supabase/supabase-js';
import {readFileSync} from 'fs';
import {fileURLToPath} from 'url';
import {dirname, join} from 'path';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase environment variables not configured');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const serviceSupabase = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

async function createRPCFunction() {
  console.log('🔧 Creating RPC Function: find_recipes_with_pantry_items\n');

  // Read the SQL file
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const sqlPath = join(__dirname, '..', 'docs', 'PANTRY_RPC_FUNCTION.sql');
  
  let sqlContent;
  try {
    sqlContent = readFileSync(sqlPath, 'utf-8');
    console.log('✅ Loaded SQL from docs/PANTRY_RPC_FUNCTION.sql\n');
  } catch (error) {
    console.error('❌ Could not read SQL file:', error.message);
    process.exit(1);
  }

  // Extract just the CREATE FUNCTION statement (remove test code but keep comments)
  const lines = sqlContent.split('\n');
  const functionLines = [];
  let inFunction = false;
  
  for (const line of lines) {
    if (line.includes('CREATE OR REPLACE FUNCTION')) {
      inFunction = true;
    }
    if (inFunction) {
      functionLines.push(line);
    }
    if (inFunction && line.trim() === '$$;') {
      break;
    }
  }
  
  const functionSQL = functionLines.join('\n');

  console.log('📋 SQL to Execute:');
  console.log('─'.repeat(80));
  console.log(functionSQL);
  console.log('─'.repeat(80));
  console.log('');

  // Try to execute via Supabase REST API (requires service role key)
  if (serviceSupabase) {
    console.log('🔑 Service role key found - attempting to execute SQL...\n');
    
    try {
      // Note: Supabase doesn't allow arbitrary SQL execution via REST API
      // We'll need to use the SQL Editor or provide instructions
      console.log('⚠️  Supabase REST API does not support arbitrary SQL execution');
      console.log('   This is a security feature. Please use the SQL Editor method below.\n');
    } catch (error) {
      console.log('⚠️  Could not execute via API:', error.message);
      console.log('   Please use the SQL Editor method below.\n');
    }
  } else {
    console.log('ℹ️  No service role key found - using manual method\n');
  }

  // Provide manual instructions
  console.log('📝 Manual Setup Instructions:');
  console.log('─'.repeat(80));
  console.log('');
  console.log('1. Open Supabase Dashboard:');
  console.log('   → Go to https://supabase.com/dashboard');
  console.log('   → Select your project');
  console.log('');
  console.log('2. Open SQL Editor:');
  console.log('   → Click "SQL Editor" in the left sidebar');
  console.log('   → Click "New query" button');
  console.log('');
  console.log('3. Copy and paste the SQL above');
  console.log('');
  console.log('4. Execute:');
  console.log('   → Click "Run" button (or press Cmd/Ctrl + Enter)');
  console.log('   → You should see "Success. No rows returned"');
  console.log('');
  console.log('5. Verify:');
  console.log('   → Run: npm run test:rpc');
  console.log('   → Should show "✅ RPC function exists"');
  console.log('');
  console.log('─'.repeat(80));
  console.log('');

  // Test if function already exists
  console.log('🧪 Checking if function already exists...');
  try {
    const {data, error} = await supabase.rpc('find_recipes_with_pantry_items', {
      pantry_ids: []
    });
    
    if (error) {
      if (error.code === '42883') {
        console.log('   ❌ Function does NOT exist yet');
        console.log('   📋 Follow the instructions above to create it\n');
      } else {
        console.log(`   ⚠️  Error checking: ${error.message}`);
        console.log('   📋 Function may not exist - follow instructions above\n');
      }
    } else {
      console.log('   ✅ Function already exists!');
      console.log('   🎉 No action needed - you\'re all set!\n');
    }
  } catch (error) {
    console.log(`   ⚠️  Could not verify: ${error.message}`);
    console.log('   📋 Follow the instructions above to create it\n');
  }

  // Provide quick copy option
  console.log('💡 Quick Copy:');
  console.log('   The SQL is shown above. Copy it and paste into Supabase SQL Editor.');
  console.log('');
}

createRPCFunction();

