import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

export function RecipeSuggestionsView() {
  const navigate = useNavigate();
  const location = useLocation();
  const pantryItems = location.state?.pantryItems || [];
  
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matchSource, setMatchSource] = useState(null);
  const [selectedRecipes, setSelectedRecipes] = useState([]);
  
  useEffect(() => {
    findMatches();
  }, []);
  
  const findMatches = async () => {
    setLoading(true);
    
    try {
      if (pantryItems.length === 0) {
        // No pantry items, just get all recipes
        const { data } = await supabase
          .from('recipes')
          .select('*')
          .limit(10);
        setMatches(data || []);
        setMatchSource('standard');
      } else {
        // Use pantry matching
        const pantryIngredientIds = pantryItems.map(item => item.id || item.ingredient_id).filter(Boolean);
        
        if (pantryIngredientIds.length === 0) {
          // No valid ingredient IDs, fallback to standard
          const { data } = await supabase
            .from('recipes')
            .select('*')
            .limit(10);
          setMatches(data || []);
          setMatchSource('standard');
        } else {
          const { data, error } = await supabase
            .rpc('find_recipes_with_pantry_items', { pantry_ids: pantryIngredientIds });
          
          if (error) {
            // RPC function might not exist - fallback to standard
            console.warn('Pantry matching failed, showing all recipes:', error.message);
            const { data: fallbackData } = await supabase
              .from('recipes')
              .select('*')
              .limit(10);
            setMatches(fallbackData || []);
            setMatchSource('standard');
          } else {
            setMatches(data || []);
            setMatchSource('rule-based');
          }
        }
      }
    } catch (error) {
      console.error('Error finding matches:', error);
      // Fallback to showing all recipes on error
      try {
        const { data } = await supabase
          .from('recipes')
          .select('*')
          .limit(10);
        setMatches(data || []);
        setMatchSource('standard');
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  };
  
  const toggleRecipe = (recipeId) => {
    if (selectedRecipes.includes(recipeId)) {
      setSelectedRecipes(selectedRecipes.filter(id => id !== recipeId));
    } else {
      setSelectedRecipes([...selectedRecipes, recipeId]);
    }
  };
  
  const handleContinue = () => {
    navigate('/weekly-plan', { state: { selectedRecipeIds: selectedRecipes, pantryItems } });
  };
  
  if (loading) {
    return <LoadingSpinner message="Finding recipes with your items..." />;
  }
  
  return (
    <div className="max-w-4xl mx-auto p-4">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-text-body">Recipe Suggestions</h1>
        <p className="text-stone-600 mt-2">
          {matchSource === 'ai-assisted' 
            ? 'AI-enhanced suggestions using your pantry items'
            : matchSource === 'rule-based'
            ? `Found ${matches.length} recipes using your pantry items`
            : 'All available recipes'
          }
        </p>
      </header>
      
      {matches.length === 0 ? (
        <EmptyState
          title="No matches found"
          message="Showing your favorite recipes instead"
          action={<Button onClick={() => navigate('/weekly-plan')}>Use Favorites</Button>}
        />
      ) : (
        <>
          <div className="grid gap-4 mb-8">
            {matches.map((recipe) => (
              <Card key={recipe.id} className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold">{recipe.name}</h3>
                  {recipe.match_percentage && (
                    <Badge variant="success">
                      Uses {recipe.pantry_ingredients_used} of {pantryItems.length} items ({recipe.match_percentage}%)
                    </Badge>
                  )}
                </div>
                
                <div className="flex gap-4 text-stone-600 mb-4">
                  <span>⏱️ {recipe.time || 45} min</span>
                  <span>💰 ${recipe.total_cost?.toFixed(2) || '0.00'}</span>
                  <span>🍽️ {recipe.servings} servings</span>
                </div>
                
                {recipe.pantry_items_used && recipe.pantry_items_used.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm text-stone-600">
                      <strong>Uses:</strong> {recipe.pantry_items_used.join(', ')}
                    </p>
                  </div>
                )}
                
                <Button
                  variant={selectedRecipes.includes(recipe.id) ? 'success' : 'primary'}
                  onClick={() => toggleRecipe(recipe.id)}
                >
                  {selectedRecipes.includes(recipe.id) ? '✓ Added' : 'Add to Plan'}
                </Button>
              </Card>
            ))}
          </div>
          
          <div className="flex justify-between items-center">
            <p className="text-stone-600">{selectedRecipes.length} recipes selected</p>
            <Button
              onClick={handleContinue}
              disabled={selectedRecipes.length === 0}
            >
              Continue to Full Week Plan →
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
