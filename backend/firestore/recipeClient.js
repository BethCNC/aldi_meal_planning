// backend/firestore/recipeClient.js
import { randomUUID } from 'crypto';
import { db } from './firestoreClient.js';

function normalizeRecipeRow(id, data) {
  if (!data) return null;
  return {
    id,
    name: data.name,
    servings: data.servings,
    category: data.category,
    totalCost: data.total_cost,
    costPerServing: data.cost_per_serving,
    instructions: data.instructions,
    sourceUrl: data.source_url,
    imageUrl: data.image_url,
    tags: data.tags,
    notionUrl: data.notion_url,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    proteinCategory: data.protein_category,
    textureProfile: data.texture_profile,
    prepEffortLevel: data.prep_effort_level,
    description: data.description,
    rating: data.rating
  };
}

async function fetchRecipeIngredientsWithJoin(recipeId) {
  const riSnap = await db.collection('recipe_ingredients').where('recipe_id', '==', recipeId).get();
  const items = [];
  for (const doc of riSnap.docs) {
    const ri = { id: doc.id, ...doc.data() };
    let ingredient = null;
    if (ri.ingredient_id) {
      const ingDoc = await db.collection('ingredients').doc(ri.ingredient_id).get();
      if (ingDoc.exists) ingredient = { id: ingDoc.id, ...ingDoc.data() };
    }
    items.push({ ...ri, ingredient });
  }
  return items;
}

export async function getRecipes(filters = {}) {
  let q = db.collection('recipes');
  if (filters.category) q = q.where('category', '==', filters.category);
  if (filters.maxCostPerServing) q = q.where('cost_per_serving', '<=', filters.maxCostPerServing);

  const snap = await q.get();
  const results = [];
  for (const doc of snap.docs) {
    const recipe = normalizeRecipeRow(doc.id, doc.data());
    const ingredients = await fetchRecipeIngredientsWithJoin(doc.id);
    results.push({ ...recipe, recipe_ingredients: ingredients });
  }
  // sort by name to match previous behavior
  results.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  return results;
}

export async function getRecipeById(id) {
  const doc = await db.collection('recipes').doc(id).get();
  if (!doc.exists) return null;
  const recipe = normalizeRecipeRow(doc.id, doc.data());
  const ingredients = await fetchRecipeIngredientsWithJoin(doc.id);
  return { ...recipe, recipe_ingredients: ingredients };
}

export async function getRecipeIngredients(recipeId) {
  return await fetchRecipeIngredientsWithJoin(recipeId);
}

export async function findRecipeByName(name) {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;

  // Exact match
  const exactSnap = await db.collection('recipes').where('name', '==', trimmed).limit(1).get();
  if (!exactSnap.empty) {
    const doc = exactSnap.docs[0];
    return normalizeRecipeRow(doc.id, doc.data());
  }

  // Fallback: case-insensitive search by fetching a small sample and comparing
  const allSnap = await db.collection('recipes').get();
  const lower = trimmed.toLowerCase();
  for (const doc of allSnap.docs) {
    const n = (doc.data().name || '').toLowerCase();
    if (n === lower || n.includes(lower)) return normalizeRecipeRow(doc.id, doc.data());
  }
  return null;
}

export async function upsertRecipe(recipe) {
  const id = recipe.id || randomUUID();
  const record = {
    id,
    name: recipe.name?.trim(),
    servings: recipe.servings ?? null,
    category: recipe.category ?? null,
    total_cost: recipe.totalCost ?? null,
    cost_per_serving: recipe.costPerServing ?? null,
    instructions: recipe.instructions ?? null,
    source_url: recipe.sourceUrl ?? null,
    tags: Array.isArray(recipe.tags) ? recipe.tags.filter(Boolean).join(', ') : recipe.tags ?? null,
    notion_url: recipe.notionUrl ?? null,
    protein_category: recipe.proteinCategory ?? null,
    texture_profile: recipe.textureProfile ?? null,
    prep_effort_level: recipe.prepEffortLevel ?? null,
    description: recipe.description ?? null,
    image_url: recipe.imageUrl ?? null,
    rating: recipe.rating ?? null,
    created_at: recipe.createdAt ?? new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  await db.collection('recipes').doc(id).set(record, { merge: true });
  const saved = await db.collection('recipes').doc(id).get();
  return normalizeRecipeRow(saved.id, saved.data());
}

export async function deleteRecipeIngredients(recipeId) {
  if (!recipeId) return;
  const snap = await db.collection('recipe_ingredients').where('recipe_id', '==', recipeId).get();
  const batch = db.batch();
  for (const doc of snap.docs) batch.delete(doc.ref);
  await batch.commit();
}

export async function insertRecipeIngredients(recipeId, ingredients) {
  if (!recipeId) throw new Error('recipeId is required to insert recipe ingredients');
  if (!Array.isArray(ingredients) || ingredients.length === 0) return [];

  const batch = db.batch();
  const inserted = [];
  for (const ing of ingredients) {
    const payload = {
      recipe_id: recipeId,
      ingredient_id: ing.ingredientId ?? null,
      quantity: ing.quantity ?? null,
      unit: ing.unit ?? null,
      ingredient_name: ing.ingredientName ?? ing.rawLine ?? null,
      raw_line: ing.rawLine ?? null,
      calculated_cost: ing.calculatedCost ?? null,
      matched_with_fuzzy: !!ing.matchedWithFuzzy
    };
    const ref = db.collection('recipe_ingredients').doc();
    batch.set(ref, payload);
    inserted.push({ id: ref.id, ...payload });
  }
  await batch.commit();
  return inserted;
}

export async function replaceRecipeIngredients(recipeId, ingredients) {
  await deleteRecipeIngredients(recipeId);
  if (!ingredients?.length) return [];
  return insertRecipeIngredients(recipeId, ingredients);
}

export async function updateRecipeRating(recipeId, rating) {
  if (!recipeId || rating === undefined) throw new Error('Recipe ID and rating are required.');
  const ref = db.collection('recipes').doc(recipeId);
  await ref.update({ rating, updated_at: new Date().toISOString() });
  const saved = await ref.get();
  return normalizeRecipeRow(saved.id, saved.data());
}
