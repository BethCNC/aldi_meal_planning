
import { Recipe } from '../types';

export const FALLBACK_RECIPES: Recipe[] = [
  {
    id: '1',
    name: 'Creamy Pesto Pasta',
    costPerServing: 1.25,
    category: 'Vegetarian',
    ingredients: [
      { id: 'i1', name: 'Penne Pasta', quantity: '1 box', category: 'Pantry', price: 0.95, aisle: 'Aisle 2' },
      { id: 'i2', name: 'Basil Pesto', quantity: '1 jar', category: 'Pantry', price: 2.49, aisle: 'Aisle 2' },
      { id: 'i3', name: 'Heavy Cream', quantity: '1 cup', category: 'Dairy', price: 1.99, aisle: 'Aisle 4' }
    ],
    instructions: ['Boil pasta.', 'Drain and mix with pesto.', 'Stir in cream over low heat until warm.']
  },
  {
    id: '2',
    name: 'Aldi Taco Night',
    costPerServing: 2.15,
    category: 'Meat',
    ingredients: [
      { id: 'i4', name: 'Ground Beef 93/7', quantity: '1 lb', category: 'Meat', price: 5.49, aisle: 'Aisle 4' },
      { id: 'i5', name: 'Taco Shells', quantity: '1 pack', category: 'Pantry', price: 1.29, aisle: 'Aisle 2' },
      { id: 'i6', name: 'Shredded Cheese', quantity: '1 bag', category: 'Dairy', price: 2.89, aisle: 'Aisle 4' },
      { id: 'i7', name: 'Salsa', quantity: '1 jar', category: 'Pantry', price: 1.89, aisle: 'Aisle 2' }
    ],
    instructions: ['Brown meat.', 'Season with spices.', 'Assemble tacos with cheese and salsa.']
  },
  {
    id: '3',
    name: 'Sheet Pan Chicken & Veggies',
    costPerServing: 3.10,
    category: 'Meat',
    ingredients: [
      { id: 'i8', name: 'Chicken Breasts', quantity: '1 lb', category: 'Meat', price: 4.99, aisle: 'Aisle 4' },
      { id: 'i9', name: 'Frozen Broccoli', quantity: '1 bag', category: 'Frozen', price: 1.15, aisle: 'Aisle 3' },
      { id: 'i10', name: 'Olive Oil', quantity: '2 tbsp', category: 'Pantry', price: 0.20, aisle: 'Aisle 2' }
    ],
    instructions: ['Preheat oven to 400°F.', 'Toss chicken and broccoli in oil.', 'Roast for 20 minutes.']
  }
];
