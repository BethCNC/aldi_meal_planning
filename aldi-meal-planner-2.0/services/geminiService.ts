
import { GoogleGenAI, Type } from "@google/genai";
import { MealPlan, Recipe, UserPreferences } from "../types";
import { FALLBACK_RECIPES } from "./recipeFallbacks";

const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || '';
if (!apiKey) {
  console.error('❌ GEMINI_API_KEY is missing! Meal plan generation will use fallback recipes.');
  console.error('   Please set GEMINI_API_KEY in your .env file');
}

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const generateMealPlan = async (days: number, preferences: UserPreferences): Promise<MealPlan> => {
  // If no API key, use fallbacks immediately
  if (!ai || !apiKey) {
    console.warn('⚠️  Using fallback recipes - GEMINI_API_KEY not configured');
    const fallbackMeals = Array.from({ length: days }, (_, i) => ({
      day: i + 1,
      recipe: FALLBACK_RECIPES[i % FALLBACK_RECIPES.length]
    }));
    return {
      days,
      meals: fallbackMeals,
      totalCost: fallbackMeals.reduce((acc, m) => acc + (m.recipe.costPerServing * 4), 0)
    };
  }

  try {
    const budgetConstraint = preferences.budget 
      ? `\n7. BUDGET CONSTRAINT: The TOTAL cost of all ingredients across all ${days} days MUST NOT exceed $${preferences.budget.toFixed(2)}. Calculate ingredient prices carefully and ensure the sum of all ingredient prices in the "ingredients" arrays across all meals stays under this limit.`
      : '';
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are an expert meal planner for neurodivergent users. 
      Generate a meal plan for ${days} days using affordable Aldi ingredients.
      
      USER PREFERENCES:
      - Likes: ${preferences.likes || 'None specified'}
      - Dislikes: ${preferences.dislikes || 'None specified'}
      - Strictly Exclude (Allergies/Dietary): ${preferences.exclusions || 'None specified'}
      ${preferences.budget ? `- Budget: $${preferences.budget.toFixed(2)} maximum for the entire ${days}-day plan` : ''}

      CRITICAL RULES:
      1. One main dinner per day.
      2. Instructions must be "Neurodivergent Friendly": Short, active voice, numbered steps, no walls of text.
      3. Rotate proteins (Chicken, Beef, Pork, Veggie, Seafood).
      4. Ingredients must include estimated Aldi pricing.
      5. Output as a single JSON object.
      6. IMPORTANT: Respect the Likes/Dislikes and strictly exclude any ingredients or cuisines mentioned in the exclusions list.${budgetConstraint}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            meals: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.INTEGER },
                  recipe: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      name: { type: Type.STRING },
                      costPerServing: { type: Type.NUMBER },
                      category: { type: Type.STRING },
                      instructions: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                      },
                      ingredients: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            id: { type: Type.STRING },
                            name: { type: Type.STRING },
                            quantity: { type: Type.STRING },
                            category: { type: Type.STRING },
                            price: { type: Type.NUMBER },
                            aisle: { type: Type.STRING }
                          },
                          required: ["name", "quantity", "category", "price"]
                        }
                      }
                    },
                    required: ["name", "ingredients", "instructions", "costPerServing"]
                  }
                },
                required: ["day", "recipe"]
              }
            },
            totalCost: { type: Type.NUMBER }
          },
          required: ["meals", "totalCost"]
        }
      }
    });

    const data = JSON.parse(response.text || '{}');
    
    // Validate the response
    if (!data.meals || !Array.isArray(data.meals) || data.meals.length === 0) {
      throw new Error('Invalid response from AI: missing or empty meals array');
    }
    
    return {
      days,
      meals: data.meals,
      totalCost: data.totalCost || 0
    };
  } catch (error) {
    console.error("❌ AI Generation failed, using fallbacks:", error);
    if (error instanceof Error) {
      console.error("   Error details:", error.message);
    }
    const fallbackMeals = Array.from({ length: days }, (_, i) => ({
      day: i + 1,
      recipe: FALLBACK_RECIPES[i % FALLBACK_RECIPES.length]
    }));
    return {
      days,
      meals: fallbackMeals,
      totalCost: fallbackMeals.reduce((acc, m) => acc + (m.recipe.costPerServing * 4), 0)
    };
  }
};

/**
 * Generate a single meal replacement that fits with the existing meal plan
 */
export const generateSingleMeal = async (
  day: number,
  existingMeals: { day: number; recipe: Recipe }[],
  preferences: UserPreferences,
  reason?: string
): Promise<Recipe> => {
  // If no API key, use fallback
  if (!ai || !apiKey) {
    const fallback = FALLBACK_RECIPES[day % FALLBACK_RECIPES.length];
    return fallback;
  }

  try {
    const existingMealNames = existingMeals.map(m => m.recipe.name).join(', ');
    const budgetConstraint = preferences.budget 
      ? `\n- Budget: Ensure this meal fits within the overall budget of $${preferences.budget.toFixed(2)} for the entire plan.`
      : '';
    
    const reasonText = reason ? `\n- User feedback: ${reason}` : '';
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are an expert meal planner for neurodivergent users. 
      Generate a SINGLE dinner recipe for Day ${day} using affordable Aldi ingredients.
      
      USER PREFERENCES:
      - Likes: ${preferences.likes || 'None specified'}
      - Dislikes: ${preferences.dislikes || 'None specified'}
      - Strictly Exclude (Allergies/Dietary): ${preferences.exclusions || 'None specified'}${reasonText}
      
      EXISTING MEALS IN PLAN (avoid repeating these):
      ${existingMealNames || 'None yet'}
      
      CRITICAL RULES:
      1. This must be a FULL DINNER (not a side dish or snack like fried rice alone).
      2. Instructions must be "Neurodivergent Friendly": Short, active voice, numbered steps, no walls of text.
      3. Ingredients must include estimated Aldi pricing.
      4. Make it different from the existing meals.
      5. Ensure it's substantial enough for a complete dinner meal.${budgetConstraint}
      6. IMPORTANT: Respect the Likes/Dislikes and strictly exclude any ingredients or cuisines mentioned in the exclusions list.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            name: { type: Type.STRING },
            costPerServing: { type: Type.NUMBER },
            category: { type: Type.STRING },
            instructions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            ingredients: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  quantity: { type: Type.STRING },
                  category: { type: Type.STRING },
                  price: { type: Type.NUMBER },
                  aisle: { type: Type.STRING }
                },
                required: ["name", "quantity", "category", "price"]
              }
            }
          },
          required: ["name", "ingredients", "instructions", "costPerServing"]
        }
      }
    });

    const data = JSON.parse(response.text || '{}');
    
    if (!data.name || !data.ingredients || !data.instructions) {
      throw new Error('Invalid response from AI: missing required fields');
    }
    
    return {
      id: data.id || `meal-${day}-${Date.now()}`,
      name: data.name,
      costPerServing: data.costPerServing || 0,
      category: data.category || 'Other',
      ingredients: data.ingredients || [],
      instructions: data.instructions || []
    };
  } catch (error) {
    console.error("❌ Single meal generation failed, using fallback:", error);
    return FALLBACK_RECIPES[day % FALLBACK_RECIPES.length];
  }
};
