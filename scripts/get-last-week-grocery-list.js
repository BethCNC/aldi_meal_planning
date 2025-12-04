/**
 * Get the full grocery list for the last week that was planned
 * This script works without the server running - it queries Supabase directly
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Category metadata for display
const CATEGORY_META = {
  'Produce': { emoji: '🥦', location: 'Front Left', order: 1 },
  'Meat': { emoji: '🥩', location: 'Back Left', order: 2 },
  'Dairy': { emoji: '🧀', location: 'Back Right', order: 3 },
  'Pantry': { emoji: '🍞', location: 'Center Aisles', order: 4 },
  'Frozen': { emoji: '🧊', location: 'Middle Right', order: 5 },
};

function formatWeekRange(weekStartDate) {
  const start = new Date(weekStartDate);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  
  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
  const startDay = start.getDate();
  const endDay = end.getDate();
  
  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}-${endDay}`;
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
}

async function getLastWeekGroceryList() {
  console.log('\n🛒 Getting Grocery List for Last Planned Week\n');
  console.log('════════════════════════════════════════════════════════════\n');

  // Get current user (or use service role if available)
  let userId;
  const isServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (isServiceRole) {
    console.log('🔑 Using service role key (admin access)\n');
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError || !users || users.length === 0) {
      console.error('❌ Could not find any users.');
      return;
    }
    
    userId = users[0].id;
    console.log(`✅ Using user: ${users[0].email || userId}\n`);
  } else {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ Not authenticated. Please set SUPABASE_SERVICE_ROLE_KEY in .env');
      return;
    }
    userId = user.id;
  }

  // Find the most recent meal plan
  const { data: mealPlans, error: mealPlanError } = await supabase
    .from('meal_plans')
    .select('week_start_date')
    .eq('user_id', userId)
    .not('recipe_id', 'is', null)
    .order('week_start_date', { ascending: false })
    .limit(1);

  if (mealPlanError) {
    console.error('❌ Error finding meal plan:', mealPlanError.message);
    return;
  }

  if (!mealPlans || mealPlans.length === 0) {
    console.error('❌ No meal plans found. Please generate a meal plan first.');
    return;
  }

  const weekStartDate = mealPlans[0].week_start_date;
  console.log(`📅 Found meal plan for week: ${formatWeekRange(weekStartDate)}\n`);

  // Get grocery list for this week
  const { data: groceryList, error: groceryError } = await supabase
    .from('grocery_lists')
    .select(`
      *,
      ingredient:ingredients(*)
    `)
    .eq('week_start_date', weekStartDate)
    .eq('user_id', userId)
    .order('category');

  if (groceryError) {
    console.error('❌ Error loading grocery list:', groceryError.message);
    return;
  }

  if (!groceryList || groceryList.length === 0) {
    console.log('⚠️  No grocery list found for this week.');
    console.log('   Generating grocery list from meal plan...\n');
    
    // Generate grocery list from meal plan
    const { data: mealPlanDays, error: daysError } = await supabase
      .from('meal_plans')
      .select('recipe_id')
      .eq('week_start_date', weekStartDate)
      .eq('user_id', userId)
      .not('recipe_id', 'is', null);

    if (daysError || !mealPlanDays || mealPlanDays.length === 0) {
      console.error('❌ No recipes found in meal plan');
      return;
    }

    const recipeIds = mealPlanDays.map(d => d.recipe_id).filter(Boolean);

    // Get all recipe ingredients
    const { data: recipeIngredients, error: ingredientsError } = await supabase
      .from('recipe_ingredients')
      .select(`
        *,
        ingredient:ingredients(*)
      `)
      .in('recipe_id', recipeIds);

    if (ingredientsError) {
      console.error('❌ Error loading ingredients:', ingredientsError.message);
      return;
    }

    if (!recipeIngredients || recipeIngredients.length === 0) {
      console.error('❌ No ingredients found for recipes');
      return;
    }

    // Consolidate ingredients
    const consolidated = new Map();
    for (const ri of recipeIngredients) {
      const ingId = ri.ingredient_id;
      if (consolidated.has(ingId)) {
        const existing = consolidated.get(ingId);
        existing.quantity += ri.quantity || 0;
      } else {
        consolidated.set(ingId, {
          ingredient_id: ingId,
          ingredient: ri.ingredient,
          quantity: ri.quantity || 0,
          unit: ri.unit || ri.ingredient?.package_unit || '',
        });
      }
    }

    // Group by category
    const categoryMap = new Map();
    for (const item of consolidated.values()) {
      const category = getStoreCategory(item.ingredient?.category || 'Other');
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category).push(item);
    }

    // Calculate packages and costs
    const itemsByCategory = {};
    let totalCost = 0;

    for (const [category, items] of categoryMap.entries()) {
      const categoryItems = items.map(item => {
        const ing = item.ingredient;
        let packagesNeeded = 1;
        let estimatedCost = 0;

        if (ing?.package_size && ing.package_size > 0) {
          packagesNeeded = Math.ceil(item.quantity / ing.package_size);
          estimatedCost = packagesNeeded * (ing.price_per_package || 0);
        } else if (ing?.price_per_base_unit && ing.price_per_base_unit > 0) {
          estimatedCost = item.quantity * ing.price_per_base_unit;
        } else if (ing?.price_per_package) {
          estimatedCost = ing.price_per_package;
        }

        totalCost += estimatedCost;

        return {
          name: ing?.name || ing?.item || 'Unknown',
          quantity: item.quantity,
          unit: item.unit,
          packages: packagesNeeded,
          cost: estimatedCost,
        };
      });

      itemsByCategory[category] = {
        ...CATEGORY_META[category] || { emoji: '📦', location: '', order: 99 },
        items: categoryItems,
      };
    }

    // Display grocery list
    console.log('════════════════════════════════════════════════════════════');
    console.log('🛒 GROCERY LIST');
    console.log('════════════════════════════════════════════════════════════\n');

    const sortedCategories = Object.entries(itemsByCategory)
      .sort((a, b) => a[1].order - b[1].order);

    for (const [category, data] of sortedCategories) {
      console.log(`${data.emoji} ${category.toUpperCase()} (${data.location})`);
      console.log('─'.repeat(50));
      
      for (const item of data.items) {
        const qtyStr = item.packages > 1 
          ? `${item.packages} × ${item.quantity} ${item.unit}`
          : `${item.quantity} ${item.unit}`;
        const costStr = item.cost > 0 ? `$${item.cost.toFixed(2)}` : 'price unknown';
        console.log(`   ☐ ${item.name.padEnd(30)} ${qtyStr.padEnd(20)} ${costStr}`);
      }
      
      const categoryTotal = data.items.reduce((sum, item) => sum + item.cost, 0);
      console.log(`   ${'Total:'.padEnd(30)} ${' '.padEnd(20)} $${categoryTotal.toFixed(2)}\n`);
    }

    console.log('════════════════════════════════════════════════════════════');
    console.log(`💰 ESTIMATED TOTAL: $${totalCost.toFixed(2)}`);
    console.log('════════════════════════════════════════════════════════════\n');

  } else {
    // Display existing grocery list
    console.log('════════════════════════════════════════════════════════════');
    console.log('🛒 GROCERY LIST');
    console.log('════════════════════════════════════════════════════════════\n');

    // Group by category
    const byCategory = new Map();
    let totalCost = 0;

    for (const item of groceryList) {
      const category = item.category || 'Pantry';
      if (!byCategory.has(category)) {
        byCategory.set(category, []);
      }
      byCategory.get(category).push(item);
      totalCost += item.estimated_cost || 0;
    }

    // Sort categories
    const sortedCategories = Array.from(byCategory.entries())
      .sort((a, b) => {
        const orderA = CATEGORY_META[a[0]]?.order || 99;
        const orderB = CATEGORY_META[b[0]]?.order || 99;
        return orderA - orderB;
      });

    for (const [category, items] of sortedCategories) {
      const meta = CATEGORY_META[category] || { emoji: '📦', location: '', order: 99 };
      console.log(`${meta.emoji} ${category.toUpperCase()} (${meta.location})`);
      console.log('─'.repeat(50));
      
      for (const item of items) {
        const ing = item.ingredient;
        // Ingredients table uses 'name' field
        const name = ing?.name || ing?.item || 'Unknown';
        const qtyStr = item.packages_to_buy > 1
          ? `${item.packages_to_buy} × ${item.quantity_needed} ${item.unit}`
          : `${item.quantity_needed} ${item.unit}`;
        const costStr = item.estimated_cost > 0 ? `$${item.estimated_cost.toFixed(2)}` : 'price unknown';
        const check = item.is_purchased ? '☑' : '☐';
        console.log(`   ${check} ${name.padEnd(30)} ${qtyStr.padEnd(20)} ${costStr}`);
      }
      
      const categoryTotal = items.reduce((sum, item) => sum + (item.estimated_cost || 0), 0);
      console.log(`   ${'Total:'.padEnd(30)} ${' '.padEnd(20)} $${categoryTotal.toFixed(2)}\n`);
    }

    console.log('════════════════════════════════════════════════════════════');
    console.log(`💰 ESTIMATED TOTAL: $${totalCost.toFixed(2)}`);
    console.log('════════════════════════════════════════════════════════════\n');
  }
}

function getStoreCategory(dbCategory) {
  const categoryMap = {
    'Produce (Fruit/Vegetable)': 'Produce',
    '🥦 Veggie': 'Produce',
    '🍎 Fruit': 'Produce',
    'Meat': 'Meat',
    '🥩 Meat': 'Meat',
    'Dairy': 'Dairy',
    '🧀 Dairy': 'Dairy',
    'Pantry Staple': 'Pantry',
    'Pantry': 'Pantry',
    '🍞 Starch/Carb': 'Pantry',
    'Carb/Starch': 'Pantry',
    'Canned/Dry Goods': 'Pantry',
    'Bakery': 'Pantry',
    'Condiments': 'Pantry',
    '🧂Staple': 'Pantry',
    '🧄 Spice/Condiment': 'Pantry',
    'Snack': 'Pantry',
    '🍪 Snack': 'Pantry',
    'Beverages': 'Pantry',
    'Frozen': 'Frozen',
    '🧊 Frozen': 'Frozen',
  };
  return categoryMap[dbCategory] || 'Pantry';
}

getLastWeekGroceryList().catch(console.error);

