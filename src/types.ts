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
  WELCOME = 'WELCOME',
  AUTH = 'AUTH',
  ONBOARDING_INTRO = 'ONBOARDING_INTRO',
  INPUT = 'INPUT',
  PREFERENCES = 'PREFERENCES',
  GENERATING = 'GENERATING',
  RESULT = 'RESULT'
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}
