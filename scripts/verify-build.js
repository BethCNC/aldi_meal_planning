#!/usr/bin/env node

/**
 * Verify that the application is ready for deployment
 * Checks for required files, environment variables, and build output
 */

import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

let errors = [];
let warnings = [];

console.log('🔍 Verifying deployment readiness...\n');

// Check if dist folder exists
const distPath = join(rootDir, 'dist');
if (!existsSync(distPath)) {
  errors.push('❌ dist/ folder not found. Run "npm run build" first.');
} else {
  console.log('✅ dist/ folder exists');
  
  // Check for index.html
  const indexPath = join(distPath, 'index.html');
  if (!existsSync(indexPath)) {
    errors.push('❌ dist/index.html not found');
  } else {
    console.log('✅ dist/index.html exists');
  }
}

// Check for .env file (optional, but recommended)
const envPath = join(rootDir, '.env');
if (!existsSync(envPath)) {
  warnings.push('⚠️  .env file not found. Create one from env.template');
} else {
  console.log('✅ .env file exists');
  
  // Check for required environment variables
  try {
    const envContent = readFileSync(envPath, 'utf-8');
    const requiredVars = [
      'SUPABASE_URL',
      'VITE_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'VITE_SUPABASE_ANON_KEY',
      'GEMINI_API_KEY'
    ];
    
    const missingVars = requiredVars.filter(varName => {
      const regex = new RegExp(`^${varName}=`, 'm');
      return !regex.test(envContent);
    });
    
    if (missingVars.length > 0) {
      warnings.push(`⚠️  Missing environment variables: ${missingVars.join(', ')}`);
    } else {
      console.log('✅ All required environment variables are present');
    }
  } catch (err) {
    warnings.push('⚠️  Could not read .env file');
  }
}

// Check for server files
const serverIndex = join(rootDir, 'server', 'index.js');
if (!existsSync(serverIndex)) {
  errors.push('❌ server/index.js not found');
} else {
  console.log('✅ server/index.js exists');
}

// Check for backend routes
const backendRoutes = join(rootDir, 'backend', 'routes');
if (!existsSync(backendRoutes)) {
  errors.push('❌ backend/routes/ folder not found');
} else {
  console.log('✅ backend/routes/ exists');
}

// Check package.json
const packageJson = join(rootDir, 'package.json');
if (!existsSync(packageJson)) {
  errors.push('❌ package.json not found');
} else {
  console.log('✅ package.json exists');
}

// Summary
console.log('\n' + '='.repeat(50));
if (errors.length > 0) {
  console.log('\n❌ ERRORS FOUND:');
  errors.forEach(error => console.log(`  ${error}`));
  console.log('\n⚠️  Please fix these errors before deploying.');
  process.exit(1);
}

if (warnings.length > 0) {
  console.log('\n⚠️  WARNINGS:');
  warnings.forEach(warning => console.log(`  ${warning}`));
  console.log('\n💡 These warnings should be addressed but won\'t prevent deployment.');
}

if (errors.length === 0 && warnings.length === 0) {
  console.log('\n✅ All checks passed! Ready for deployment.');
  console.log('\n📋 Next steps:');
  console.log('  1. Ensure all environment variables are set in .env');
  console.log('  2. Run: ./deploy.sh docker  (or your preferred method)');
  console.log('  3. Verify: curl http://localhost:3000/api/health');
}

process.exit(errors.length > 0 ? 1 : 0);
