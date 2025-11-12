export const PRICE_SOURCES = [
  {
    name: 'SimpleGroceryDeals',
    url: 'https://www.simplegrocerydeals.com/aldi-price-list/',
    type: 'html',
    selectors: {
      products: '.grocery-item, tr',
      name: '.item-name, td:first-child',
      price: '.item-price, td:nth-child(2)',
      unit: '.item-unit, td:nth-child(3)'
    }
  }
];

export const RECIPE_SOURCES = [
  {
    name: 'DontWasteTheCrumbs',
    baseUrl: 'https://dontwastethecrumbs.com',
    mealPlanUrls: [
      'https://dontwastethecrumbs.com/50-aldi-meal-plan/',
      'https://dontwastethecrumbs.com/one-week-meal-plan-aldi/'
    ],
    selectors: {
      title: 'h1, .entry-title',
      totalCost: '.total-cost, p:contains("$")',
      ingredients: '.ingredients li, .shopping-list li',
      recipes: '.recipe-card, article'
    }
  },
  {
    name: 'MomsConfession',
    baseUrl: 'https://www.momsconfession.com',
    mealPlanUrls: [
      'https://www.momsconfession.com/21-meals-under-100/',
      'https://www.momsconfession.com/aldi-meal-plan/'
    ],
    selectors: {
      title: 'h1.entry-title',
      totalCost: 'p:contains("$"), .cost',
      ingredients: '.ingredients li',
      recipes: '.recipe-link, h2'
    }
  },
  {
    name: 'ThriftyFrugalMom',
    baseUrl: 'https://www.thriftyfrugalmom.com',
    mealPlanUrls: [
      'https://www.thriftyfrugalmom.com/aldi-meal-plan-7-dinners-for-less-than-50/'
    ],
    selectors: {
      title: '.entry-title',
      totalCost: 'p:contains("under $50")',
      ingredients: '.ingredients li, ul li',
      shoppingList: '.shopping-list'
    }
  },
  {
    name: 'TheFigJar',
    baseUrl: 'https://www.figjar.com',
    mealPlanUrls: [
      'https://www.figjar.com/easy-aldi-5-day-meal-plan-for-under-100/'
    ],
    selectors: {
      title: 'h1',
      totalCost: 'p:contains("$")',
      ingredients: '.ingredients li',
      recipes: 'h2, h3'
    }
  },
  {
    name: 'MealsWithMaria',
    baseUrl: 'https://mealswithmaria.site',
    mealPlanUrls: [
      'https://mealswithmaria.site/cheap-healthy-aldi-meals/'
    ],
    selectors: {
      title: '.entry-title',
      totalCost: 'p:contains("$60")',
      ingredients: '.ingredients li',
      recipes: 'h2, h3'
    }
  },
  {
    name: 'RootedAtHeart',
    baseUrl: 'https://www.rootedatheart.com',
    mealPlanUrls: [
      'https://www.rootedatheart.com/aldi-meal-prep/'
    ],
    selectors: {
      title: '.entry-title',
      totalCost: 'p:contains("$")',
      ingredients: 'li',
      shoppingList: '.shopping-list'
    }
  },
  {
    name: 'SimplePurposefulLiving',
    baseUrl: 'https://simplepurposefulliving.com',
    mealPlanUrls: [
      'https://simplepurposefulliving.com/simple-aldi-meal-plan/'
    ],
    selectors: {
      title: 'h1',
      totalCost: 'p:contains("$")',
      ingredients: 'li',
      recipes: 'h2, h3'
    }
  }
];
