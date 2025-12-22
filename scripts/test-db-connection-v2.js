import { getRecipes } from '../backend/supabase/recipeClient.js';
import dotenv from 'dotenv';

dotenv.config();

async function testConnection() {
  try {
    console.log('Fetching recipes...');
    const recipes = await getRecipes();
    console.log(`Successfully fetched ${recipes.length} recipes.`);
    
    if (recipes.length > 0) {
      console.log('First recipe:', JSON.stringify(recipes[0], null, 2));
    } else {
      console.log('No recipes found in the database.');
    }
  } catch (error) {
    console.error('Error fetching recipes:', error);
  }
}

testConnection();
