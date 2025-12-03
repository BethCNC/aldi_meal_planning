/**
 * Add the 4 new recipes from images to the database
 * Also sets dietary preference for chicken breast only
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Recipe data from images
const newRecipes = [
  {
    name: 'Lemon Garlic Butter Chicken and Asparagus',
    category: 'Chicken',
    servings: 4,
    instructions: `1. Cut chicken into bite-sized pieces and season with onion powder, Italian seasoning, paprika, and salt and pepper to taste. Let chicken marinate in seasonings in fridge.
2. Wash and trim ends of asparagus. Drain and arrange on one side of a baking sheet, then sprinkle with salt and pepper.
3. In a small bowl, combine melted butter, olive oil, minced garlic, chicken broth, hot sauce, and lemon juice.
4. Arrange chicken bites on baking sheet next to asparagus. Drizzle sauce over chicken and asparagus. Save about 1/4 of sauce.
5. Transfer to oven and bake at 400 degrees for 20-25 minutes.
6. Remove from oven, drizzle with remaining sauce, and enjoy!`,
    ingredients: [
      { item: 'Chicken breast', quantity: 1.5, unit: 'lb', notes: 'Cut into bite-sized pieces' },
      { item: 'Onion powder', quantity: 2, unit: 'tsp' },
      { item: 'Italian seasoning', quantity: 1, unit: 'tbs' },
      { item: 'Paprika', quantity: 1, unit: 'tsp' },
      { item: 'Asparagus', quantity: 1, unit: 'bunch', notes: 'Rinsed and trimmed' },
      { item: 'Butter', quantity: 0.5, unit: 'cup', notes: 'Melted' },
      { item: 'Olive oil', quantity: 1, unit: 'tsp' },
      { item: 'Garlic', quantity: 1, unit: 'tbs', notes: 'Minced' },
      { item: 'Chicken broth', quantity: 0.25, unit: 'cup' },
      { item: 'Lemon juice', quantity: 2, unit: 'tbs' },
      { item: 'Hot sauce', quantity: 1, unit: 'tbs', notes: 'Optional' }
    ],
    estimatedCost: 12.00,
    sourceUrl: 'AI Added from Image'
  },
  {
    name: 'Copycat Crunchwraps',
    category: 'Beef',
    servings: 4,
    instructions: `1. In a large skillet over medium heat, cook ground beef until no longer pink. Add taco seasoning according to packet.
2. Stack ~4 tortillas (however many you are making) and place a tostada on top. Cut around the tostada to cut out a large circle in each of the tortillas.
3. Lay full tortillas out, and place a scoop of ground beef in center then drizzle cheese sauce over meat.
4. Place tostada on top, then add sour cream, lettuce, tomato, and cheese.
5. Place small tortilla cut out over ingredients, then fold edges of larger tortilla towards the center of the smaller tortilla.
6. In a pan over medium heat, add butter then add crunch wrap, folded side down.
7. Cook for about 3 minutes on each side, or until golden.
8. Enjoy!`,
    ingredients: [
      { item: 'Ground beef', quantity: 1, unit: 'lb' },
      { item: 'Taco seasoning', quantity: 1, unit: 'packet' },
      { item: 'Large flour tortillas', quantity: 4, unit: 'each' },
      { item: 'Nacho cheese', quantity: 0.5, unit: 'cup', notes: 'Cheese sauce' },
      { item: 'Tostadas', quantity: 4, unit: 'each' },
      { item: 'Sour cream', quantity: 0.5, unit: 'cup' },
      { item: 'Shredded lettuce', quantity: 2, unit: 'cups' },
      { item: 'Tomatoes', quantity: 2, unit: 'each', notes: 'Chopped' },
      { item: 'Cheddar cheese', quantity: 1, unit: 'cup', notes: 'Shredded' },
      { item: 'Butter', quantity: 1, unit: 'tbs' }
    ],
    estimatedCost: 14.00,
    sourceUrl: 'AI Added from Image - Inspired from Delish.com'
  },
  {
    name: 'Teriyaki Chicken and Crispy Brussel Sprout & Broccoli Bowls',
    category: 'Chicken',
    servings: 4,
    instructions: `1. In a large bowl, toss chicken in teriyaki sauce. Let marinate in fridge for at least 30 minutes.
2. Once done marinating, add chicken to a pan over medium heat. Cook on each side for about 4 minutes, or until crispy and fully cooked.
3. Place Brussel sprouts and broccoli on a baking sheet. Drizzle and toss veggies in olive oil and seasoning. Roast for 15-20 minutes, or until crispy.
4. Assemble bowls by adding chicken and veggies over rice. Drizzle with additional teriyaki sauce if desired.`,
    ingredients: [
      { item: 'Chicken breast', quantity: 1.5, unit: 'lb', notes: 'Cut into 1 inch strips' },
      { item: 'Teriyaki sauce', quantity: 1, unit: 'cup' },
      { item: 'Brussel sprouts', quantity: 1, unit: 'lb', notes: 'Trimmed and halved' },
      { item: 'Broccoli', quantity: 1, unit: 'lb', notes: 'Chopped' },
      { item: 'Olive oil', quantity: 1, unit: 'tbs' },
      { item: 'Garlic powder', quantity: 1, unit: 'tsp' },
      { item: 'Onion powder', quantity: 1, unit: 'tsp' },
      { item: 'Rice', quantity: 2, unit: 'cups', notes: 'Cooked' }
    ],
    estimatedCost: 13.50,
    sourceUrl: 'AI Added from Image - Inspired from LauraFuentes.com'
  },
  {
    name: 'One Pot Creamy Cheesy Beef Pasta',
    category: 'Beef',
    servings: 4,
    instructions: `1. In a large skillet, heat olive oil and garlic over medium heat. Add onion, Italian seasoning, and salt and pepper to taste. Let cook for a few minutes, until onion is translucent.
2. Add ground beef and season with salt, pepper and paprika. Break up beef and cook until no longer pink.
3. Add in tomato paste and mix well. Cook for a few minutes.
4. Pour in beef broth and cream. Bring to a simmer.
5. Add in uncooked pasta and stir. Let cook for ~15 minutes until pasta is tender.
6. Add in cheese and mix in.
7. Serve and enjoy!`,
    ingredients: [
      { item: 'Ground beef', quantity: 1, unit: 'lb' },
      { item: 'Onion', quantity: 1, unit: 'each', notes: 'Diced' },
      { item: 'Olive oil', quantity: 1, unit: 'tbs' },
      { item: 'Italian seasoning', quantity: 1, unit: 'tbs' },
      { item: 'Paprika', quantity: 1, unit: 'tbs' },
      { item: 'Tomato paste', quantity: 3, unit: 'tbs' },
      { item: 'Heavy cream', quantity: 1, unit: 'cup' },
      { item: 'Beef broth', quantity: 3, unit: 'cups' },
      { item: 'Pasta', quantity: 1, unit: 'lb', notes: 'Of choice' },
      { item: 'Cheddar cheese', quantity: 1, unit: 'cup', notes: 'Shredded' }
    ],
    estimatedCost: 11.50,
    sourceUrl: 'AI Added from Image - Inspired from FoodDolls.com'
  }
];

async function findOrCreateIngredient(itemName, category = 'Pantry') {
  // Search for ingredient
  const { data: existing } = await supabase
    .from('ingredients')
    .select('id, item')
    .ilike('item', `%${itemName}%`)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return existing.id;
  }

  // Create new ingredient (with estimated price - user can update later)
  const { data: newIngredient, error } = await supabase
    .from('ingredients')
    .insert({
      id: randomUUID(),
      item: itemName,
      category: category,
      price_per_package: 0, // User will need to update
      package_size: 1,
      package_unit: 'each',
      base_unit: 'each',
      price_per_base_unit: 0
    })
    .select()
    .single();

  if (error) {
    console.warn(`Failed to create ingredient ${itemName}:`, error.message);
    return null;
  }

  console.log(`✅ Created ingredient: ${itemName}`);
  return newIngredient.id;
}

async function addRecipe(recipeData) {
  console.log(`\n📝 Adding recipe: ${recipeData.name}`);

  // Check if recipe already exists
  const { data: existing } = await supabase
    .from('recipes')
    .select('id, name')
    .ilike('name', `%${recipeData.name}%`)
    .maybeSingle();

  if (existing) {
    console.log(`⚠️  Recipe already exists: ${existing.name} (ID: ${existing.id})`);
    return existing.id;
  }

  // Create recipe
  const recipeId = randomUUID();
  const { data: recipe, error: recipeError } = await supabase
    .from('recipes')
    .insert({
      id: recipeId,
      name: recipeData.name,
      category: recipeData.category,
      servings: recipeData.servings,
      instructions: recipeData.instructions,
      total_cost: recipeData.estimatedCost,
      cost_per_serving: recipeData.estimatedCost / recipeData.servings,
      source_url: recipeData.sourceUrl,
      tags: 'User Added, Budget Friendly'
    })
    .select()
    .single();

  if (recipeError) {
    console.error(`❌ Failed to create recipe:`, recipeError.message);
    return null;
  }

  console.log(`✅ Created recipe: ${recipe.name} (ID: ${recipe.id})`);

  // Add ingredients
  const ingredientIds = [];
  for (const ing of recipeData.ingredients) {
    // Determine category
    let category = 'Pantry';
    if (ing.item.toLowerCase().includes('chicken')) category = 'Meat';
    if (ing.item.toLowerCase().includes('beef') || ing.item.toLowerCase().includes('ground')) category = 'Meat';
    if (ing.item.toLowerCase().includes('asparagus') || ing.item.toLowerCase().includes('broccoli') || ing.item.toLowerCase().includes('brussel') || ing.item.toLowerCase().includes('lettuce') || ing.item.toLowerCase().includes('tomato')) category = 'Produce';
    if (ing.item.toLowerCase().includes('cheese') || ing.item.toLowerCase().includes('cream') || ing.item.toLowerCase().includes('butter')) category = 'Dairy';
    if (ing.item.toLowerCase().includes('pasta') || ing.item.toLowerCase().includes('tortilla') || ing.item.toLowerCase().includes('tostada') || ing.item.toLowerCase().includes('rice')) category = 'Pantry';

    const ingId = await findOrCreateIngredient(ing.item, category);
    if (ingId) {
      ingredientIds.push(ingId);

      // Link ingredient to recipe
      // recipe_ingredients requires ingredient_name and raw_line
      const { error: linkError } = await supabase
        .from('recipe_ingredients')
        .insert({
          recipe_id: recipeId,
          ingredient_id: ingId,
          quantity: ing.quantity,
          unit: ing.unit,
          ingredient_name: ing.item, // Required field
          raw_line: `${ing.quantity} ${ing.unit} ${ing.item}${ing.notes ? ` (${ing.notes})` : ''}` // Required field
        });

      if (linkError) {
        console.warn(`⚠️  Failed to link ingredient ${ing.item}:`, linkError.message);
      }
    }
  }

  console.log(`✅ Linked ${ingredientIds.length} ingredients`);
  return recipeId;
}

async function setDietaryPreference() {
  console.log('\n🍗 Setting dietary preference: Chicken breast only (no dark meat)');
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('❌ Not authenticated');
    return;
  }

  // Update user preferences
  const { data: preferences, error } = await supabase
    .from('user_preferences')
    .upsert({
      user_id: user.id,
      dietary_restrictions: JSON.stringify({
        chicken_breast_only: true,
        no_dark_meat_chicken: true,
        notes: 'Only use chicken breast, substitute dark meat with breast'
      }),
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id'
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Failed to save dietary preference:', error.message);
    return;
  }

  console.log('✅ Dietary preference saved');
}

async function main() {
  console.log('\n🍳 Adding New Recipes to Database\n');
  console.log('════════════════════════════════════════════════════════════\n');

  const recipeIds = [];
  
  for (const recipe of newRecipes) {
    const id = await addRecipe(recipe);
    if (id) {
      recipeIds.push(id);
    }
  }

  console.log(`\n✅ Added ${recipeIds.length} recipes\n`);

  // Set dietary preference
  await setDietaryPreference();

  console.log('\n📋 Recipe IDs for meal planning:');
  recipeIds.forEach((id, i) => {
    console.log(`   ${i + 1}. ${newRecipes[i].name}: ${id}`);
  });

  console.log('\n✨ Done! You can now generate a meal plan with these recipes.\n');
}

main().catch(console.error);

