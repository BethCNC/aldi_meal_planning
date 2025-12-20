import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyFeatures() {
  console.log('🔍 Verifying PRD Features...\n');

  // 1. Check New Tables
  const newTables = ['user_ratings', 'recipe_history', 'moderation_queue'];
  for (const table of newTables) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error && error.code === '42P01') {
      console.log(`❌ Table "${table}" MISSING`);
    } else if (error) {
      console.log(`⚠️  Table "${table}" error: ${error.message}`);
    } else {
      console.log(`✅ Table "${table}" exists (${count || 0} records)`);
    }
  }

  // 2. Check Recipe Columns
  console.log('\nChecking Recipes Table Columns...');
  const { data: recipeData, error: recipeError } = await supabase.from('recipes').select('is_verified, is_ai_generated, moderation_status').limit(1);
  if (recipeError) {
    console.log(`❌ Failed to query new recipe columns: ${recipeError.message}`);
  } else {
    console.log('✅ New columns in "recipes" verified (is_verified, is_ai_generated, moderation_status)');
  }

  // 3. Check User Preferences Columns
  console.log('\nChecking User Preferences Columns...');
  // We can't check columns directly without querying data, so we'll try to select them.
  // If no rows exist, we might get an empty array but no error if columns exist.
  // If columns don't exist, we get an error.
  const { data: prefData, error: prefError } = await supabase
    .from('user_preferences')
    .select('dietary_tags, liked_ingredients, disliked_ingredients')
    .limit(1);

  if (prefError) {
    console.log(`❌ Failed to query new preferences columns: ${prefError.message}`);
  } else {
    console.log('✅ New columns in "user_preferences" verified (dietary_tags, liked_ingredients, disliked_ingredients)');
  }

  console.log('\nVerification Complete.');
}

verifyFeatures();

