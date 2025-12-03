import { useState, useEffect } from 'react';
import { IconX, IconLoader, IconRefresh } from '@tabler/icons-react';
import { getAlternativeRecipes, dislikeRecipe } from '../api/recipePreferences';
import { supabase } from '../lib/supabase';

/**
 * Recipe Swap Modal
 * Allows users to swap out recipes they don't like
 * Automatically blacklists the old recipe
 */
export default function RecipeSwapModal({ day, onSwap, onClose }) {
  const [alternatives, setAlternatives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [swapping, setSwapping] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    loadAlternatives();
  }, []);

  const loadAlternatives = async () => {
    setLoading(true);
    try {
      const alts = await getAlternativeRecipes(day.recipe_id, {
        category: day.recipe?.category,
        maxCost: day.recipe?.total_cost ? day.recipe.total_cost + 3 : 20
      });
      setAlternatives(alts);
    } catch (error) {
      console.error('Failed to load alternatives:', error);
      alert('Failed to load alternative recipes');
    } finally {
      setLoading(false);
    }
  };

  const handleSwap = async (newRecipe) => {
    if (!window.confirm(`Replace "${day.recipe.name}" with "${newRecipe.name}"?`)) {
      return;
    }

    setSwapping(true);
    try {
      // Blacklist the old recipe
      await dislikeRecipe(day.recipe_id, reason || 'User requested swap');

      // Update the meal plan with new recipe
      const { error } = await supabase
        .from('meal_plans')
        .update({ recipe_id: newRecipe.id })
        .eq('id', day.id);

      if (error) throw error;

      alert(`✓ Swapped to "${newRecipe.name}" and blacklisted "${day.recipe.name}"`);
      onSwap();
      onClose();
    } catch (error) {
      console.error('Swap failed:', error);
      alert(`Failed to swap recipe: ${error.message}`);
    } finally {
      setSwapping(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Swap Recipe</h2>
            <p className="text-sm text-gray-600 mt-1">
              Currently: <span className="font-semibold">{day.recipe?.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            disabled={swapping}
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Reason Input */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Why don&apos;t you like this recipe? (Optional)
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Too spicy, Don't like the ingredients"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            This recipe will be blacklisted and won&apos;t appear in future meal plans
          </p>
        </div>

        {/* Alternatives List */}
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <IconLoader className="animate-spin text-gray-400" size={32} />
              <span className="ml-3 text-gray-600">Loading alternatives...</span>
            </div>
          ) : alternatives.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">No alternative recipes found</p>
              <button
                onClick={loadAlternatives}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                <IconRefresh size={16} />
                Try Again
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Alternative Recipes ({alternatives.length})
              </h3>
              {alternatives.map((recipe) => (
                <div
                  key={recipe.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-green-500 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{recipe.name}</h4>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                          {recipe.category}
                        </span>
                        <span>${recipe.total_cost?.toFixed(2)}</span>
                        <span>{recipe.servings} servings</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleSwap(recipe)}
                      disabled={swapping}
                      className="ml-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                    >
                      {swapping ? 'Swapping...' : 'Use This'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
