/**
 * Fix RLS policy issue for meal_plans table
 * Checks if migration has been run and provides fix instructions
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('   Need: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndFix() {
  console.log('\n🔍 Checking meal_plans table structure...\n');
  console.log('════════════════════════════════════════════════════════════\n');

  // Check if user_id column exists
  const { data: columns, error: columnsError } = await supabase.rpc('exec_sql', {
    query: `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'meal_plans' 
      AND column_name = 'user_id'
    `
  }).catch(() => ({ data: null, error: { message: 'Cannot check columns directly' } }));

  // Alternative: Try to query the table structure
  const { data: testData, error: testError } = await supabase
    .from('meal_plans')
    .select('user_id')
    .limit(1);

  const hasUserIdColumn = testError?.message?.includes('column') === false;
  
  if (testError && testError.message.includes('column "user_id" does not exist')) {
    console.log('❌ Problem found: meal_plans table is missing user_id column\n');
    console.log('📝 Solution: Run the migration script in Supabase SQL Editor\n');
    console.log('════════════════════════════════════════════════════════════\n');
    
    // Read and display the migration file
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const migrationPath = join(__dirname, '..', 'docs', 'migrations', '001_add_user_isolation.sql');
    
    try {
      const migrationSQL = readFileSync(migrationPath, 'utf-8');
      console.log('📄 Migration SQL to run in Supabase:\n');
      console.log('────────────────────────────────────────────────────────\n');
      console.log(migrationSQL);
      console.log('\n────────────────────────────────────────────────────────\n');
      console.log('📋 Instructions:');
      console.log('   1. Go to Supabase Dashboard > SQL Editor');
      console.log('   2. Click "New Query"');
      console.log('   3. Paste the SQL above');
      console.log('   4. Click "Run"');
      console.log('   5. You should see "Success. No rows returned"');
      console.log('   6. Try generating meal plan again\n');
    } catch (err) {
      console.log('⚠️  Could not read migration file');
      console.log('   Please manually run: docs/migrations/001_add_user_isolation.sql\n');
    }
    
    return;
  }

  // Check RLS policies
  console.log('✅ user_id column exists\n');
  console.log('🔍 Checking RLS policies...\n');

  const { data: policies, error: policiesError } = await supabase.rpc('exec_sql', {
    query: `
      SELECT policyname, cmd, qual, with_check
      FROM pg_policies 
      WHERE tablename = 'meal_plans'
    `
  }).catch(() => ({ data: null, error: { message: 'Cannot check policies directly' } }));

  if (policiesError) {
    console.log('⚠️  Cannot check RLS policies directly');
    console.log('   But the user_id column exists, so RLS should work\n');
    console.log('💡 If you still get RLS errors, try:');
    console.log('   1. Verify you are logged in (check auth status)');
    console.log('   2. Check that RLS policies exist in Supabase Dashboard');
    console.log('   3. Ensure policies allow INSERT with user_id = auth.uid()\n');
    return;
  }

  if (policies && policies.length > 0) {
    console.log('✅ RLS policies found:\n');
    policies.forEach(p => {
      console.log(`   • ${p.policyname} (${p.cmd})`);
    });
    console.log('\n✅ Setup looks correct!\n');
    console.log('💡 If you still get errors, check:');
    console.log('   1. Are you logged in? (Check browser console for auth errors)');
    console.log('   2. Does your user have a valid UUID?');
    console.log('   3. Try logging out and back in\n');
  } else {
    console.log('⚠️  No RLS policies found');
    console.log('   Run the migration to create policies\n');
  }
}

checkAndFix().catch(console.error);

