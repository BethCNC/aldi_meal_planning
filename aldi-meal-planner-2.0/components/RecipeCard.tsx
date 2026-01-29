
import React, { useState, useEffect } from 'react';
import { Recipe } from '../types';
import { fetchStockImage, generateRecipeImage } from '../services/imageService';

interface RecipeCardProps {
  recipe: Recipe;
  day: number;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, day }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [imageUrl, setImageUrl] = useState<string | null>(recipe.image || null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);

  useEffect(() => {
    if (isExpanded && !imageUrl && !isLoadingImage) {
      setIsLoadingImage(true);
      fetchStockImage(recipe.name)
        .then(url => {
          if (url) setImageUrl(url);
          // If stock fails or returns null, we could try generate:
          // else generateRecipeImage(`A delicious plate of ${recipe.name}`).then(genUrl => setImageUrl(genUrl));
        })
        .finally(() => setIsLoadingImage(false));
    }
  }, [isExpanded, recipe.name, imageUrl, isLoadingImage]);

  const handleGenerateImage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLoadingImage(true);
    const url = await generateRecipeImage(`A professional food photo of ${recipe.name}, appetizing, restaurant quality`);
    if (url) setImageUrl(url);
    setIsLoadingImage(false);
  };

  const toggleStep = (idx: number) => {
    const next = new Set(completedSteps);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setCompletedSteps(next);
  };

  const totalRecipeCost = recipe.costPerServing * 4;

  return (
    <div id={`recipe-day-${day}`} className={`bg-white rounded-3xl border-4 transition-all duration-300 ${isExpanded ? 'border-primary shadow-xl scale-[1.01]' : 'border-stone-200 shadow-sm'}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-6 flex items-center justify-between text-left focus:outline-none focus:ring-4 focus:ring-primary/50 rounded-2xl"
        aria-expanded={isExpanded}
        aria-controls={`recipe-content-${day}`}
      >
        <div className="flex items-center gap-5">
          <div className={`w-14 h-14 font-bold text-xl flex items-center justify-center rounded-2xl border-2 transition-colors ${isExpanded ? 'bg-primary text-stone-900 border-primary-dark' : 'bg-stone-100 text-stone-600 border-stone-200'}`}>
            {day}
          </div>
          <div>
            <span className="text-sm font-semibold text-stone-500 mb-1 block">Day {day} • {recipe.category}</span>
            <h4 className="font-bold text-2xl text-stone-900 leading-tight">{recipe.name}</h4>
            <div className="flex gap-4 mt-2">
              <span className="text-sm font-medium text-stone-600 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm" aria-hidden="true">payments</span>
                ${recipe.costPerServing.toFixed(2)}/serving
              </span>
            </div>
          </div>
        </div>
        <span className={`material-symbols-outlined text-4xl transition-transform duration-500 ${isExpanded ? 'rotate-180 text-primary' : 'text-stone-300'}`} aria-hidden="true">
          expand_circle_down
        </span>
      </button>

      {isExpanded && (
        <div id={`recipe-content-${day}`} className="px-6 pb-8 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="h-px bg-stone-200 w-full mb-8" />
          
          {/* Recipe Image */}
          <div className="mb-8 relative group rounded-2xl overflow-hidden h-64 bg-stone-50 border border-stone-200">
            {imageUrl ? (
              <img src={imageUrl} alt={`Photo of ${recipe.name}`} className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-stone-400">
                {isLoadingImage ? (
                  <span className="material-symbols-outlined animate-spin text-4xl">progress_activity</span>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-4xl">image_not_supported</span>
                    <span className="text-sm font-medium">No Image Available</span>
                  </div>
                )}
              </div>
            )}
            
            {/* AI Generate Button (Overlay) */}
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100">
              <button 
                onClick={handleGenerateImage}
                disabled={isLoadingImage}
                className="bg-white/95 text-stone-900 px-4 py-2 rounded-full text-sm font-bold shadow-md hover:bg-primary transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Generate new AI photo for this recipe"
              >
                <span className="material-symbols-outlined text-base" aria-hidden="true">auto_awesome</span>
                {isLoadingImage ? 'Generating...' : 'Generate Photo'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Ingredients Column */}
            <div>
              <h5 className="font-bold text-xl text-stone-900 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary" aria-hidden="true">receipt_long</span>
                Ingredients
              </h5>
              <ul className="space-y-3" aria-label="Ingredients list">
                {recipe.ingredients.map((ing, i) => (
                  <li key={i} className="flex justify-between items-center p-3 rounded-xl bg-stone-50 border border-stone-100">
                    <div className="flex flex-col">
                      <span className="font-medium text-stone-800">{ing.name}</span>
                      <span className="text-sm text-stone-500">{ing.quantity}</span>
                    </div>
                    <span className="text-sm font-mono font-bold text-stone-400">
                      ${ing.price.toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Steps Column */}
            <div>
              <h5 className="font-bold text-xl text-stone-900 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary" aria-hidden="true">outdoor_grill</span>
                Instructions
              </h5>
              <div className="space-y-3">
                {recipe.instructions.map((step, i) => (
                  <button
                    key={i}
                    onClick={() => toggleStep(i)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all flex gap-4 focus:outline-none focus:ring-2 focus:ring-primary ${
                      completedSteps.has(i) 
                        ? 'bg-stone-50 border-stone-100 opacity-60' 
                        : 'bg-white border-stone-100 hover:border-stone-300'
                    }`}
                    aria-label={`Step ${i + 1}: ${step}. ${completedSteps.has(i) ? 'Completed' : 'Not completed'}`}
                  >
                    <div className={`w-8 h-8 shrink-0 flex items-center justify-center rounded-full font-bold text-sm transition-colors ${
                      completedSteps.has(i) ? 'bg-primary text-stone-900' : 'bg-stone-100 text-stone-500'
                    }`}>
                      {completedSteps.has(i) ? (
                        <span className="material-symbols-outlined text-sm font-bold">check</span>
                      ) : (
                        i + 1
                      )}
                    </div>
                    <p className={`text-base leading-relaxed ${completedSteps.has(i) ? 'line-through text-stone-400' : 'text-stone-700'}`}>
                      {step}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-12 p-6 bg-stone-100 rounded-2xl flex items-center justify-between border border-stone-200">
            <div>
              <p className="text-stone-500 text-sm font-medium mb-1">Finished cooking?</p>
              <h6 className="text-xl font-bold text-stone-900">Enjoy your meal!</h6>
            </div>
            <button 
              onClick={() => setIsExpanded(false)}
              className="px-6 py-3 bg-white text-stone-900 font-bold rounded-xl hover:bg-stone-50 transition-colors border border-stone-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
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
