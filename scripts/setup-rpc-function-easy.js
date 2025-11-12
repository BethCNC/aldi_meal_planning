/**
 * Easy RPC Function Setup
 * 
 * Provides the easiest way to create the RPC function
 * 
 * Usage: node scripts/setup-rpc-function-easy.js
 */

import {readFileSync} from 'fs';
import {fileURLToPath} from 'url';
import {dirname, join} from 'path';
import {exec} from 'child_process';
import {promisify} from 'util';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const sqlPath = join(__dirname, '..', 'docs', 'PANTRY_RPC_FUNCTION.sql');

async function setupRPCFunction() {
  console.log('🚀 Easy RPC Function Setup\n');
  
  // Read SQL
  const sqlContent = readFileSync(sqlPath, 'utf-8');
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
  
  console.log('📋 Step 1: Copy this SQL:');
  console.log('═'.repeat(80));
  console.log(functionSQL);
  console.log('═'.repeat(80));
  console.log('');
  
  // Try to open Supabase dashboard
  console.log('📋 Step 2: Opening Supabase Dashboard...');
  try {
    // Try to open browser (macOS)
    await execAsync('open https://supabase.com/dashboard/project/_/sql/new');
    console.log('   ✅ Opened Supabase SQL Editor in your browser');
    console.log('   💡 Paste the SQL above and click "Run"');
  } catch (error) {
    // Try Linux/Windows
    try {
      await execAsync('xdg-open https://supabase.com/dashboard/project/_/sql/new 2>/dev/null || start https://supabase.com/dashboard/project/_/sql/new 2>/dev/null');
      console.log('   ✅ Opened Supabase SQL Editor in your browser');
    } catch (e) {
      console.log('   ⚠️  Could not open browser automatically');
      console.log('   📝 Please manually go to: https://supabase.com/dashboard');
      console.log('   → Select your project');
      console.log('   → Go to SQL Editor → New query');
    }
  }
  
  console.log('');
  console.log('📋 Step 3: After running the SQL, verify with:');
  console.log('   npm run test:rpc');
  console.log('');
  console.log('✅ That\'s it! The function will be created and ready to use.');
}

setupRPCFunction().catch(console.error);


