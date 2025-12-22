import { supabase } from '../backend/supabase/client.js';
import dotenv from 'dotenv';

dotenv.config();

async function list() {
  const { data } = await supabase.from('ingredients').select('item').order('item');
  console.log(data.map(i => i.item).join('\n'));
}

list();
