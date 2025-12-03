/**
 * Diagnose RLS issue with meal_plans table
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
  console.log('\n🔍 Diagnosing RLS Issue\n');
  console.log('════════════════════════════════════════════════════════════\n');

  // Check if user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    console.log('❌ Not authenticated!');
    console.log('   Error:', authError?.message || 'No user found');
    console.log('\n💡 Solution: Make sure you are logged in to the app\n');
    return;
  }

  console.log('✅ Authenticated as:', user.email || user.id);
  console.log('   User ID:', user.id);
  console.log('');

  // Check table structure
  console.log('📊 Checking table structure...');
  const { data: testInsert, error: insertError } = await supabase
    .from('meal_plans')
    .insert({
      user_id: user.id,
      week_start_date: '2025-12-02',
      day_of_week: 0,
      meal_type: 'dinner',
      is_leftover_night: true,
      status: 'planned'
    })
    .select()
    .single();

  if (insertError) {
    console.log('❌ Insert failed:', insertError.message);
    console.log('   Code:', insertError.code);
    console.log('   Details:', insertError.details);
    console.log('   Hint:', insertError.hint);
    
    if (insertError.message.includes('column "user_id" does not exist')) {
      console.log('\n💡 Solution: The user_id column is missing!');
      console.log('   Run the migration: docs/migrations/001_add_user_isolation.sql\n');
    } else if (insertError.message.includes('row-level security')) {
      console.log('\n💡 Solution: RLS policy is blocking the insert');
      console.log('   Check that the policy allows: WITH CHECK (auth.uid() = user_id)');
      console.log('   Verify in Supabase Dashboard > Authentication > Policies\n');
    } else if (insertError.message.includes('unique constraint')) {
      console.log('\n💡 Solution: Unique constraint violation');
      console.log('   The unique constraint might need to include user_id');
      console.log('   Check: docs/migrations/001_add_user_isolation.sql\n');
    }
    
    // Clean up test insert if it partially succeeded
    if (testInsert?.id) {
      await supabase.from('meal_plans').delete().eq('id', testInsert.id);
    }
    return;
  }

  console.log('✅ Test insert succeeded!');
  console.log('   Created entry:', testInsert.id);
  
  // Clean up
  await supabase.from('meal_plans').delete().eq('id', testInsert.id);
  console.log('✅ Cleaned up test entry\n');
  
  console.log('🎉 RLS is working correctly!');
  console.log('   If you still get errors, check:');
  console.log('   1. Browser console for detailed error messages');
  console.log('   2. Network tab to see the actual API request/response');
  console.log('   3. Supabase Dashboard > Logs for server-side errors\n');
}

diagnose().catch(console.error);

