import { randomUUID } from 'crypto';
import { supabase } from './client.js';

function mapRecipeToDbColumns(recipe) {
  if (!recipe?.name) {
    throw new Error('Recipe "name" is required');
  }

  return {
    id: recipe.id,
    name: recipe.name.trim(),
    servings: recipe.servings ?? null,
    category: recipe.category ?? null,
    total_cost: recipe.totalCost ?? null,
    cost_per_serving: recipe.costPerServing ?? null,
    instructions: recipe.instructions ?? null,
    source_url: recipe.sourceUrl ?? null,
    tags: Array.isArray(recipe.tags)
      ? recipe.tags.filter(Boolean).join(', ')
      : recipe.tags ?? null,
    notion_url: recipe.notionUrl ?? null,
    protein_category: recipe.proteinCategory ?? null,
    texture_profile: recipe.textureProfile ?? null,
    prep_effort_level: recipe.prepEffortLevel ?? null,
    description: recipe.description ?? null
  };
}

function mapRecipeIngredientToDbColumns(recipeId, ingredient) {
  if (!recipeId) throw new Error('recipeId is required');
  if (!ingredient?.ingredientId) throw new Error('ingredientId is required for recipe ingredient');

  return {
    recipe_id: recipeId,
    ingredient_id: ingredient.ingredientId,
    quantity: ingredient.quantity ?? null,
    unit: ingredient.unit ?? null,
    ingredient_name: ingredient.ingredientName ?? ingredient.rawLine ?? null,
    raw_line: ingredient.rawLine ?? null,
    calculated_cost: ingredient.calculatedCost ?? null,
    matched_with_fuzzy: ingredient.matchedWithFuzzy ?? false
  };
}

export function normalizeRecipeRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    servings: row.servings,
    category: row.category,
    totalCost: row.total_cost,
    costPerServing: row.cost_per_serving,
    instructions: row.instructions,
    sourceUrl: row.source_url,
    imageUrl: row.image_url,
    tags: row.tags,
    notionUrl: row.notion_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    proteinCategory: row.protein_category,
    textureProfile: row.texture_profile,
    prepEffortLevel: row.prep_effort_level,
    description: row.description
  };
}

export async function getRecipes(filters = {}) {
  let query = supabase
    .from('recipes')
    .select(`
      *,
      recipe_ingredients(
        *,
        ingredient:ingredients(*)
      )
    `);
  
  if (filters.category) query = query.eq('category', filters.category);
  if (filters.maxCostPerServing) query = query.lte('cost_per_serving', filters.maxCostPerServing);
  
  const { data, error } = await query.order('name');
  if (error) throw error;
  return data;
}

export async function getRecipeById(id) {
  const { data, error } = await supabase
    .from('recipes')
    .select(`
      *,
      recipe_ingredients(
        *,
        ingredient:ingredients(*)
      )
    `)
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

export async function getRecipeIngredients(recipeId) {
  const { data, error } = await supabase
    .from('recipe_ingredients')
    .select(`
      *,
      ingredient:ingredients(*)
    `)
    .eq('recipe_id', recipeId);
  
  if (error) throw error;
  return data;
}

export async function findRecipeByName(name) {
  if (!name) return null;

  const trimmed = name.trim();
  if (!trimmed) return null;

  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('name', trimmed)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  if (data) {
    return normalizeRecipeRow(data);
  }

  const { data: fallbackData, error: fallbackError } = await supabase
    .from('recipes')
    .select('*')
    .ilike('name', trimmed)
    .maybeSingle();

  if (fallbackError && fallbackError.code !== 'PGRST116') {
    throw fallbackError;
  }

  return normalizeRecipeRow(fallbackData);
}

export async function upsertRecipe(recipe) {
  const id = recipe.id || randomUUID();
  const record = mapRecipeToDbColumns({ ...recipe, id });

  const { data, error } = await supabase
    .from('recipes')
    .upsert(record, { onConflict: 'id' })
    .select()
    .single();

  if (error) throw error;
  return normalizeRecipeRow(data);
}

export async function deleteRecipeIngredients(recipeId) {
  if (!recipeId) return;

  const { error } = await supabase
    .from('recipe_ingredients')
    .delete()
    .eq('recipe_id', recipeId);

  if (error) throw error;
}

export async function insertRecipeIngredients(recipeId, ingredients) {
  if (!recipeId) {
    throw new Error('recipeId is required to insert recipe ingredients');
  }

  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    return [];
  }

  const payload = ingredients.map((ingredient) =>
    mapRecipeIngredientToDbColumns(recipeId, ingredient)
  );

  const { data, error } = await supabase
    .from('recipe_ingredients')
    .insert(payload)
    .select();

  if (error) throw error;
  return data;
}

export async function replaceRecipeIngredients(recipeId, ingredients) {
  await deleteRecipeIngredients(recipeId);
  if (!ingredients?.length) return [];
  return insertRecipeIngredients(recipeId, ingredients);
}
