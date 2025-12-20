import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { RecipeRating } from '../components/rating/RecipeRating';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { submitRating, getRecipeRating } from '../api/ratingService';
import { fetchRecipeWithIngredients } from '../api/recipeCostCalculator'; // Reuse existing fetch

export function MealRatingView() {
  const { id } = useParams(); // Recipe ID
  const navigate = useNavigate();
  const location = useLocation();
  const mealPlanId = location.state?.mealPlanId;

  const [recipe, setRecipe] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load recipe details
      const { recipe: recipeData } = await fetchRecipeWithIngredients(id);
      setRecipe(recipeData);

      // Load existing rating if any
      const existing = await getRecipeRating(id);
      if (existing) {
        setRating(existing.rating);
        setComment(existing.comment || '');
      }
    } catch (err) {
      console.error('Failed to load rating data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    try {
      await submitRating({
        recipeId: id,
        mealPlanId,
        rating,
        comment
      });
      // Navigate back
      navigate(-1);
    } catch (err) {
      console.error('Failed to submit rating:', err);
      alert('Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading..." />;
  if (!recipe) return <div className="p-4">Recipe not found</div>;

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-6">
      <header className="text-center">
        <h1 className="text-2xl font-bold text-text-body">Rate this Meal</h1>
        <p className="text-icon-subtle mt-2">How was {recipe.name}?</p>
      </header>

      <Card className="p-6 space-y-6 flex flex-col items-center">
        {recipe.image_url && (
          <img 
            src={recipe.image_url} 
            alt={recipe.name} 
            className="w-32 h-32 object-cover rounded-full shadow-md"
          />
        )}
        
        <div className="flex flex-col items-center gap-2">
          <RecipeRating rating={rating} onChange={setRating} size="lg" />
          <p className="text-sm text-icon-subtle">
            {rating === 0 ? 'Tap to rate' : `${rating} out of 5 stars`}
          </p>
        </div>

        <div className="w-full">
          <label className="block text-sm font-medium text-text-body mb-2">
            Comments (optional)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full p-3 border border-border-subtle rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
            placeholder="What did you like or dislike? Any modifications?"
            rows={4}
          />
        </div>

        <Button 
          className="w-full" 
          onClick={handleSubmit}
          disabled={rating === 0 || submitting}
        >
          {submitting ? 'Saving...' : 'Save Rating'}
        </Button>
      </Card>
    </div>
  );
}

