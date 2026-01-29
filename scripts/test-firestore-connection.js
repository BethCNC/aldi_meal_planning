require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

async function main() {
  const raw = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  if (!raw) {
    console.error('FIREBASE_ADMIN_SERVICE_ACCOUNT not set');
    process.exit(2);
  }
  let json = raw;
  if ((json.startsWith("'") && json.endsWith("'")) || (json.startsWith('"') && json.endsWith('"'))) {
    json = json.slice(1, -1);
  }
  try {
    const sa = JSON.parse(json.replace(/\\n/g, '\n'));
    admin.initializeApp({ credential: admin.credential.cert(sa) });
  } catch (err) {
    console.error('Failed to parse service account JSON:', err.message);
    process.exit(3);
  }

  const db = admin.firestore();
  try {
    const cols = await db.listCollections();
    console.log('OK: connected to Firestore; collections:');
    cols.forEach(c => console.log(' -', c.id));
    process.exit(0);
  } catch (err) {
    console.error('Firestore error:', err);
    process.exit(1);
  }
}

main();
