// backend/firestore/ingredientClient.js
import { randomUUID } from 'crypto';
import { db } from './firestoreClient.js';

function normalizeIngredientRow(id, data) {
  if (!data) return null;
  return {
    id,
    item: data.item,
    pricePerPackage: data.price_per_package,
    packageSize: data.package_size,
    packageUnit: data.package_unit,
    baseUnit: data.base_unit,
    pricePerBaseUnit: data.price_per_base_unit,
    category: data.category,
    notes: data.notes,
    notionUrl: data.notion_url,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    aldiPriceCents: data.aldi_price_cents,
    unitSize: data.unit_size
  };
}

export async function searchIngredientsByName(query, { limit = 10 } = {}) {
  if (!query || !query.trim()) return [];
  const term = query.trim().toLowerCase();

  const snap = await db.collection('ingredients').get();
  const results = [];
  for (const doc of snap.docs) {
    const item = (doc.data().item || '').toLowerCase();
    if (item.includes(term)) results.push(normalizeIngredientRow(doc.id, doc.data()));
    if (results.length >= limit) break;
  }
  // sort by item
  results.sort((a, b) => (a.item || '').localeCompare(b.item || ''));
  return results;
}

export async function getIngredientById(id) {
  if (!id) return null;
  const doc = await db.collection('ingredients').doc(id).get();
  if (!doc.exists) return null;
  return normalizeIngredientRow(doc.id, doc.data());
}

export async function upsertIngredient(ingredient) {
  const id = ingredient.id || randomUUID();
  const record = {
    id,
    item: ingredient.item?.trim(),
    price_per_package: ingredient.pricePerPackage ?? null,
    package_size: ingredient.packageSize ?? null,
    package_unit: ingredient.packageUnit ?? null,
    base_unit: ingredient.baseUnit ?? null,
    price_per_base_unit: ingredient.pricePerBaseUnit ?? null,
    category: ingredient.category ?? null,
    notes: ingredient.notes ?? null,
    notion_url: ingredient.notionUrl ?? null,
    aldi_price_cents: ingredient.aldiPriceCents ?? null,
    unit_size: ingredient.unitSize ?? null,
    created_at: ingredient.createdAt ?? new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  await db.collection('ingredients').doc(id).set(record, { merge: true });
  const saved = await db.collection('ingredients').doc(id).get();
  return normalizeIngredientRow(saved.id, saved.data());
}

export async function listIngredientsByIds(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  const results = [];
  for (const id of ids) {
    const doc = await db.collection('ingredients').doc(id).get();
    if (doc.exists) results.push(normalizeIngredientRow(doc.id, doc.data()));
  }
  return results;
}
