/**
 * Formats a raw grocery list into a user-friendly grouped structure
 * @param {Array} flatList - List of ingredients with pricing (from priceCalculator)
 * @returns {Object} Grouped grocery list
 */
export function generateGroceryList(flatList) {
  const grouped = {};

  // Sort flat list by item name first
  flatList.sort((a, b) => a.ingredient.item.localeCompare(b.ingredient.item));

  for (const item of flatList) {
    const category = item.ingredient.category || 'Other';
    
    if (!grouped[category]) {
      grouped[category] = [];
    }

    // Format: "2x 15oz Can Black Beans ($1.78)"
    // Or if unit size is just "15oz", maybe "2x 15oz Black Beans..."
    // Let's look at available data.
    // item.packagesToBuy is the count.
    // item.ingredient.unit_size is the description (e.g. "15oz can").
    // item.ingredient.item is name.
    // item.cost is total cost.

    const count = item.packagesToBuy || 0;
    const unitSize = item.ingredient.unitSize || 
                     (item.ingredient.packageSize ? `${item.ingredient.packageSize} ${item.ingredient.packageUnit}` : '');
    const name = item.ingredient.item;
    const cost = item.cost.toFixed(2);

    let displayString = count > 0 ? `${count}x ` : '';
    if (unitSize) {
      displayString += `${unitSize} `;
    }
    displayString += `${name} ($${cost})`;
    
    if (item.missingPrice) {
      displayString += ' [Price Unknown]';
    }

    grouped[category].push({
      item: name,
      qty: count,
      unit_size: unitSize,
      est_cost: item.cost,
      display: displayString
    });
  }

  // Sort keys alphabetically, but maybe put Produce/Meat first?
  // TDD says "Sort: Alphabetical within categories". Doesn't specify category order.
  // Standard logic: Alphabetical categories is easiest, or specific order.
  // Let's stick to alphabetical categories for now, but commonly Produce is first.
  
  const orderedGrouped = {};
  Object.keys(grouped).sort().forEach(key => {
    orderedGrouped[key] = grouped[key];
  });

  return orderedGrouped;
}

