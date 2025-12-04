import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Button } from '../components/ui/Button';
import { RecipeHeader } from '../components/recipe/RecipeHeader';
import { IngredientList } from '../components/recipe/IngredientList';
import { InstructionList } from '../components/recipe/InstructionList';
import { formatCurrency } from '../utils/numberFormat';
import {
  fetchRecipeWithIngredients,
  computeRecipeCost,
  calculateRecipeCost,
} from '../api/recipeCostCalculator';
import { getRecipeImage } from '../api/recipeImageService';

export function RecipeDetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [recipe, setRecipe] = useState(null);
  const [ingredients, setIngredients] = useState([]);
  const [checkedIngredients, setCheckedIngredients] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [costInfo, setCostInfo] = useState(null);
  const [recalculating, setRecalculating] = useState(false);
  const [costError, setCostError] = useState(null);
  
  useEffect(() => {
    setCheckedIngredients(new Set());
    loadRecipe();
  }, [id]);
  
  const loadRecipe = async ({ skipImage = false } = {}) => {
    setLoading(true);
    setCostError(null);
    try {
      const { recipe: recipeData, ingredients: ingredientRows } = await fetchRecipeWithIngredients(id);
      if (!recipeData) {
        throw new Error('Recipe not found');
      }

      const cost = computeRecipeCost(recipeData, ingredientRows);

      let imageUrl = recipeData.image_url;
      if (!skipImage) {
        const resolvedImage = await getRecipeImage({
          ...recipeData,
          name: recipeData.name,
          image_url: recipeData.image_url,
          source_url: recipeData.source_url,
        });
        if (resolvedImage) {
          imageUrl = resolvedImage;
        }
      }

      setRecipe({
        ...recipeData,
        image_url: imageUrl,
        total_cost: cost.totalCost,
        cost_per_serving: cost.costPerServing,
      });
      setIngredients(ingredientRows || []);
      setCostInfo(cost);
    } catch (error) {
      console.error('Error loading recipe:', error);
      setRecipe(null);
      setIngredients([]);
      setCostInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculateCosts = async () => {
    setRecalculating(true);
    setCostError(null);
    try {
      const result = await calculateRecipeCost(id, { persist: false });
      const totalCost = result.recipe.total_cost ?? 0;
      const costPerServing = result.recipe.cost_per_serving ?? null;

      setRecipe((prev) =>
        prev
          ? {
              ...prev,
              total_cost: totalCost,
              cost_per_serving: costPerServing,
            }
          : result.recipe
      );

      setIngredients((prev) =>
        prev.map((item) => {
          const updated = result.breakdown.find((entry) => entry.id === item.id);
          if (!updated) return item;
          return {
            ...item,
            calculated_cost: updated.cost,
          };
        })
      );

      setCostInfo({
        totalCost,
        costPerServing,
        servings: result.recipe.servings ?? costInfo?.servings ?? null,
        breakdown: result.breakdown,
      });
    } catch (error) {
      console.error('Failed to recalculate recipe costs:', error);
      setCostError(error.message || 'Unable to recalculate costs right now.');
    } finally {
      setRecalculating(false);
    }
  };
  
  const toggleIngredient = (ingredientId) => {
    const newChecked = new Set(checkedIngredients);
    if (newChecked.has(ingredientId)) {
      newChecked.delete(ingredientId);
    } else {
      newChecked.add(ingredientId);
    }
    setCheckedIngredients(newChecked);
  };
  
  if (loading) {
    return <LoadingSpinner message="Loading recipe..." />;
  }
  
  if (!recipe) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-2xl font-bold mb-4">Recipe not found</h2>
        <Button onClick={() => navigate('/')}>Back to Home</Button>
      </div>
    );
  }
  
  const metaItems = [
    recipe.time ? `⏱ ${recipe.time} min` : null,
    ingredients.length ? `🍳 ${ingredients.length} ingredients` : null,
    recipe.servings ? `🍽 ${recipe.servings} servings` : null,
    recipe.cost_per_serving != null ? `💵 ${formatCurrency(recipe.cost_per_serving)}/serving` : null,
    recipe.total_cost != null ? `Total ${formatCurrency(recipe.total_cost)}` : null,
  ].filter(Boolean);

  return (
    <div className="mx-auto flex w-full max-w-[430px] flex-col space-y-6 px-4 pb-24">
      <div className="sticky top-0 z-30 bg-surface-page/90 pt-4 backdrop-blur">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="w-fit text-sm font-semibold text-text-body"
        >
          ← Back to Meals
        </Button>
      </div>

      <div className="overflow-hidden rounded-3xl border border-border-subtle bg-surface-page shadow-sm">
        <header className="bg-surface-inverse px-6 py-6 text-center text-text-inverse">
          <h1 className="text-3xl font-semibold leading-8">{recipe.name}</h1>
          {metaItems.length > 0 && (
            <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm text-text-inverse/80">
              {metaItems.map((item, index) => (
                <span key={index}>{item}</span>
              ))}
            </div>
          )}
        </header>

        <section className="bg-surface-primary px-6 py-2 text-center text-xs font-semibold uppercase tracking-[0.3em] text-text-display">
          Ingredients
        </section>
        <section className="px-6 py-4">
          <IngredientList
            items={ingredients}
            checked={checkedIngredients}
            onToggle={toggleIngredient}
            interactive={false}
            columns={2}
          />
        </section>

        <section className="bg-surface-primary px-6 py-2 text-center text-xs font-semibold uppercase tracking-[0.3em] text-text-display">
          Instructions
        </section>
        <section className="px-6 py-4">
          <InstructionList instructions={recipe.instructions} variant="list" />
        </section>

        {recipe.source_url && (
          <section className="px-6 pb-6 text-center text-sm text-icon-subtle">
            <p className="mb-2 font-semibold text-text-body">Source</p>
            <a
              href={recipe.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-surface-primary hover:underline"
            >
              View original recipe →
            </a>
          </section>
        )}

        <div className="px-4 pb-4">
          <RecipeHeader recipe={recipe} showMeta={false} className="h-[220px]" />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Button onClick={handleRecalculateCosts} disabled={recalculating}>
          {recalculating ? 'Recalculating…' : 'Recalculate Cost'}
        </Button>
        {costError && (
          <div className="rounded-xl border border-error/40 bg-error/10 px-4 py-3 text-sm text-text-body">
            {costError}
          </div>
        )}
      </div>
    </div>
  );
}
