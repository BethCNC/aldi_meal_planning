import React, { useState } from 'react';
import { MealPlan, Recipe, UserPreferences } from '../types';
import { generateSingleMeal } from '../services/geminiService';
import RecipeCard from './RecipeCard';

interface ReviewMealPlanProps {
  mealPlan: MealPlan;
  preferences: UserPreferences;
  onApprove: (plan: MealPlan) => void;
  onRegenerateAll: () => void;
}

const ReviewMealPlan: React.FC<ReviewMealPlanProps> = ({ 
  mealPlan, 
  preferences, 
  onApprove, 
  onRegenerateAll 
}) => {
  const [swappingDay, setSwappingDay] = useState<number | null>(null);
  const [showReasonInput, setShowReasonInput] = useState<number | null>(null);
  const [swapReason, setSwapReason] = useState<string>('');
  const [updatedPlan, setUpdatedPlan] = useState<MealPlan>(mealPlan);

  const handleSwapMeal = async (day: number, reason?: string) => {
    setSwappingDay(day);
    setShowReasonInput(null);
    try {
      // Get all other meals (excluding the one being swapped)
      const otherMeals = updatedPlan.meals.filter(m => m.day !== day);
      
      const newRecipe = await generateSingleMeal(
        day,
        otherMeals,
        preferences,
        reason || swapReason || 'User wants a different option'
      );
      
      // Update the meal plan
      const updatedMeals = updatedPlan.meals.map(meal => 
        meal.day === day 
          ? { ...meal, recipe: newRecipe }
          : meal
      );
      
      // Recalculate total cost
      const newTotalCost = updatedMeals.reduce((sum, meal) => {
        return sum + (meal.recipe.ingredients.reduce((ingSum, ing) => ingSum + ing.price, 0));
      }, 0);
      
      setUpdatedPlan({
        ...updatedPlan,
        meals: updatedMeals,
        totalCost: newTotalCost
      });
      setSwapReason(''); // Clear reason after swap
    } catch (error) {
      console.error('Error swapping meal:', error);
    } finally {
      setSwappingDay(null);
    }
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const getDayName = (day: number) => {
    const today = new Date().getDay();
    const targetDay = (today + day - 1) % 7;
    return dayNames[targetDay];
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto px-4">
        <span className="inline-block px-3 py-1 bg-primary/20 text-stone-900 text-xs font-bold rounded-full mb-4">
          Review Your Plan
        </span>
        <h2 className="text-4xl font-bold text-stone-900 mb-4">Review Your Meal Plan</h2>
        <p className="text-lg text-stone-600 mb-6">
          Review each meal below. Don't like something? Swap it for a different option!
        </p>
        
        {/* Budget Summary */}
        <div className="bg-stone-800 rounded-2xl p-6 text-white mb-8">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-stone-300 text-sm font-medium mb-1">Estimated Total</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">${updatedPlan.totalCost.toFixed(2)}</span>
                <span className="text-primary font-medium">at Aldi</span>
              </div>
              {preferences.budget && (
                <div className="mt-2">
                  <span className={`text-sm font-bold ${updatedPlan.totalCost <= preferences.budget ? 'text-green-400' : 'text-red-400'}`}>
                    {updatedPlan.totalCost <= preferences.budget ? '✓ Within Budget' : '✗ Over Budget'}
                  </span>
                  <span className="text-stone-400 text-sm ml-2">
                    (${preferences.budget.toFixed(2)} limit)
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Meal List with Swap Options */}
      <div className="space-y-4 max-w-3xl mx-auto px-4">
        {updatedPlan.meals.map((meal) => {
          const isSwapping = swappingDay === meal.day;
          return (
            <div key={meal.day} className="relative">
              <div className="bg-white rounded-2xl border-2 border-stone-200 shadow-sm p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-semibold text-stone-500">
                        Day {meal.day} • {getDayName(meal.day)}
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold text-stone-900 mb-1">{meal.recipe.name}</h3>
                    <p className="text-stone-600 text-sm mb-2">{meal.recipe.category}</p>
                    <div className="flex gap-4 text-sm">
                      <span className="text-stone-600">
                        ${meal.recipe.costPerServing.toFixed(2)}/serving
                      </span>
                      <span className="text-stone-500">
                        {meal.recipe.ingredients.length} ingredients
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    {showReasonInput === meal.day ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={swapReason}
                          onChange={(e) => setSwapReason(e.target.value)}
                          placeholder="Why swap? (e.g., 'not enough for dinner')"
                          className="px-4 py-2 border-2 border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSwapMeal(meal.day, swapReason);
                            } else if (e.key === 'Escape') {
                              setShowReasonInput(null);
                              setSwapReason('');
                            }
                          }}
                        />
                        <button
                          onClick={() => handleSwapMeal(meal.day, swapReason)}
                          disabled={isSwapping}
                          className="px-4 py-2 bg-primary text-stone-900 font-bold rounded-lg hover:bg-primary-dark transition-colors text-sm"
                        >
                          Swap
                        </button>
                        <button
                          onClick={() => {
                            setShowReasonInput(null);
                            setSwapReason('');
                          }}
                          className="px-4 py-2 bg-stone-200 text-stone-700 font-bold rounded-lg hover:bg-stone-300 transition-colors text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowReasonInput(meal.day)}
                        disabled={isSwapping}
                        className={`px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shrink-0 ${
                          isSwapping
                            ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                            : 'bg-stone-900 text-white hover:bg-stone-800 hover:scale-105 active:scale-95'
                        } focus:outline-none focus:ring-4 focus:ring-stone-500`}
                      >
                        {isSwapping ? (
                          <>
                            <span className="material-symbols-outlined animate-spin">progress_activity</span>
                            Generating...
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined">swap_horiz</span>
                            Swap Meal
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Quick Preview */}
                <div className="mt-4 pt-4 border-t border-stone-100">
                  <p className="text-sm text-stone-600 mb-2">
                    <span className="font-semibold">Quick preview:</span> {meal.recipe.instructions[0] || 'No instructions available'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {meal.recipe.ingredients.slice(0, 4).map((ing, idx) => (
                      <span key={idx} className="px-2 py-1 bg-stone-50 text-stone-600 text-xs rounded-lg">
                        {ing.name}
                      </span>
                    ))}
                    {meal.recipe.ingredients.length > 4 && (
                      <span className="px-2 py-1 bg-stone-100 text-stone-500 text-xs rounded-lg">
                        +{meal.recipe.ingredients.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="max-w-2xl mx-auto px-4 space-y-4">
        <div className="flex gap-4">
          <button
            onClick={() => onApprove(updatedPlan)}
            className="flex-1 py-5 bg-primary text-stone-900 font-bold text-lg rounded-2xl shadow-lg hover:bg-primary-dark transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 focus:outline-none focus:ring-4 focus:ring-primary/50"
          >
            <span className="material-symbols-outlined">check_circle</span>
            Looks Good! Continue
          </button>
          
          <button
            onClick={onRegenerateAll}
            className="px-6 py-5 bg-white border-2 border-stone-200 text-stone-700 font-bold rounded-2xl hover:border-stone-400 transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-stone-200"
          >
            <span className="material-symbols-outlined">refresh</span>
            New Plan
          </button>
        </div>
        
        <p className="text-center text-sm text-stone-500">
          💡 Tip: You can swap individual meals or generate a completely new plan
        </p>
      </div>
    </div>
  );
};

export default ReviewMealPlan;
