import { supabase } from '../backend/supabase/client.js';
import dotenv from 'dotenv';

dotenv.config();

async function check() {
  const recipeIds = [
    '2da214f8-2820-4e87-be47-3de1b6fcf88c', // Ground Chicken Burgers
    '4b13d0f3-2817-473f-95ba-d969ba28bc96', // Creamy Chicken Fajita Pasta
    '8820949d-b3a7-4e60-b1d8-adda6258e727'  // Pesto Baked Chicken
  ];

  for (const id of recipeIds) {
    const { data: recipe } = await supabase.from('recipes').select('name').eq('id', id).single();
    const { data: ingredients } = await supabase.from('recipe_ingredients').select('*, ingredients(*)').eq('recipe_id', id);
    console.log(`Recipe: ${recipe.name} (${id})`);
    console.log(`Ingredient count: ${ingredients?.length || 0}`);
    if (ingredients && ingredients.length > 0) {
        console.log('Sample ingredient:', ingredients[0].ingredients?.item);
    }
    console.log('---');
  }
}

check();
