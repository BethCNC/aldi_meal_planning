import { supabase } from '../backend/supabase/client.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkDataIntegrity() {
  try {
    console.log('Checking data integrity...');

    // 1. Total Recipes
    const { count: totalRecipes, error: countError } = await supabase
      .from('recipes')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;
    console.log(`Total Recipes: ${totalRecipes}`);

    // 2. Recipes with no ingredients
    // We can't easily do a "left join where null" with simple select in one go without raw SQL or rpc, 
    // so we'll fetch all recipes and their ingredient counts.
    // Actually, we can select id, recipe_ingredients(count).
    
    const { data: recipesWithIngCount, error: ingError } = await supabase
      .from('recipes')
      .select('id, name, recipe_ingredients(count)');
    
    if (ingError) throw ingError;

    const noIngredients = recipesWithIngCount.filter(r => r.recipe_ingredients[0].count === 0);
    console.log(`Recipes with 0 ingredients: ${noIngredients.length}`);
    if (noIngredients.length > 0) {
        console.log('Sample recipes with no ingredients:', noIngredients.slice(0, 5).map(r => r.name));
    }

    // 3. Recipes with missing metadata
    const { count: missingMeta, error: metaError } = await supabase
      .from('recipes')
      .select('*', { count: 'exact', head: true })
      .or('protein_category.is.null,texture_profile.is.null,cost_per_serving.is.null');

    if (metaError) throw metaError;
    console.log(`Recipes with missing metadata (protein, texture, or cost): ${missingMeta}`);

  } catch (error) {
    console.error('Error checking integrity:', error);
  }
}

checkDataIntegrity();
