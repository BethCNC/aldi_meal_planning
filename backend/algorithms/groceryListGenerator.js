import { supabase } from '../supabase/client.js';
import { getMealPlan } from '../supabase/mealPlanClient.js';
import { getRecipeIngredients } from '../supabase/recipeClient.js';
import { getPantryItems } from '../supabase/pantryClient.js';

export async function generateGroceryList(weekStartDate, options = {}) {
  const { usePantry = true } = options;
  
  // Step 1: Get meal plan for the week
  const mealPlan = await getMealPlan(weekStartDate);
  
  // Step 2: Extract all recipe ingredients
  const allIngredients = [];
  for (const day of mealPlan) {
    if (day.recipe_id) {
      const recipeIngredients = await getRecipeIngredients(day.recipe_id);
      allIngredients.push(...recipeIngredients);
    }
  }
  
  // Step 3: Consolidate duplicate ingredients
  const consolidated = consolidateIngredients(allIngredients);
  
  // Step 4: Subtract pantry quantities if enabled
  let pantryItems = [];
  if (usePantry) {
    pantryItems = await getPantryItems();
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
  
  // Step 5: Group by store category
  const byCategory = groupByStoreCategory(needToBuy);
  
  // Step 6: Calculate packages and costs
  const withPackages = calculatePackages(byCategory);
  
  // Step 7: Save to database
  const groceryEntries = Object.values(withPackages).flatMap(cat => 
    cat.items.map(item => ({
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
  
  if (groceryEntries.length > 0) {
    await supabase.from('grocery_lists').insert(groceryEntries);
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
    const key = `${ing.ingredient_id}-${ing.unit}`;
    if (map.has(key)) {
      map.get(key).total_quantity += ing.quantity;
    } else {
      map.set(key, {
        ingredient_id: ing.ingredient_id,
        ingredient: ing.ingredient,
        unit: ing.unit,
        total_quantity: ing.quantity
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
  
  for (const item of items) {
    const category = item.ingredient?.category || 'Pantry';
    if (categories[category]) {
      categories[category].items.push(item);
    }
  }
  
  return categories;
}

function calculatePackages(categoryMap) {
  for (const category of Object.values(categoryMap)) {
    category.items = category.items.map(item => {
      const packageSize = item.ingredient?.package_size || 1;
      const packagesNeeded = Math.ceil(item.total_quantity / packageSize);
      const pricePerPackage = item.ingredient?.price_per_package || 0;
      
      return {
        ...item,
        packages_to_buy: packagesNeeded,
        estimated_cost: packagesNeeded * pricePerPackage
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
