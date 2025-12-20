import { useState, useEffect } from 'react';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { RecipeReviewCard } from '../components/moderation/RecipeReviewCard';
import { EmptyState } from '../components/ui/EmptyState';
import { 
  getPendingRecipes, 
  approveRecipe, 
  rejectRecipe, 
  updateRecipe 
} from '../api/moderationService';

export function ModerationQueueView() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadQueue();
  }, []);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const data = await getPendingRecipes();
      setRecipes(data || []);
    } catch (err) {
      console.error('Failed to load moderation queue:', err);
      setError('Failed to load pending recipes.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await approveRecipe(id);
      setRecipes(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error('Failed to approve recipe:', err);
      alert('Failed to approve recipe');
    }
  };

  const handleReject = async (id, reason) => {
    try {
      await rejectRecipe(id, reason);
      setRecipes(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error('Failed to reject recipe:', err);
      alert('Failed to reject recipe');
    }
  };

  const handleUpdate = async (id, updates) => {
    try {
      await updateRecipe(id, updates);
      setRecipes(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    } catch (err) {
      console.error('Failed to update recipe:', err);
      alert('Failed to update recipe');
    }
  };

  if (loading) return <LoadingSpinner message="Loading moderation queue..." />;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-text-body">Moderation Queue</h1>
        <p className="text-icon-subtle">Review pending recipes before they go live.</p>
      </header>

      {error && (
        <div className="bg-error/10 text-error p-4 rounded-lg">
          {error}
        </div>
      )}

      {recipes.length === 0 ? (
        <EmptyState
          title="All caught up!"
          description="There are no pending recipes to review."
          icon="/icons/icon=check.png"
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {recipes.map(recipe => (
            <RecipeReviewCard
              key={recipe.id}
              recipe={recipe}
              onApprove={handleApprove}
              onReject={handleReject}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

