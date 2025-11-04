import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFields() {
  const { data } = await supabase
    .from('recipes')
    .select('*')
    .limit(1)
    .single();

  if (!data) {
    console.log('No recipes found');
    return;
  }

  console.log('Recipe fields:\n');
  Object.keys(data).forEach(k => {
    const value = data[k];
    const type = typeof value;
    const length = value ? String(value).length : 0;
    console.log(`  ${k}: ${type} ${length > 0 ? `(${length} chars)` : '(null/empty)'}`);
    if (type === 'string' && length > 0 && length < 300) {
      console.log(`    Preview: ${String(value).substring(0, 100)}...`);
    }
  });
}

checkFields();
