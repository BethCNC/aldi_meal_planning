#!/usr/bin/env node
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const SINGLE_USER_ID = process.env.VITE_SINGLE_USER_ID || process.argv[2];
if (!SINGLE_USER_ID) {
  console.error('Provide SINGLE_USER_ID via VITE_SINGLE_USER_ID in .env or as first argument');
  process.exit(1);
}

const DEFAULT_PREFS = {
  liked_ingredients: [
    'Chicken Breasts',
    'Pork Chops',
    'Steak',
    'Sausage',
    'Ground Beef',
    'Some seafood',
    'Simple'
  ],
  disliked_ingredients: [
    'spicy',
    'chicken thighs (dark meat)',
    'tofu',
    'casseroles'
  ],
  dietary_tags: []
};

async function upsert() {
  try {
    // Ensure an auth user exists for the single-user id so the
    // foreign-key constraint on `user_preferences.user_id` will succeed.
    try {
      const createResp = await supabase.auth.admin.createUser({
        id: SINGLE_USER_ID,
        email: process.env.VITE_SINGLE_USER_EMAIL || `${SINGLE_USER_ID}@dev.local`,
        email_confirm: true
      });

      if (createResp.error) {
        // If the user already exists, Supabase returns an error; ignore that case.
        if (createResp.error.message && /already exists/i.test(createResp.error.message)) {
          // noop - user exists
        } else {
          console.warn('Create user warning/error:', createResp.error);
        }
      } else {
        console.log('Created auth user for:', SINGLE_USER_ID);
      }
    } catch (e) {
      // Non-fatal: log and continue — some Supabase projects may manage users elsewhere.
      console.warn('Failed creating auth user (non-fatal):', e.message || e);
    }

    const payload = {
      user_id: SINGLE_USER_ID,
      ...DEFAULT_PREFS,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('user_preferences')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .maybeSingle();

    if (error) {
      console.error('Upsert error:', error);
      process.exit(1);
    }

    console.log('Upserted preferences for user:', SINGLE_USER_ID);
    console.log(JSON.stringify(data, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

upsert();
