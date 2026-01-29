#!/usr/bin/env node
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
<<<<<<< Updated upstream
#!/usr/bin/env node
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import admin from 'firebase-admin';

dotenv.config();

const useFirestore = !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.USE_FIRESTORE === '1';
let supabase;
let firestore;

if (!useFirestore) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }

  supabase = createClient(supabaseUrl, supabaseKey);
} else {
  // Initialize Firebase Admin with service account JSON passed via env var
  try {
    const svcJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!svcJson) {
      console.error('FIREBASE_SERVICE_ACCOUNT_JSON is required to use Firestore');
      process.exit(1);
    }

    const svc = JSON.parse(svcJson);
    admin.initializeApp({ credential: admin.credential.cert(svc) });
    firestore = admin.firestore();
  } catch (e) {
    console.error('Failed to initialize Firestore:', e.message || e);
    process.exit(1);
  }
}
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
<<<<<<< Updated upstream
    // Ensure an auth user exists for the single-user id so the
    // foreign-key constraint on `user_preferences.user_id` will succeed.
=======
    const payload = {
      user_id: SINGLE_USER_ID,
      ...DEFAULT_PREFS,
      updated_at: new Date().toISOString()
    };

    if (useFirestore) {
      // In Firestore, store under collection 'user_preferences' with doc id = user id
      await firestore.collection('user_preferences').doc(SINGLE_USER_ID).set(payload, { merge: true });
      const snap = await firestore.collection('user_preferences').doc(SINGLE_USER_ID).get();
      console.log('Upserted preferences for user (Firestore):', SINGLE_USER_ID);
      console.log(JSON.stringify({ id: snap.id, data: snap.data() }, null, 2));
      process.exit(0);
    }

    // Supabase path (existing behavior)
>>>>>>> Stashed changes
    try {
      const createResp = await supabase.auth.admin.createUser({
        id: SINGLE_USER_ID,
        email: process.env.VITE_SINGLE_USER_EMAIL || `${SINGLE_USER_ID}@dev.local`,
        email_confirm: true
      });

      if (createResp.error) {
<<<<<<< Updated upstream
        // If the user already exists, Supabase returns an error; ignore that case.
=======
>>>>>>> Stashed changes
        if (createResp.error.message && /already exists/i.test(createResp.error.message)) {
          // noop - user exists
        } else {
          console.warn('Create user warning/error:', createResp.error);
        }
      } else {
        console.log('Created auth user for:', SINGLE_USER_ID);
      }
    } catch (e) {
<<<<<<< Updated upstream
      // Non-fatal: log and continue — some Supabase projects may manage users elsewhere.
      console.warn('Failed creating auth user (non-fatal):', e.message || e);
    }

    const payload = {
      user_id: SINGLE_USER_ID,
      ...DEFAULT_PREFS,
      updated_at: new Date().toISOString()
    };

=======
      console.warn('Failed creating auth user (non-fatal):', e.message || e);
    }

>>>>>>> Stashed changes
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .maybeSingle();

    if (error) {
      console.error('Upsert error:', error);
      process.exit(1);
    }

<<<<<<< Updated upstream
    console.log('Upserted preferences for user:', SINGLE_USER_ID);
=======
    console.log('Upserted preferences for user (Supabase):', SINGLE_USER_ID);
>>>>>>> Stashed changes
    console.log(JSON.stringify(data, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

upsert();
