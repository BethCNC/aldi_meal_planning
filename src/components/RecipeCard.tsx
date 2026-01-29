import React, { useState } from 'react';
import { Recipe } from '../types';
import { useSupabase } from '../SupabaseProvider';
import { Wallet, ShoppingCart, ChevronUp, ChevronDown, ReceiptText, Flame, Check, Star } from 'lucide-react'; // New import

interface RecipeCardProps {
  recipe: Recipe & { rating?: number }; // Add rating to recipe type
  day: number;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, day }) => {
  const { session } = useSupabase(); // Get session for auth
  const [isExpanded, setIsExpanded] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [currentRating, setCurrentRating] = useState(recipe.rating || 3);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleStep = (idx: number) => {
    const next = new Set(completedSteps);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setCompletedSteps(next);
  };

  const handleRating = async (rating: number) => {
    if (!session || isSubmitting) return;

    setIsSubmitting(true);
    setCurrentRating(rating); // Optimistic UI update

    try {
      const response = await fetch(`/api/v1/recipes/${recipe.id}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ rating }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit rating.');
      }
      // Optionally handle success, e.g., show a 'Saved!' message
    } catch (error) {
      console.error(error);
      setCurrentRating(recipe.rating || 3); // Revert on error
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalRecipeCost = recipe.ingredients.reduce((sum, ing) => sum + ing.price, 0);

  const StarRating = () => (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => handleRating(star)}
          disabled={isSubmitting}
          className="transition-transform active:scale-90"
        >
          <Star
            className={`w-6 h-6 ${
              star <= currentRating ? 'text-primary' : 'text-stone-300'
            }`}
          />
        </button>
      ))}
    </div>
  );

  return (
    <div id={`recipe-day-${day}`} className={`bg-white rounded-3xl border-4 transition-all duration-300 ${isExpanded ? 'border-primary shadow-xl scale-[1.01]' : 'border-stone-200 shadow-sm'}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-6 flex items-center justify-between text-left"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-5">
          <div className={`w-14 h-14 font-extrabold text-xl flex items-center justify-center rounded-2xl border-2 transition-colors ${isExpanded ? 'bg-primary text-stone-900 border-primary-dark' : 'bg-stone-100 text-stone-500 border-stone-200'}`}>
            {day}
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-primary-dark mb-1 block">Day {day} • {recipe.category}</span>
            <h4 className="font-extrabold text-2xl text-stone-900 leading-tight">{recipe.name}</h4>
            <div className="flex gap-4 mt-2">
              <span className="text-sm font-bold text-stone-600 flex items-center gap-1">
                <Wallet className="w-4 h-4" />
                ${recipe.costPerServing.toFixed(2)}/ea
              </span>
              <span className="text-sm font-bold text-stone-400 flex items-center gap-1">
                <ShoppingCart className="w-4 h-4" />
                ${totalRecipeCost.toFixed(2)} total
              </span>
            </div>
          </div>
        </div>
        <span className={`text-4xl transition-transform duration-500 ${isExpanded ? 'rotate-180 text-primary' : 'text-stone-300'}`}>
          {isExpanded ? <ChevronUp className="w-8 h-8" /> : <ChevronDown className="w-8 h-8" />}
        </span>
      </button>

      {isExpanded && (
        <div className="px-6 pb-8 /* animate-in fade-in slide-in-from-top-4 duration-300 */">
          <div className="h-1 bg-stone-100 w-full mb-8 rounded-full" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Ingredients Column */}
            <div>
              <h5 className="font-extrabold text-xl text-stone-900 mb-6 flex items-center gap-2">
                <ReceiptText className="text-primary-dark w-6 h-6" />
                Ingredients Needed
              </h5>
              <div className="space-y-3">
                {recipe.ingredients.map((ing, i) => (
                  <div key={i} className="flex justify-between items-center p-4 rounded-2xl bg-stone-50 border-2 border-stone-100 group">
                    <div className="flex flex-col">
                      <span className="font-bold text-stone-800">{ing.name}</span>
                      <span className="text-xs text-stone-500 font-bold uppercase tracking-tighter">{ing.quantity}</span>
                    </div>
                    <span className="text-sm font-mono font-black text-stone-400 group-hover:text-primary-dark transition-colors">
                      ${ing.price.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Steps Column */}
            <div>
              <h5 className="font-extrabold text-xl text-stone-900 mb-6 flex items-center gap-2">
                <Flame className="text-primary-dark w-6 h-6" />
                Step-by-Step Instructions
              </h5>
              <div className="space-y-4">
                {recipe.instructions.map((step, i) => (
                  <button
                    key={i}
                    onClick={() => toggleStep(i)}
                    className={`w-full text-left p-5 rounded-2xl border-4 transition-all flex gap-4 ${
                      completedSteps.has(i) 
                        ? 'bg-stone-50 border-stone-200 opacity-60' 
                        : 'bg-white border-stone-100 hover:border-stone-300'
                    }`}
                  >
                    <div className={`w-10 h-10 shrink-0 flex items-center justify-center rounded-full font-black text-sm transition-colors border-2 ${
                      completedSteps.has(i) ? 'bg-primary text-stone-900 border-primary-dark' : 'bg-stone-100 text-stone-500 border-stone-200'
                    }`}>
                      {completedSteps.has(i) ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        i + 1
                      )}
                    </div>
                    <p className={`text-lg font-bold leading-tight ${completedSteps.has(i) ? 'line-through text-stone-400' : 'text-stone-700'}`}>
                      {step}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-12 p-8 bg-stone-900 rounded-[2rem] text-white flex items-center justify-between border-4 border-stone-800">
            <div>
              <p className="text-stone-400 text-xs font-bold uppercase tracking-widest mb-1">Rate this recipe</p>
              <StarRating />
            </div>
            <button 
              onClick={() => setIsExpanded(false)}
              className="px-8 py-4 bg-white text-stone-900 font-black rounded-2xl hover:bg-stone-100 transition-all active:scale-95 border-2 border-stone-200 shadow-lg"
            >
              Close Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipeCard;
