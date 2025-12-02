import { supabase } from '../lib/supabase';

export async function generateGroceryList(weekStartDate, options = {}) {
  const { usePantry = true } = options;
  
  // Get meal plan for the week
  const { data: mealPlan, error: mealPlanError } = await supabase
    .from('meal_plans')
    .select('recipe_id')
    .eq('week_start_date', weekStartDate)
    .not('recipe_id', 'is', null);
  
  if (mealPlanError) {
    throw new Error(`Failed to load meal plan: ${mealPlanError.message}`);
  }
  
  if (!mealPlan || mealPlan.length === 0) {
    throw new Error('No meal plan found for this week. Please generate a meal plan first.');
  }
  
  // Extract all recipe ingredients
  const recipeIds = mealPlan.map(day => day.recipe_id).filter(Boolean);
  
  if (recipeIds.length === 0) {
    throw new Error('No recipes found in meal plan');
  }
  
  const { data: allIngredients, error: ingredientsError } = await supabase
    .from('recipe_ingredients')
    .select(`
      *,
      ingredient:ingredients(*)
    `)
    .in('recipe_id', recipeIds);
  
  if (ingredientsError) {
    throw new Error(`Failed to load recipe ingredients: ${ingredientsError.message}`);
  }
  
  if (!allIngredients || allIngredients.length === 0) {
    throw new Error('No ingredients found for selected recipes. Please ensure recipes have linked ingredients.');
  }
  
  // Consolidate duplicate ingredients
  const consolidated = consolidateIngredients(allIngredients);
  
  // Subtract pantry quantities if enabled
  let pantryItems = [];
  if (usePantry) {
    const { data } = await supabase
      .from('user_pantry')
      .select(`
        *,
        ingredient:ingredients(*)
      `)
      .gt('quantity', 0);
    pantryItems = data || [];
  }
  
  const pantryMap = new Map(pantryItems.map(p => [p.ingredient_id, p.quantity]));
  const alreadyHave = [];
  const needToBuy = [];
  
  for (const item of consolidated) {
    const pantryQty = pantryMap.get(item.ingredient_id) || 0;
    
    if (pantryQty >= item.total_quantity) {
      alreadyHave.push({ ...item, pantry_quantity: pantryQty });
    } else if (pantryQty > 0) {
      needToBuy.push({
        ...item,
        total_quantity: item.total_quantity - pantryQty,
        pantry_quantity: pantryQty
      });
    } else {
      needToBuy.push({ ...item, pantry_quantity: 0 });
    }
  }
  
  // Group by store category
  const byCategory = groupByStoreCategory(needToBuy);
  
  // Calculate packages and costs
  const withPackages = calculatePackages(byCategory);
  
  // Get current user ID
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated to create grocery lists');
  }
  
  // Save to database
  const groceryEntries = Object.values(withPackages).flatMap(cat => 
    cat.items.map(item => ({
      user_id: user.id,
      week_start_date: weekStartDate,
      ingredient_id: item.ingredient_id,
      quantity_needed: item.total_quantity,
      unit: item.unit,
      packages_to_buy: item.packages_to_buy,
      estimated_cost: item.estimated_cost,
      category: cat.name,
      is_purchased: false
    }))
  );
  
  // Delete existing grocery list for this week first (only for current user)
  await supabase
    .from('grocery_lists')
    .delete()
    .eq('week_start_date', weekStartDate)
    .eq('user_id', user.id);
  
  if (groceryEntries.length > 0) {
    const { error: insertError } = await supabase.from('grocery_lists').insert(groceryEntries);
    
    if (insertError) {
      throw new Error(`Failed to save grocery list: ${insertError.message}`);
    }
  }
  
  return {
    weekStartDate,
    itemsByCategory: withPackages,
    alreadyHave,
    totalCost: calculateTotalCost(withPackages),
    savings: calculateSavings(alreadyHave)
  };
}

function consolidateIngredients(ingredients) {
  const map = new Map();
  
  for (const ing of ingredients) {
    // Use ingredient_id as key (consolidate by ingredient, not by unit)
    // This handles cases where same ingredient appears with different units
    const key = ing.ingredient_id;
    
    if (map.has(key)) {
      // Add quantities (assuming same unit for now)
      // TODO: Add unit conversion if units differ
      const existing = map.get(key);
      if (existing.unit === ing.unit) {
        existing.total_quantity += ing.quantity;
      } else {
        // Units differ - keep both or convert
        // For now, just add to quantity (may need unit conversion)
        existing.total_quantity += ing.quantity;
        // Keep the first unit encountered
      }
    } else {
      map.set(key, {
        ingredient_id: ing.ingredient_id,
        ingredient: ing.ingredient,
        unit: ing.unit || ing.ingredient?.package_unit || '',
        total_quantity: ing.quantity || 0
      });
    }
  }
  
  return Array.from(map.values());
}

function groupByStoreCategory(items) {
  const categories = {
    'Produce': { name: 'Produce', order: 1, location: 'Front Left', icon: '🥦', items: [] },
    'Meat': { name: 'Meat', order: 2, location: 'Back Left', icon: '🥩', items: [] },
    'Dairy': { name: 'Dairy', order: 3, location: 'Back Right', icon: '🧀', items: [] },
    'Pantry': { name: 'Pantry', order: 4, location: 'Center Aisles', icon: '🍞', items: [] },
    'Frozen': { name: 'Frozen', order: 5, location: 'Middle Right', icon: '🧊', items: [] },
  };
  
  // Map database categories to store categories
  const categoryMap = {
    // Produce
    'Produce (Fruit/Vegetable)': 'Produce',
    '🥦 Veggie': 'Produce',
    '🍎 Fruit': 'Produce',
    
    // Meat
    'Meat': 'Meat',
    '🥩 Meat': 'Meat',
    
    // Dairy
    'Dairy': 'Dairy',
    '🧀 Dairy': 'Dairy',
    
    // Pantry
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
    'Other': 'Pantry',
    
    // Frozen
    'Frozen': 'Frozen',
    '🧊 Frozen': 'Frozen',
  };
  
  for (const item of items) {
    const dbCategory = item.ingredient?.category || 'Other';
    const storeCategory = categoryMap[dbCategory] || 'Pantry';
    
    if (categories[storeCategory]) {
      categories[storeCategory].items.push(item);
    } else {
      // Fallback to Pantry if category not found
      categories['Pantry'].items.push(item);
    }
  }
  
  // Filter out empty categories
  const filtered = {};
  for (const [key, value] of Object.entries(categories)) {
    if (value.items.length > 0) {
      filtered[key] = value;
    }
  }
  
  return filtered;
}

function calculatePackages(categoryMap) {
  for (const category of Object.values(categoryMap)) {
    category.items = category.items.map(item => {
      const ingredient = item.ingredient;
      const quantity = item.total_quantity || 0;
      const unit = item.unit || '';
      
      // Try to use package_size if available
      let packagesNeeded = 1;
      let estimatedCost = 0;
      
      if (ingredient?.package_size && ingredient?.package_size > 0) {
        // Calculate packages needed based on package_size
        packagesNeeded = Math.ceil(quantity / ingredient.package_size);
        const pricePerPackage = ingredient.price_per_package || 0;
        estimatedCost = packagesNeeded * pricePerPackage;
      } else if (ingredient?.price_per_base_unit && ingredient?.price_per_base_unit > 0) {
        // Fallback: use price_per_base_unit if package_size not available
        // This is less accurate but better than nothing
        estimatedCost = quantity * ingredient.price_per_base_unit;
        packagesNeeded = 1; // Can't calculate packages without package_size
      } else if (ingredient?.price_per_package) {
        // Last resort: use price_per_package as single package
        estimatedCost = ingredient.price_per_package;
        packagesNeeded = 1;
      }
      
      return {
        ...item,
        packages_to_buy: packagesNeeded,
        estimated_cost: estimatedCost
      };
    });
  }
  
  return categoryMap;
}

function calculateTotalCost(categoryMap) {
  return Object.values(categoryMap).reduce((total, cat) => 
    total + cat.items.reduce((sum, item) => sum + (item.estimated_cost || 0), 0),
    0
  );
}

function calculateSavings(alreadyHaveItems) {
  return alreadyHaveItems.reduce((sum, item) => {
    const pricePerUnit = item.ingredient?.price_per_base_unit || 0;
    return sum + (item.pantry_quantity * pricePerUnit);
  }, 0);
}
