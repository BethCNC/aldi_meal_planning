// backend/firestore/firestoreClient.js
import admin from 'firebase-admin';

// Allow two ways to initialize for flexibility in local/dev and production:
// 1) Set FIREBASE_ADMIN_SERVICE_ACCOUNT with JSON string
// 2) Use Application Default Credentials (e.g., GOOGLE_APPLICATION_CREDENTIALS)
if (process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT) {
  try {
    const svc = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT);
    admin.initializeApp({ credential: admin.credential.cert(svc) });
  } catch (e) {
    console.error('Failed to parse FIREBASE_ADMIN_SERVICE_ACCOUNT:', e.message || e);
    throw e;
  }
} else if (!admin.apps.length) {
  admin.initializeApp();
}

export const db = admin.firestore();
export const firebaseAdmin = admin;
