/**
 * Setup Supabase Database
 * 
 * This script helps you set up Supabase for the first time.
 * Run this after creating your Supabase project.
 * 
 * Usage:
 *   node scripts/setup-supabase.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.log('📋 Supabase Setup Checklist\n');
  console.log('═'.repeat(60) + '\n');
  console.log('Step 1: Create Supabase Account');
  console.log('   → Go to https://supabase.com');
  console.log('   → Click "Start your project"');
  console.log('   → Sign up with GitHub (easiest)\n');
  
  console.log('Step 2: Create New Project');
  console.log('   → Click "New Project"');
  console.log('   → Name: aldi-meal-planning');
  console.log('   → Set a database password (save it!)');
  console.log('   → Choose region closest to you');
  console.log('   → Click "Create new project"');
  console.log('   → Wait ~2 minutes for setup\n');
  
  console.log('Step 3: Get Your Keys');
  console.log('   → Go to Settings (gear icon)');
  console.log('   → Click "API"');
  console.log('   → Copy "Project URL" and "anon public" key\n');
  
  console.log('Step 4: Add to .env file');
  console.log('   → Open .env in your project');
  console.log('   → Add these lines:');
  console.log('     SUPABASE_URL=https://xxxxx.supabase.co');
  console.log('     SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\n');
  
  console.log('Step 5: Run this script again\n');
  
  // Check if .env.example exists
  const envExamplePath = path.join(process.cwd(), '.env.example');
  if (!fs.existsSync(envExamplePath)) {
    fs.writeFileSync(envExamplePath, `# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key-here

# Notion (keep your existing keys)
NOTION_API_KEY=your-notion-key
NOTION_INGREDIENTS_DB_ID=your-id
NOTION_RECIPES_DB_ID=your-id
`);
    console.log('✅ Created .env.example file\n');
  }
  
  process.exit(0);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Test connection
 */
async function testConnection() {
  console.log('🔌 Testing Supabase connection...\n');
  
  try {
    const { data, error } = await supabase.from('recipes').select('count').limit(1);
    
    if (error && error.code === 'PGRST116') {
      // Table doesn't exist yet - that's okay, we'll create it
      console.log('⚠️  Database not set up yet. Running setup...\n');
      return false;
    } else if (error) {
      throw error;
    }
    
    console.log('✅ Connected to Supabase!\n');
    return true;
  } catch (error) {
    console.error('❌ Connection error:', error.message);
    console.error('\n💡 Check your SUPABASE_URL and SUPABASE_KEY in .env\n');
    process.exit(1);
  }
}

/**
 * Create schema using Supabase SQL
 */
async function createSchema() {
  console.log('📐 Creating database schema...\n');
  console.log('⚠️  IMPORTANT: Run the SQL schema in Supabase SQL Editor\n');
  console.log('   Steps:');
  console.log('   1. Go to: https://app.supabase.com');
  console.log('   2. Open your project');
  console.log('   3. Click "SQL Editor" in sidebar');
  console.log('   4. Click "New query"');
  console.log('   5. Copy the SQL from: docs/DATABASE_SCHEMA_SUPABASE.md');
  console.log('   6. Paste and click "Run"\n');
  
  // Read the schema file
  const schemaPath = path.join(process.cwd(), 'docs', 'DATABASE_SCHEMA_SUPABASE.md');
  if (fs.existsSync(schemaPath)) {
    console.log('📄 Schema file location:');
    console.log(`   ${schemaPath}\n`);
  }
  
  console.log('💡 After running the SQL, run:');
  console.log('   node scripts/setup-supabase.js --check\n');
}

/**
 * Check if schema exists
 */
async function checkSchema() {
  console.log('🔍 Checking database schema...\n');
  
  const tables = ['ingredients', 'recipes', 'recipe_ingredients', 'units', 'unit_conversions'];
  let allExist = true;
  
  for (const table of tables) {
    const { error } = await supabase.from(table).select('*').limit(1);
    
    if (error && error.code === 'PGRST116') {
      console.log(`❌ Table "${table}" does not exist`);
      allExist = false;
    } else if (error) {
      console.log(`⚠️  Error checking "${table}": ${error.message}`);
    } else {
      console.log(`✅ Table "${table}" exists`);
    }
  }
  
  if (allExist) {
    console.log('\n✅ All tables exist! Schema is set up correctly.\n');
    console.log('📝 Next steps:');
    console.log('   node scripts/migrate-to-supabase.js\n');
    return true;
  } else {
    console.log('\n❌ Schema not complete. Please run the SQL setup.\n');
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Supabase Setup\n');
  console.log('═'.repeat(60) + '\n');
  
  if (process.argv.includes('--check')) {
    await testConnection();
    await checkSchema();
  } else {
    await testConnection();
    await createSchema();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
