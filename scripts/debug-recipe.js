import { supabase } from '../backend/supabase/client.js';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

async function insert() {
  const { data, error } = await supabase.from('ingredients').insert({ 
      id: randomUUID(),
      item: 'black pepper', 
      price_per_package: 1.00, 
      package_size: 1, 
      package_unit: 'each', 
      base_unit: 'each', 
      price_per_base_unit: 1.00, 
      category: 'Pantry Staple', 
      aldi_price_cents: 100 
  }).select();
  
  if (error) {
      console.error('Error inserting black pepper:', error);
  } else {
      console.log('Inserted black pepper:', JSON.stringify(data, null, 2));
  }
}

insert();