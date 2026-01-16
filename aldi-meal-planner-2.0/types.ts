
export interface Ingredient {
  id: string;
  name: string;
  quantity: string;
  category: string;
  price: number;
  aisle?: string;
  checked?: boolean;
}

export interface Recipe {
  id: string;
  name: string;
  costPerServing: number;
  ingredients: Ingredient[];
  instructions: string[];
  category: string;
  image?: string;
}

export interface UserPreferences {
  likes: string;
  dislikes: string;
  exclusions: string;
  budget?: number;
}

export interface MealPlan {
  days: number;
  meals: {
    day: number;
    recipe: Recipe;
  }[];
  totalCost: number;
}

export enum AppStage {
  INPUT = 'INPUT',
  PREFERENCES = 'PREFERENCES',
  GENERATING = 'GENERATING',
  RESULT = 'RESULT'
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}
