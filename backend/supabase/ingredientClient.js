import { randomUUID } from 'crypto';
import { supabase } from './client.js';

function mapToDbColumns(ingredient) {
  if (!ingredient?.item) {
    throw new Error('Ingredient "item" name is required');
  }

  return {
    id: ingredient.id,
    item: ingredient.item.trim(),
    price_per_package: ingredient.pricePerPackage ?? null,
    package_size: ingredient.packageSize ?? null,
    package_unit: ingredient.packageUnit ?? null,
    base_unit: ingredient.baseUnit ?? null,
    price_per_base_unit: ingredient.pricePerBaseUnit ?? null,
    category: ingredient.category ?? null,
    notes: ingredient.notes ?? null,
    notion_url: ingredient.notionUrl ?? null,
  };
}

export function normalizeIngredientRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    item: row.item,
    pricePerPackage: row.price_per_package,
    packageSize: row.package_size,
    packageUnit: row.package_unit,
    baseUnit: row.base_unit,
    pricePerBaseUnit: row.price_per_base_unit,
    category: row.category,
    notes: row.notes,
    notionUrl: row.notion_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function searchIngredientsByName(query, { limit = 10 } = {}) {
  if (!query || !query.trim()) {
    return [];
  }

  const term = query.trim();
  const { data, error } = await supabase
    .from('ingredients')
    .select('*')
    .ilike('item', `%${term}%`)
    .order('item')
    .limit(limit);

  if (error) throw error;
  return (data || []).map(normalizeIngredientRow);
}

export async function getIngredientById(id) {
  if (!id) return null;

  const { data, error } = await supabase
    .from('ingredients')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return normalizeIngredientRow(data);
}

export async function upsertIngredient(ingredient) {
  const id = ingredient.id || randomUUID();
  const record = mapToDbColumns({ ...ingredient, id });

  const { data, error } = await supabase
    .from('ingredients')
    .upsert(record, { onConflict: 'id' })
    .select()
    .single();

  if (error) throw error;
  return normalizeIngredientRow(data);
}

export async function listIngredientsByIds(ids) {
  if (!Array.isArray(ids) || ids.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('ingredients')
    .select('*')
    .in('id', ids);

  if (error) throw error;
  return (data || []).map(normalizeIngredientRow);
}

