import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const searchTerms = ['oil', 'breadcrumb', 'bread crumb', 'salad', 'green', 'vinegar', 'pork chop', 'chop'];

async function search() {
  console.log('\n🔍 Searching for Ingredients\n');
  console.log('════════════════════════════════════════════════════════════\n');

  for (const term of searchTerms) {
    const { data } = await supabase
      .from('ingredients')
      .select('item, price_per_base_unit, base_unit')
      .ilike('item', `%${term}%`)
      .limit(10);

    if (data && data.length > 0) {
      console.log(`"${term}":`);
      data.forEach(ing => {
        const priceText = ing.price_per_base_unit 
          ? `$${ing.price_per_base_unit.toFixed(4)}/${ing.base_unit || 'unit'}` 
          : 'MISSING PRICE';
        console.log(`  • ${ing.item} - ${priceText}`);
      });
      console.log('');
    }
  }
}

search();
