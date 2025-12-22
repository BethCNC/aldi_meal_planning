import { supabase } from '../backend/supabase/client.js';
import dotenv from 'dotenv';

dotenv.config();

async function debug() {
  const { data } = await supabase.from('ingredients').select('*').ilike('item', 'olive oil').single();
  console.log(JSON.stringify(data, null, 2));
}

debug();
