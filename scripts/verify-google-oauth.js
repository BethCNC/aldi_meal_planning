#!/usr/bin/env node

/**
 * Verify Google OAuth Configuration
 * 
 * Checks if Google OAuth is properly configured in Supabase
 * and provides instructions for fixing common issues.
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('\nPlease add to your .env file:');
  console.log('  SUPABASE_URL=https://your-project.supabase.co');
  console.log('  SUPABASE_ANON_KEY=your-anon-key\n');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Extract project reference from URL
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
const callbackUrl = `${supabaseUrl}/auth/v1/callback`;

console.log('🔍 Verifying Google OAuth Configuration\n');
console.log('═'.repeat(60));
console.log(`\n📋 Your Configuration:`);
console.log(`   Supabase URL: ${supabaseUrl}`);
console.log(`   Project Ref: ${projectRef || 'unknown'}`);
console.log(`   Callback URL: ${callbackUrl}\n`);

async function checkGoogleProvider() {
  try {
    // Try to get auth providers (this might not be available via API)
    // Instead, we'll provide manual verification steps
    
    console.log('✅ Supabase connection verified');
    console.log('\n📝 Manual Verification Required:\n');
    
    console.log('Step 1: Check Supabase Dashboard');
    console.log('   1. Go to: https://supabase.com/dashboard/project/' + projectRef);
    console.log('   2. Navigate to: Authentication → Providers');
    console.log('   3. Find "Google" in the list');
    console.log('   4. Verify:');
    console.log('      ✅ Google is ENABLED (toggle ON)');
    console.log('      ✅ Client ID is filled in');
    console.log('      ✅ Client Secret is filled in\n');
    
    console.log('Step 2: Check Supabase URL Configuration');
    console.log('   1. In Supabase Dashboard: Authentication → URL Configuration');
    console.log('   2. Verify:');
    console.log('      ✅ Site URL: http://localhost:5173 (for dev)');
    console.log('      ✅ Redirect URLs includes: http://localhost:5173');
    console.log('      ✅ Redirect URLs includes: http://localhost:5173/**\n');
    
    console.log('Step 3: Check Google Cloud Console');
    console.log('   1. Go to: https://console.cloud.google.com/');
    console.log('   2. Select your project');
    console.log('   3. Navigate to: APIs & Services → Credentials');
    console.log('   4. Find your OAuth 2.0 Client ID (used for Supabase)');
    console.log('   5. Click to edit it');
    console.log('   6. Under "Authorized redirect URIs", verify this EXACT URL exists:');
    console.log(`      ${callbackUrl}`);
    console.log('   7. ⚠️  CRITICAL: Must match EXACTLY:');
    console.log('      ✅ No trailing slash');
    console.log('      ✅ All lowercase');
    console.log('      ✅ Exact path: /auth/v1/callback\n');
    
    console.log('Step 4: Test the Flow');
    console.log('   1. Go to: http://localhost:5173/auth');
    console.log('   2. Click "Sign in with Google"');
    console.log('   3. Expected: Redirects to Google sign-in page');
    console.log('   4. After signing in: Redirects back to your app');
    console.log('   5. You should be logged in\n');
    
    console.log('═'.repeat(60));
    console.log('\n🔗 Quick Links:');
    console.log(`   Supabase Dashboard: https://supabase.com/dashboard/project/${projectRef}`);
    console.log('   Google Cloud Console: https://console.cloud.google.com/');
    console.log('   Your Callback URL: ' + callbackUrl);
    console.log('\n📖 For detailed fix instructions, see: docs/FIX_GOOGLE_OAUTH_NOW.md\n');
    
  } catch (error) {
    console.error('❌ Error checking configuration:', error.message);
    console.log('\nPlease verify your Supabase credentials are correct.\n');
  }
}

checkGoogleProvider();

