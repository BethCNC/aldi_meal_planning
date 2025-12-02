#!/usr/bin/env node

/**
 * Bulk import curated recipes into Supabase.
 *
 * This script upserts recipe metadata into the `recipes` table using
 * pre-defined recipe data (name, description, ingredients, instructions, cost).
 * Ingredient-level quantities are not included, so this only populates high-level
 * recipe details and cost estimates.
 */

import dotenv from 'dotenv';

dotenv.config();

const { upsertRecipe, findRecipeByName } = await import('../backend/supabase/recipeClient.js');

const recipes = [
  {
    name: 'French Bread Pizzas',
    category: 'Other',
    servings: 4,
    shortDescription: 'Quick homemade pizzas using a toasted French baguette base with marinara or pesto, melty cheese, and family-favorite toppings.',
    ingredients: [
      'French baguette',
      'Marinara or pesto sauce',
      'Fresh mozzarella cheese',
      'Pepperoni',
      'Salad greens'
    ],
    instructions: `Split a French baguette in half lengthwise and toast under the broiler until crisp. Spread the cut sides with marinara or pesto, add mozzarella and toppings, then broil for 3–5 minutes until the cheese is bubbly and the edges are toasted. Slice and serve with side salads.`,
    costText: 'Total meal cost about $12.15 with all ingredients from Aldi.',
    source: 'https://www.realmomnutrition.com/aldi-dinner-ideas-fall-winter/'
  },
  {
    name: 'Baked Turkey Tacos',
    category: 'Chicken',
    servings: 4,
    shortDescription: 'Crunchy baked tacos filled with seasoned ground turkey and refried beans for a family-friendly, make-ahead meal.',
    ingredients: [
      'Ground turkey',
      'Hard taco shells',
      'Refried beans',
      'Enchilada or tomato sauce',
      'Shredded cheddar cheese',
      'Salsa',
      'Avocado'
    ],
    instructions: `Brown ground turkey in a skillet and season with chili powder, garlic powder, onion powder, and salt. Stir in refried beans and a splash of enchilada or tomato sauce. Spoon the filling into taco shells arranged in a baking dish, top with shredded cheese, and bake for 5–7 minutes until the cheese melts. Serve with salsa, avocado, or sour cream.`,
    costText: 'Total cost approximately $16.15 for four servings using Aldi ingredients.',
    source: 'https://www.realmomnutrition.com/aldi-dinner-ideas-fall-winter/'
  },
  {
    name: 'Baked Ravioli',
    category: 'Vegetarian',
    servings: 4,
    shortDescription: 'A cozy, lazy-lasagna casserole made with frozen cheese ravioli baked in pasta sauce and mozzarella.',
    ingredients: [
      'Frozen cheese ravioli',
      'Jarred pasta sauce',
      'Shredded mozzarella',
      'Grated Parmesan',
      'Salad greens',
      'Vinaigrette dressing'
    ],
    instructions: `Preheat the oven to 350°F. Spread some pasta sauce in a 13x9-inch dish, add the frozen ravioli, and pour the remaining sauce over top to coat. Sprinkle generously with mozzarella, cover with foil, and bake for about 40 minutes. Uncover and bake 15 minutes longer until bubbly and hot in the center. Let stand 10 minutes before serving with a green salad.`,
    costText: 'Budget-friendly family meal at roughly $16.42 total for ingredients at Aldi.',
    source: 'https://www.realmomnutrition.com/aldi-dinner-ideas-fall-winter/'
  },
  {
    name: 'Slow Cooker "Roast" Chicken',
    category: 'Chicken',
    servings: 4,
    shortDescription: 'Whole chicken “roasted” in the slow cooker with potatoes and carrots for a set-and-forget comfort meal.',
    ingredients: [
      'Whole chicken (about 4 lbs)',
      'Potatoes',
      'Carrots',
      'Brussels sprouts',
      'Basic seasonings'
    ],
    instructions: `Place chopped potatoes and carrots in the bottom of a slow cooker. Season a whole chicken and set it on top of the vegetables. Cook on LOW for 6–8 hours until the chicken is tender and cooked through. For crisper skin, broil the chicken briefly after slow cooking. Roast Brussels sprouts separately or add near the end of cooking and serve everything together.`,
    costText: 'Estimated total cost $21.09 using Aldi prices for a 4-lb chicken and vegetables.',
    source: 'https://www.realmomnutrition.com/aldi-dinner-ideas-fall-winter/'
  },
  {
    name: 'Sheet Pan Schnitzel & Pierogi',
    category: 'Pork',
    servings: 4,
    shortDescription: 'German-inspired one-pan dinner with breaded pork schnitzel, crispy baked pierogies, sauerkraut, and green beans.',
    ingredients: [
      'Breaded pork schnitzel cutlets (or kielbasa)',
      'Frozen potato pierogies',
      'Sauerkraut',
      'Green beans',
      'Olive oil or butter'
    ],
    instructions: `Preheat the oven to 400°F and line a sheet pan with parchment. Arrange schnitzel on the pan and scatter frozen pierogies around them, topping pierogies with small nests of sauerkraut. Drizzle with olive oil or melted butter and bake for about 20 minutes. Flip the cutlets and pierogies, add green beans, and bake 10–15 minutes more until the pork is cooked through and pierogies are golden.`,
    costText: 'Approximately $15.78 total cost for this sheet-pan meal at Aldi prices.',
    source: 'https://www.realmomnutrition.com/aldi-dinner-ideas-fall-winter/'
  },
  {
    name: 'Kielbasa Sheet Pan Dinner',
    category: 'Pork',
    servings: 4,
    shortDescription: 'Sweet and savory sheet-pan meal featuring smoked kielbasa roasted with hearty veggies in a honey-garlic glaze.',
    ingredients: [
      'Smoked kielbasa sausage',
      'Sweet potatoes',
      'Russet potatoes',
      'Broccoli or mixed vegetables',
      'Garlic',
      'Honey',
      'Olive oil',
      'Seasonings'
    ],
    instructions: `Slice kielbasa and cut vegetables into bite-size pieces. Toss the sausage, potatoes, and broccoli with a honey-garlic sauce (garlic, honey, soy sauce) and a little oil. Spread on a sheet pan and roast at 400°F for 25–30 minutes, stirring once, until the potatoes are tender and the kielbasa is caramelized.`,
    costText: 'Budget-friendly one-pan dinner at roughly $14 for four servings.',
    source: 'https://www.realmomnutrition.com/aldi-dinner-ideas-fall-winter/'
  },
  {
    name: 'Butter Chicken Simmer',
    category: 'Chicken',
    servings: 4,
    shortDescription: 'An easy Indian-inspired curry using Aldi’s jarred Butter Chicken simmer sauce served over rice with veggies.',
    ingredients: [
      'Chicken breast chunks',
      'Butter Chicken simmer sauce (jarred)',
      'Bell pepper or onion',
      'Brown basmati rice',
      'Broccoli',
      'Naan flatbread'
    ],
    instructions: `Sauté diced bell pepper (and onion if desired) in oil, add chicken pieces, and cook until lightly browned. Pour in the jar of Butter Chicken sauce, cover, and simmer 10–12 minutes until the chicken is cooked through. Cook brown basmati rice separately. Serve the butter chicken over rice with broccoli and warm naan.`,
    costText: 'Total ingredients cost about $19.24 at Aldi using the jarred sauce.',
    source: 'https://www.realmomnutrition.com/aldi-dinner-ideas-fall-winter/'
  },
  {
    name: 'Foil Packet Salmon',
    category: 'Seafood',
    servings: 4,
    shortDescription: 'Moist, flavorful salmon fillets baked in foil with lemon and sweet peppers for a no-mess dinner.',
    ingredients: [
      'Fresh salmon fillets',
      'Lemon slices',
      'Mini sweet peppers',
      'Dried herbs (oregano, basil)',
      'Olive oil or butter',
      'Instant brown rice',
      'Broccoli crowns'
    ],
    instructions: `Preheat oven to 400°F. Place each salmon fillet on a sheet of foil, top with lemon slices and sliced sweet peppers, season with salt, pepper, and herbs, and drizzle with olive oil. Fold into packets and bake for 15–20 minutes until the salmon is cooked through. Serve with brown rice and roasted or steamed broccoli.`,
    costText: 'Around $27.74 for four portions when sourced from Aldi.',
    source: 'https://www.realmomnutrition.com/aldi-dinner-ideas-fall-winter/'
  },
  {
    name: 'Chicken Tenders & Fries',
    category: 'Chicken',
    servings: 4,
    shortDescription: 'Kid-friendly chicken tenders breaded in crumbs and served with crispy oven fries and veggies.',
    ingredients: [
      'Fresh chicken tenderloins',
      'All-purpose flour',
      'Eggs',
      'Bread crumbs',
      'BBQ sauce',
      'Frozen French fries or tater tots',
      'Frozen peas or other veggie'
    ],
    instructions: `Optional: Marinate chicken tenders in BBQ sauce for 30 minutes. Dredge each tender in flour, then beaten egg, then bread crumbs. Pan-fry or air-fry until golden and cooked through. Bake frozen fries according to package directions. Serve the tenders with fries, peas, and extra BBQ sauce for dipping.`,
    costText: 'Estimated $14.95 total cost—an inexpensive family meal.',
    source: 'https://www.realmomnutrition.com/aldi-dinner-ideas-fall-winter/'
  },
  {
    name: 'Slow Cooker 2-Packet Pot Roast',
    category: 'Beef',
    servings: 4,
    shortDescription: 'Fork-tender beef pot roast slow-cooked with potatoes and carrots using ranch and Italian dressing packets.',
    ingredients: [
      'Beef chuck roast (about 2.5 lbs)',
      'Carrots',
      'Potatoes',
      'Beef broth',
      'Dry Italian dressing mix',
      'Dry ranch dressing mix'
    ],
    instructions: `Whisk the Italian and ranch dressing mixes into 1 cup of beef broth and pour over a chuck roast in the slow cooker. Arrange chopped potatoes and carrots around the roast. Cook on LOW for 6–8 hours until the meat is fall-apart tender and the vegetables are cooked. Serve with the slow-cooked potatoes, carrots, and pan juices.`,
    costText: 'Feeds about four on a ~$22.25 Aldi budget.',
    source: 'https://www.realmomnutrition.com/aldi-dinner-ideas-fall-winter/'
  },
  {
    name: 'Jammy Pork Chops',
    category: 'Pork',
    servings: 4,
    shortDescription: 'Pan-seared pork chops glazed with jam, mustard, vinegar, and soy for a sweet-and-tangy finish.',
    ingredients: [
      'Boneless pork chops',
      'Fruit jam or preserves',
      'Brown mustard',
      'Balsamic vinegar',
      'Soy sauce',
      'Egg noodles',
      'Green beans'
    ],
    instructions: `Season pork chops and sear in a skillet with a little oil until cooked through. Mix jam, mustard, balsamic vinegar, and soy sauce in a bowl, then pour over the pork during the final minutes of cooking. Simmer until the glaze reduces and coats the chops. Serve with buttered egg noodles and heated green beans.`,
    costText: 'Costs around $14.83 for four servings using Aldi staples.',
    source: 'https://www.realmomnutrition.com/aldi-dinner-ideas-fall-winter/'
  },
  {
    name: 'Instant Pot Mac & Cheese',
    category: 'Vegetarian',
    servings: 4,
    shortDescription: 'Ultra-fast homemade macaroni and cheese prepared entirely in the Instant Pot.',
    ingredients: [
      'Elbow macaroni',
      'Shredded cheddar cheese',
      'Butter',
      'Milk',
      'Salt',
      'Pepper',
      'Bagged salad greens',
      'Vinaigrette dressing'
    ],
    instructions: `Combine dry elbow macaroni, water, a pinch of salt, and butter in the Instant Pot. Cook on high pressure for 4 minutes and quick-release. Switch to sauté, stir in milk and shredded cheddar until the sauce is creamy, then season to taste. Serve with a green side salad.`,
    costText: 'Only about $10.70 for the entire meal.',
    source: 'https://www.realmomnutrition.com/aldi-dinner-ideas-fall-winter/'
  },
  {
    name: 'Sweet Potato & Black Bean Chili',
    category: 'Vegetarian',
    servings: 4,
    shortDescription: 'Hearty meatless chili packed with roasted sweet potatoes, black beans, tomatoes, and warm spices.',
    ingredients: [
      'Sweet potatoes',
      'Black beans',
      'Diced tomatoes',
      'Tomato sauce',
      'Chili powder',
      'Bell peppers',
      'Onion',
      'Garlic',
      'Cilantro',
      'Avocado',
      'Lime'
    ],
    instructions: `Peel and cube sweet potatoes, toss with oil and chili powder, and roast until tender and browned. In a pot, combine black beans, tomatoes, tomato sauce, diced bell pepper, onion, garlic, and additional chili powder. Simmer to blend flavors, then gently fold in the roasted sweet potatoes. Serve with avocado, cilantro, and a squeeze of lime.`,
    costText: 'Total cost about $13.64 for a large vegan pot of chili.',
    source: 'https://www.realmomnutrition.com/aldi-dinner-ideas-fall-winter/'
  },
  {
    name: 'Black Bean Burritos',
    category: 'Vegetarian',
    servings: 4,
    shortDescription: 'Protein-packed vegetarian burritos with spiced black beans, melty cheese, and avocado, toasted until crisp.',
    ingredients: [
      'Large flour tortillas',
      'Black beans',
      'Onion',
      'Shredded cheddar cheese',
      'Avocado',
      'Salsa'
    ],
    instructions: `Sauté drained black beans with finely chopped onion in a little oil, seasoning with salt, pepper, and optional cumin or chili powder. Spoon onto tortillas, add shredded cheese, avocado slices, and salsa, then fold into burritos. Lightly oil the outside and toast in a skillet on both sides until golden and the cheese melts.`,
    costText: 'Approximately $8.90 for all ingredients (makes four hearty burritos).',
    source: 'https://www.realmomnutrition.com/aldi-dinner-ideas-fall-winter/'
  },
  {
    name: 'Ground Chicken Burgers',
    category: 'Chicken',
    servings: 4,
    shortDescription: 'Juicy ground chicken burgers seasoned with pantry spices for a lighter twist on classic burgers.',
    ingredients: [
      'Lean ground chicken',
      'Garlic powder',
      'Onion powder',
      'Paprika',
      'Crushed red pepper flakes',
      'Salt and pepper',
      'Burger buns',
      'Favorite toppings'
    ],
    instructions: `Combine ground chicken with garlic powder, onion powder, paprika, red pepper flakes, salt, and pepper. Form into four patties and cook in a lightly oiled skillet for 4–5 minutes per side until golden and the internal temperature reaches 165°F. Top with cheese if desired, toast buns, and assemble with toppings.`,
    costText: 'Ground chicken at Aldi was about $3.39/lb, keeping the meal extremely affordable.',
    source: 'https://www.figjar.com/go-to-ground-chicken-burger-recipe/'
  },
  {
    name: 'Creamy Zucchini Mushroom Pasta',
    category: 'Vegetarian',
    servings: 4,
    shortDescription: 'Comforting vegetarian pasta with sautéed zucchini and mushrooms in a velvety garlic cream sauce.',
    ingredients: [
      'Dry pasta shells (about 10 oz)',
      'Zucchini (grated)',
      'Mushrooms (diced)',
      'Shallot or onion',
      'Garlic',
      'Butter',
      'Flour',
      'Milk',
      'Heavy cream',
      'Grated Asiago or Parmesan',
      'Salt and pepper'
    ],
    instructions: `Cook pasta until al dente. Sauté diced shallot in olive oil, add mushrooms until softened, then grated zucchini; cook until mostly translucent and season with salt and pepper. Stir in garlic briefly. In the pasta pot, melt butter, whisk in flour to form a roux, cook 2–3 minutes, then slowly whisk in milk and heavy cream. Simmer until slightly thickened, add grated Asiago, and stir until melted. Combine the sauce with pasta and veggies and serve with extra cheese or parsley.`,
    costText: 'Super inexpensive to make—part of a $100/week Aldi meal plan.',
    source: 'https://www.figjar.com/creamy-zucchini-mushroom-pasta/'
  },
  {
    name: 'Pesto Baked Chicken',
    category: 'Chicken',
    servings: 4,
    shortDescription: 'Five-ingredient baked chicken breasts smothered in basil pesto and Asiago cheese.',
    ingredients: [
      'Boneless skinless chicken breasts',
      'Jarred pesto sauce',
      'Shredded Asiago cheese',
      'Olive oil',
      'Salt',
      'Black pepper'
    ],
    instructions: `Pre-salt the chicken (if time allows). Preheat the oven to 400°F or the broiler. Heat an oven-safe skillet with olive oil over medium-high heat, season chicken with pepper, and sear about 3 minutes per side. Turn off heat, spread pesto over each piece, and top with Asiago. Transfer to the oven and broil or bake for a few minutes until the cheese melts and the chicken reaches 165°F internally.`,
    costText: 'Developed during a $100 Aldi shopping week using jarred pesto and leftover cheese.',
    source: 'https://www.figjar.com/super-easy-pesto-baked-chicken/'
  },
  {
    name: 'Cheesy Potato Taco Bowls',
    category: 'Beef',
    servings: 4,
    shortDescription: 'Roasted golden potatoes loaded with taco-seasoned ground beef, melted cheddar, and favorite toppings.',
    ingredients: [
      'Gold potatoes (about 2 lbs)',
      'Ground beef (1 lb)',
      'Olive oil',
      'Chili powder',
      'Garlic powder',
      'Onion powder',
      'Paprika',
      'Salt and pepper',
      'Shredded cheddar cheese',
      'Optional taco toppings'
    ],
    instructions: `Preheat oven to 400°F. Cut potatoes into bite-size chunks, toss with olive oil, salt, and pepper, and roast on a lined sheet pan for 35–45 minutes, stirring halfway, until golden. Brown ground beef in a skillet, season with chili powder, garlic powder, onion powder, paprika, salt, and pepper. When potatoes are done, push them together on the pan, top with cooked beef and cheddar, and return to the oven briefly to melt. Serve in bowls with desired toppings.`,
    costText: 'Part of a five-night Aldi meal plan that totaled about $84, relying on inexpensive staples.',
    source: 'https://www.figjar.com/cheesy-potato-taco-bowl-recipe/'
  },
  {
    name: 'Italian Cornflake Chicken',
    category: 'Chicken',
    servings: 6,
    shortDescription: 'Crispy baked chicken tenders coated in crushed cornflakes and Italian dressing for a fast, kid-approved dinner.',
    ingredients: [
      'Boneless chicken breasts or tenders',
      'Italian salad dressing',
      'Cornflakes cereal (crushed)',
      'Garlic and herb seasoning blend'
    ],
    instructions: `Marinate chicken in Italian dressing for about 30 minutes. Preheat oven to 350°F. Combine crushed cornflakes with garlic and herb seasoning in a large bag. Remove chicken from marinade, add to the crumb mixture, and shake to coat. Arrange on a greased baking sheet and bake 12–15 minutes per side until the coating is golden and the chicken reaches 165°F.`,
    costText: 'A budget recipe from feeding four people 21 meals for $100 at Aldi.',
    source: 'https://www.momsconfession.com/corn-flake-chicken-dinner/'
  },
  {
    name: 'Beef Stir Fry',
    category: 'Beef',
    servings: 6,
    shortDescription: 'Simple beef and vegetable stir-fry using thinly sliced steak and Aldi bottled stir-fry sauces.',
    ingredients: [
      'Thinly sliced beef steak (milanesa)',
      'Toasted sesame Asian dressing',
      'Teriyaki ginger dressing',
      'Soy sauce',
      'Frozen stir-fry vegetable mix'
    ],
    instructions: `Slice beef into thin strips. Stir-fry in a wok or skillet with a little oil over medium-high heat until cooked through. Reduce heat to medium-low, add toasted sesame dressing, teriyaki ginger dressing, and soy sauce, then stir in frozen stir-fry vegetables. Cover and cook about 15 minutes, stirring occasionally, until vegetables are tender-crisp.`,
    costText: 'Part of Aldi’s switch-and-save meal plan—keeps costs low using store-brand sauces and veggies.',
    source: 'https://www.momsconfession.com/beef-stir-fry/'
  },
  {
    name: 'Sausage & Pierogi Casserole',
    category: 'Pork',
    servings: 4,
    shortDescription: 'Cheesy comfort-food casserole of pierogies layered with sautéed smoked sausage, peppers, and onions in a creamy sauce.',
    ingredients: [
      'Polska kielbasa (smoked sausage)',
      'Frozen potato-cheese pierogies',
      'Sweet bell pepper',
      'Yellow onion',
      'Garlic',
      'Cream cheese',
      'Chicken broth',
      'Shredded cheddar cheese',
      'Olive oil',
      'Parsley',
      'Salt and pepper'
    ],
    instructions: `Preheat oven to 400°F and spray a 2.5-quart casserole dish. Sauté sliced kielbasa, bell pepper, and onion in olive oil until softened, then add garlic briefly. Arrange frozen pierogies in the baking dish and spread the sausage mixture on top. In the same skillet, warm chicken broth with cream cheese and parsley, stirring until a smooth sauce forms. Pour over the pierogies, sprinkle with cheddar, and bake uncovered about 30 minutes until bubbly.`,
    costText: 'Inspired by Aldi special-buy pierogies—about $10 of ingredients yields a filling meal.',
    source: 'https://www.mashupmom.com/sausage-peppers-onions-pierogi-casserole/'
  }
];

function extractTotalCost(costText) {
  if (!costText) return null;
  const match = costText.replace(/,/g, '').match(/\$([\d.]+)/);
  if (!match) return null;
  const value = Number.parseFloat(match[1]);
  return Number.isFinite(value) ? Number(value.toFixed(2)) : null;
}

function buildInstructionText(recipe) {
  const lines = [];
  if (recipe.shortDescription) {
    lines.push(recipe.shortDescription.trim());
    lines.push('');
  }
  if (recipe.ingredients?.length) {
    lines.push('Ingredients:');
    for (const item of recipe.ingredients) {
      lines.push(`- ${item.trim()}`);
    }
    lines.push('');
  }
  if (recipe.instructions) {
    lines.push('Instructions:');
    lines.push(recipe.instructions.trim());
  }
  return lines.join('\n');
}

async function importRecipes() {
  const results = [];

  for (const recipe of recipes) {
    const existing = await findRecipeByName(recipe.name);
    const totalCost = extractTotalCost(recipe.costText);
    const servings = Number.isFinite(Number(recipe.servings))
      ? Number(recipe.servings)
      : null;
    const costPerServing =
      totalCost && servings
        ? Number((totalCost / servings).toFixed(2))
        : null;

    const payload = {
      id: existing?.id,
      name: recipe.name,
      servings,
      category: recipe.category || existing?.category || 'Other',
      totalCost,
      costPerServing,
      instructions: buildInstructionText(recipe),
      sourceUrl: recipe.source,
      tags: recipe.tags || existing?.tags || null
    };

    const saved = await upsertRecipe(payload);
    results.push({
      name: recipe.name,
      action: existing ? 'updated' : 'inserted',
      id: saved.id
    });
  }

  return results;
}

async function main() {
  try {
    const summary = await importRecipes();
    console.log('\n✅ Supabase recipe import complete!\n');
    summary.forEach((entry) => {
      console.log(` - ${entry.name}: ${entry.action} (id: ${entry.id})`);
    });
    console.log(`\nTotal processed: ${summary.length}\n`);
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

