import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

console.log('--- Connection Debugger ---');
console.log(`URL Configured: ${url ? 'Yes' : 'No'}`);
console.log(`URL Value: ${url}`);
console.log(`Key Configured: ${key ? 'Yes' : 'No'}`);

if (!url) {
  console.error('❌ Error: Missing SUPABASE_URL');
  process.exit(1);
}

async function testFetch() {
  console.log('\nTesting raw fetch to Supabase...');
  try {
    // Try to hit the rest/v1 endpoint which usually returns JSON or 401
    const res = await fetch(`${url}/rest/v1/`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });
    console.log(`Status: ${res.status} ${res.statusText}`);
    console.log('✅ Fetch connection successful!');
  } catch (e) {
    console.error('❌ Fetch failed:', e.cause || e.message);
    if (e.cause) console.error('Cause:', e.cause);
  }
}

testFetch();

