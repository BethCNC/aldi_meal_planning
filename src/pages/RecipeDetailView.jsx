import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Checkbox } from '../components/ui/Checkbox';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export function RecipeDetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [recipe, setRecipe] = useState(null);
  const [ingredients, setIngredients] = useState([]);
  const [checkedIngredients, setCheckedIngredients] = useState(new Set());
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadRecipe();
  }, [id]);
  
  const loadRecipe = async () => {
    setLoading(true);
    try {
      const { data: recipeData, error: recipeError } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .single();
      
      if (recipeError) {
        throw new Error(`Failed to load recipe: ${recipeError.message}`);
      }
      
      if (!recipeData) {
        throw new Error('Recipe not found');
      }
      
      const { data: ingredientsData, error: ingredientsError } = await supabase
        .from('recipe_ingredients')
        .select(`
          *,
          ingredient:ingredients(*)
        `)
        .eq('recipe_id', id);
      
      if (ingredientsError) {
        console.warn('Failed to load ingredients:', ingredientsError.message);
      }
      
      setRecipe(recipeData);
      setIngredients(ingredientsData || []);
    } catch (error) {
      console.error('Error loading recipe:', error);
      // Recipe will be null, which will show "not found" message
    } finally {
      setLoading(false);
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
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Recipe not found</h2>
        <Button onClick={() => navigate('/')}>Back to Home</Button>
      </div>
    );
  }
  
  return (
    <div className="max-w-3xl mx-auto p-4">
      <Button variant="secondary" onClick={() => navigate(-1)} className="mb-6">
        ← Back
      </Button>
      
      <header className="mb-6">
        <h1 className="text-3xl font-bold mb-2 text-text-body">{recipe.name}</h1>
        <div className="flex gap-4 text-stone-600">
          <span>⏱️ {recipe.time || 45} minutes</span>
          <span>💰 ${recipe.total_cost?.toFixed(2) || '0.00'}</span>
          <span>🍽️ {recipe.servings} servings</span>
          <span>${recipe.cost_per_serving?.toFixed(2) || '0.00'}/serving</span>
        </div>
      </header>
      
      <Card className="p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4 text-text-body">Ingredients</h2>
        {ingredients.length === 0 ? (
          <p className="text-stone-600">No ingredients listed for this recipe.</p>
        ) : (
          <div className="space-y-3">
            {ingredients.map((ri) => (
              <Checkbox
                key={ri.id}
                label={`${ri.quantity || ''} ${ri.unit || ''} ${ri.ingredient?.item || ri.ingredient_name || 'Unknown ingredient'}`.trim()}
                checked={checkedIngredients.has(ri.id)}
                onChange={() => toggleIngredient(ri.id)}
              />
            ))}
          </div>
        )}
      </Card>
      
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4 text-text-body">Instructions</h2>
        <div className="prose max-w-none whitespace-pre-wrap text-text-body">
          {recipe.instructions || 'No instructions available.'}
        </div>
      </Card>
      
      {recipe.source_url && (
        <div className="mt-6">
          <a 
            href={recipe.source_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-surface-primary hover:underline"
          >
            View original recipe →
          </a>
        </div>
      )}
    </div>
  );
}
