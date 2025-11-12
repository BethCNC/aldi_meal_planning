/**
 * Check Frontend Environment Variables
 * 
 * Verifies that VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set
 */

import dotenv from 'dotenv';
import {readFileSync, existsSync} from 'fs';
import {fileURLToPath} from 'url';
import {dirname, join} from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load both .env and .env.local
dotenv.config();
const envLocalPath = join(__dirname, '..', '.env.local');
if (existsSync(envLocalPath)) {
  dotenv.config({path: envLocalPath, override: true});
}

console.log('🔍 Checking Frontend Environment Variables\n');

const viteSupabaseUrl = process.env.VITE_SUPABASE_URL;
const viteSupabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

console.log('Frontend Variables (VITE_*):');
console.log(`  VITE_SUPABASE_URL: ${viteSupabaseUrl ? '✅ Set' : '❌ Missing'}`);
if (viteSupabaseUrl) {
  console.log(`    Value: ${viteSupabaseUrl.substring(0, 30)}...`);
}
console.log(`  VITE_SUPABASE_ANON_KEY: ${viteSupabaseKey ? '✅ Set' : '❌ Missing'}`);
if (viteSupabaseKey) {
  console.log(`    Value: ${viteSupabaseKey.substring(0, 20)}...`);
}

console.log('\nBackend Variables:');
console.log(`  SUPABASE_URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`);
console.log(`  SUPABASE_KEY: ${supabaseKey ? '✅ Set' : '❌ Missing'}`);

if (!viteSupabaseUrl || !viteSupabaseKey) {
  console.log('\n❌ Frontend environment variables are missing!');
  console.log('\n📋 To fix this:');
  console.log('1. Open .env.local file');
  console.log('2. Add these lines:');
  console.log('');
  
  if (supabaseUrl && supabaseKey) {
    console.log(`   VITE_SUPABASE_URL=${supabaseUrl}`);
    console.log(`   VITE_SUPABASE_ANON_KEY=${supabaseKey}`);
    console.log('');
    console.log('💡 I can see you have SUPABASE_URL and SUPABASE_KEY set.');
    console.log('   You can copy those values to the VITE_ versions above.');
  } else {
    console.log('   VITE_SUPABASE_URL=your-supabase-url');
    console.log('   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key');
    console.log('');
    console.log('   Get these from: https://supabase.com/dashboard → Settings → API');
  }
  
  console.log('\n3. Restart the dev server (npm run dev)');
  console.log('   Vite only reads .env files on startup\n');
  process.exit(1);
} else {
  console.log('\n✅ All frontend environment variables are set!');
  console.log('\n💡 If you\'re still getting errors:');
  console.log('   1. Make sure you restarted the dev server after adding variables');
  console.log('   2. Check browser console for specific error messages');
  console.log('   3. Verify Supabase URL and key are correct\n');
}

