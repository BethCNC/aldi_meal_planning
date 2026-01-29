require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

async function initAdmin() {
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
    const sa = JSON.parse(json);
    if (sa.private_key && sa.private_key.includes('\\n')) {
      sa.private_key = sa.private_key.replace(/\\n/g, '\n');
    }
    admin.initializeApp({ credential: admin.credential.cert(sa) });
  } catch (err) {
    console.error('Failed to parse service account JSON:', err.message);
    process.exit(3);
  }
}

(async () => {
  await initAdmin();
  const db = admin.firestore();
  const id = `test-${Date.now()}-${Math.floor(Math.random()*10000)}`;
  const ref = db.collection('test_connection').doc(id);
  const payload = { createdAt: admin.firestore.FieldValue.serverTimestamp(), tag: 'read-write-test' };

  try {
    await ref.set(payload);
    console.log('WROTE:', id);
  } catch (err) {
    console.error('WRITE FAILED:', err);
    process.exit(4);
  }

  try {
    const snap = await ref.get();
    if (!snap.exists) {
      console.error('READ FAILED: document missing after write');
      process.exit(5);
    }
    console.log('READ OK:', snap.id, Object.assign({}, snap.data()));
  } catch (err) {
    console.error('READ FAILED:', err);
    process.exit(6);
  }

  try {
    await ref.delete();
    console.log('DELETED:', id);
  } catch (err) {
    console.error('DELETE FAILED:', err);
    process.exit(7);
  }

  console.log('SUCCESS: read/write/delete completed');
  process.exit(0);
})();
