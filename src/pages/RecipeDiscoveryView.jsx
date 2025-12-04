import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { discoverNewRecipes, saveDiscoveredRecipe } from '../api/ai/recipeDiscovery';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { IconSearch, IconPlus, IconCheck } from '@tabler/icons-react';

export function RecipeDiscoveryView() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(null); // ID of recipe being saved
  const [savedIds, setSavedIds] = useState(new Set());

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const recipes = await discoverNewRecipes(query, 3);
      setResults(recipes);
    } catch (error) {
      console.error('Discovery failed:', error);
      alert('Failed to find recipes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (recipe, index) => {
    setSaving(index);
    try {
      const saved = await saveDiscoveredRecipe(recipe);
      if (saved) {
        setSavedIds(prev => new Set(prev).add(index));
      }
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save recipe.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[430px] flex flex-col min-h-screen space-y-6 pb-24">
      <header className="sticky top-0 z-10 bg-surface-page/95 backdrop-blur border-b border-border-subtle px-4 py-3 flex items-center gap-3">
        <Button variant="icon" onClick={() => navigate(-1)}>
          ←
        </Button>
        <h1 className="text-lg font-semibold text-text-body">Discover Recipes</h1>
      </header>

      <div className="px-4 flex-1 space-y-6">
        <div>
          <p className="text-text-subtle mb-4 text-sm">
            Find new budget-friendly meals using Aldi ingredients.
          </p>
          
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., 'Spicy chicken under $10'"
              className="flex-1 rounded-lg border border-border-input bg-surface-input px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <Button type="submit" disabled={loading || !query.trim()}>
              <IconSearch className="h-5 w-5" />
            </Button>
          </form>
        </div>

        {loading ? (
          <div className="py-12">
            <LoadingSpinner message="Chef AI is inventing recipes..." />
          </div>
        ) : (
          <div className="space-y-4">
            {results.map((recipe, index) => {
              const isSaved = savedIds.has(index);
              
              return (
                <Card key={index} className="p-4 overflow-hidden">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-text-body text-lg">{recipe.name}</h3>
                      <div className="flex gap-2 text-xs text-text-subtle mt-1">
                        <span className="bg-surface-tertiary px-2 py-0.5 rounded-full">
                          {recipe.category}
                        </span>
                        <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                          ${recipe.estimated_total_cost?.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="small"
                      variant={isSaved ? "secondary" : "primary"}
                      disabled={isSaved || saving === index}
                      onClick={() => handleSave(recipe, index)}
                    >
                      {saving === index ? (
                        "..."
                      ) : isSaved ? (
                        <IconCheck className="h-4 w-4" />
                      ) : (
                        <IconPlus className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  <p className="text-sm text-text-body mb-3 italic">
                    "{recipe.reasoning}"
                  </p>

                  <div className="mb-3">
                    <h4 className="text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1">
                      Ingredients ({recipe.ingredients.length})
                    </h4>
                    <p className="text-sm text-text-body line-clamp-2">
                      {recipe.ingredients.map(i => i.item).join(', ')}
                    </p>
                  </div>
                </Card>
              );
            })}
            
            {results.length === 0 && !loading && (
              <div className="text-center py-12 text-text-disabled">
                Try searching for "One pot pasta" or "Vegetarian tacos"
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

