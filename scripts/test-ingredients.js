import { supabase } from '../backend/supabase/client.js';
import dotenv from 'dotenv';

dotenv.config();

async function testIngredients() {
  try {
    console.log('Fetching ingredients...');
    const { data: ingredients, error } = await supabase
      .from('ingredients')
      .select('*')
      .limit(5);

    if (error) {
      console.error('Error fetching ingredients:', error);
      return;
    }

    console.log(`Successfully fetched ${ingredients.length} ingredients.`);
    
    if (ingredients.length > 0) {
      console.log('First ingredient:', JSON.stringify(ingredients[0], null, 2));
    } else {
      console.log('No ingredients found in the database.');
    }

    console.log('Fetching recipe_ingredients...');
    const { data: recipeIngredients, error: riError } = await supabase
      .from('recipe_ingredients')
      .select('*')
      .limit(5);

    if (riError) {
        console.error('Error fetching recipe_ingredients:', riError);
        return;
    }
    console.log(`Successfully fetched ${recipeIngredients.length} recipe_ingredients.`);
    if (recipeIngredients.length > 0) {
        console.log('First recipe_ingredient:', JSON.stringify(recipeIngredients[0], null, 2));
    } else {
        console.log('No recipe_ingredients found in the database.');
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testIngredients();
