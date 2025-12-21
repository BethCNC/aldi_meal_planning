
import { GoogleGenAI, Type } from "@google/genai";
import { MealPlan, Recipe, UserPreferences } from "../types";
import { FALLBACK_RECIPES } from "./recipeFallbacks";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateMealPlan = async (days: number, preferences: UserPreferences): Promise<MealPlan> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are an expert meal planner for neurodivergent users. 
      Generate a meal plan for ${days} days using affordable Aldi ingredients.
      
      USER PREFERENCES:
      - Likes: ${preferences.likes || 'None specified'}
      - Dislikes: ${preferences.dislikes || 'None specified'}
      - Strictly Exclude (Allergies/Dietary): ${preferences.exclusions || 'None specified'}

      CRITICAL RULES:
      1. One main dinner per day.
      2. Instructions must be "Neurodivergent Friendly": Short, active voice, numbered steps, no walls of text.
      3. Rotate proteins (Chicken, Beef, Pork, Veggie, Seafood).
      4. Ingredients must include estimated Aldi pricing.
      5. Output as a single JSON object.
      6. IMPORTANT: Respect the Likes/Dislikes and strictly exclude any ingredients or cuisines mentioned in the exclusions list.`,
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
    return {
      days,
      meals: data.meals,
      totalCost: data.totalCost || 0
    };
  } catch (error) {
    console.error("AI Generation failed, using fallbacks:", error);
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
