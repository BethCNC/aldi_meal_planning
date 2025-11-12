/**
 * Setup Frontend Environment Variables
 * 
 * Adds VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local
 * using values from SUPABASE_URL and SUPABASE_KEY
 */

import dotenv from 'dotenv';
import {readFileSync, writeFileSync, existsSync, appendFileSync} from 'fs';
import {fileURLToPath} from 'url';
import {dirname, join} from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const envLocalPath = join(projectRoot, '.env.local');

// Load environment variables
dotenv.config();
if (existsSync(envLocalPath)) {
  dotenv.config({path: envLocalPath, override: true});
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL and SUPABASE_KEY must be set first');
  console.error('   Check your .env or .env.local file');
  process.exit(1);
}

console.log('🔧 Setting up frontend environment variables...\n');

// Read existing .env.local if it exists
let existingContent = '';
if (existsSync(envLocalPath)) {
  existingContent = readFileSync(envLocalPath, 'utf-8');
}

// Check if VITE variables already exist
const hasViteUrl = existingContent.includes('VITE_SUPABASE_URL');
const hasViteKey = existingContent.includes('VITE_SUPABASE_ANON_KEY');

if (hasViteUrl && hasViteKey) {
  console.log('✅ VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY already exist in .env.local');
  console.log('   No changes needed.\n');
  process.exit(0);
}

// Prepare new content
let newContent = existingContent;

if (!hasViteUrl) {
  newContent += `\n# Frontend Supabase Configuration\n`;
  newContent += `VITE_SUPABASE_URL=${supabaseUrl}\n`;
}

if (!hasViteKey) {
  if (!hasViteUrl) {
    // Already added comment above
  } else {
    newContent += `\n# Frontend Supabase Configuration\n`;
  }
  newContent += `VITE_SUPABASE_ANON_KEY=${supabaseKey}\n`;
}

// Write to file
writeFileSync(envLocalPath, newContent.trim() + '\n', 'utf-8');

console.log('✅ Added to .env.local:');
if (!hasViteUrl) {
  console.log(`   VITE_SUPABASE_URL=${supabaseUrl.substring(0, 30)}...`);
}
if (!hasViteKey) {
  console.log(`   VITE_SUPABASE_ANON_KEY=${supabaseKey.substring(0, 20)}...`);
}

console.log('\n📋 Next steps:');
console.log('   1. Restart your dev server:');
console.log('      - Stop the current server (Ctrl+C)');
console.log('      - Run: npm run dev');
console.log('   2. Refresh your browser');
console.log('   3. Try generating a meal plan again\n');

