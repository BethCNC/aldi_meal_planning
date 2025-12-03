/**
 * Fix ingredient links for the 4 new recipes we added
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Recipe data with ingredients
const recipes = [
  {
    id: 'efe9291f-3a24-49ab-af90-89438b06c526',
    name: 'Lemon Garlic Butter Chicken and Asparagus',
    ingredients: [
      { item: 'Chicken breast', quantity: 1.5, unit: 'lb' },
      { item: 'Onion powder', quantity: 2, unit: 'tsp' },
      { item: 'Italian seasoning', quantity: 1, unit: 'tbs' },
      { item: 'Paprika', quantity: 1, unit: 'tsp' },
      { item: 'Asparagus', quantity: 1, unit: 'bunch' },
      { item: 'Butter', quantity: 0.5, unit: 'cup' },
      { item: 'Olive oil', quantity: 1, unit: 'tsp' },
      { item: 'Garlic', quantity: 1, unit: 'tbs' },
      { item: 'Chicken broth', quantity: 0.25, unit: 'cup' },
      { item: 'Lemon juice', quantity: 2, unit: 'tbs' },
      { item: 'Hot sauce', quantity: 1, unit: 'tbs' }
    ]
  },
  {
    id: 'a5f5fc9e-7d77-458c-be04-13599b510882',
    name: 'Copycat Crunchwraps',
    ingredients: [
      { item: 'Ground beef', quantity: 1, unit: 'lb' },
      { item: 'Taco seasoning', quantity: 1, unit: 'packet' },
      { item: 'Large flour tortillas', quantity: 4, unit: 'each' },
      { item: 'Nacho cheese', quantity: 0.5, unit: 'cup' },
      { item: 'Tostadas', quantity: 4, unit: 'each' },
      { item: 'Sour cream', quantity: 0.5, unit: 'cup' },
      { item: 'Shredded lettuce', quantity: 2, unit: 'cups' },
      { item: 'Tomatoes', quantity: 2, unit: 'each' },
      { item: 'Cheddar cheese', quantity: 1, unit: 'cup' },
      { item: 'Butter', quantity: 1, unit: 'tbs' }
    ]
  },
  {
    id: 'cbfb0761-e675-471f-9962-165e8d4368f5',
    name: 'Teriyaki Chicken and Crispy Brussel Sprout & Broccoli Bowls',
    ingredients: [
      { item: 'Chicken breast', quantity: 1.5, unit: 'lb' },
      { item: 'Teriyaki sauce', quantity: 1, unit: 'cup' },
      { item: 'Brussel sprouts', quantity: 1, unit: 'lb' },
      { item: 'Broccoli', quantity: 1, unit: 'lb' },
      { item: 'Olive oil', quantity: 1, unit: 'tbs' },
      { item: 'Garlic powder', quantity: 1, unit: 'tsp' },
      { item: 'Onion powder', quantity: 1, unit: 'tsp' },
      { item: 'Rice', quantity: 2, unit: 'cups' }
    ]
  },
  {
    id: '16609c3f-87e9-4ac0-92e8-cbe197a3133e',
    name: 'One Pot Creamy Cheesy Beef Pasta',
    ingredients: [
      { item: 'Ground beef', quantity: 1, unit: 'lb' },
      { item: 'Onion', quantity: 1, unit: 'each' },
      { item: 'Olive oil', quantity: 1, unit: 'tbs' },
      { item: 'Italian seasoning', quantity: 1, unit: 'tbs' },
      { item: 'Paprika', quantity: 1, unit: 'tbs' },
      { item: 'Tomato paste', quantity: 3, unit: 'tbs' },
      { item: 'Heavy cream', quantity: 1, unit: 'cup' },
      { item: 'Beef broth', quantity: 3, unit: 'cups' },
      { item: 'Pasta', quantity: 1, unit: 'lb' },
      { item: 'Cheddar cheese', quantity: 1, unit: 'cup' }
    ]
  }
];

async function findIngredient(itemName) {
  // Try exact match first
  const { data: exact } = await supabase
    .from('ingredients')
    .select('id, item')
    .ilike('item', itemName)
    .limit(1)
    .maybeSingle();

  if (exact) return exact.id;

  // Try partial match
  const { data: partial } = await supabase
    .from('ingredients')
    .select('id, item')
    .ilike('item', `%${itemName}%`)
    .limit(1)
    .maybeSingle();

  return partial?.id || null;
}

async function fixRecipeIngredients() {
  console.log('\n🔗 Fixing Recipe Ingredient Links\n');
  console.log('════════════════════════════════════════════════════════════\n');

  for (const recipe of recipes) {
    console.log(`📝 Processing: ${recipe.name}`);
    
    // Delete existing links for this recipe
    await supabase
      .from('recipe_ingredients')
      .delete()
      .eq('recipe_id', recipe.id);

    let linkedCount = 0;
    let missingCount = 0;

    for (const ing of recipe.ingredients) {
      const ingredientId = await findIngredient(ing.item);
      
      if (!ingredientId) {
        console.log(`   ⚠️  Not found: ${ing.item}`);
        missingCount++;
        continue;
      }

      // Insert with all required fields
      const { error } = await supabase
        .from('recipe_ingredients')
        .insert({
          recipe_id: recipe.id,
          ingredient_id: ingredientId,
          quantity: ing.quantity,
          unit: ing.unit,
          ingredient_name: ing.item, // Required
          raw_line: `${ing.quantity} ${ing.unit} ${ing.item}` // Required
        });

      if (error) {
        console.log(`   ❌ Failed to link ${ing.item}: ${error.message}`);
      } else {
        linkedCount++;
      }
    }

    console.log(`   ✅ Linked: ${linkedCount} | ⚠️  Missing: ${missingCount}\n`);
  }

  console.log('✨ Done! Recipes should now have ingredient links.\n');
}

fixRecipeIngredients().catch(console.error);

