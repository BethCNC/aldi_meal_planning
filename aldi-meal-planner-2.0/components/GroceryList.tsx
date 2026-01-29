
import React, { useState } from 'react';
import { Ingredient, MealPlan } from '../types';

interface GroceryListProps {
  mealPlan: MealPlan;
  budget?: number;
}

const GroceryList: React.FC<GroceryListProps> = ({ mealPlan, budget }) => {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const allIngredients: Ingredient[] = mealPlan.meals.flatMap(m => m.recipe.ingredients);
  const categories = Array.from(new Set(allIngredients.map(i => i.category)));

  const toggleItem = (id: string) => {
    const next = new Set(checkedItems);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCheckedItems(next);
  };

  const scrollToRecipes = () => {
    document.getElementById('recipes-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const completedCount = checkedItems.size;
  const totalCount = allIngredients.length;
  const progress = (completedCount / totalCount) * 100;

  return (
    <div className="flex flex-col gap-8 p-4 max-w-2xl mx-auto pb-10">
      {/* Summary Section - High contrast, clear information */}
      <div className="bg-stone-800 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden border border-stone-700">
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-8">
            <div>
              <p className="text-stone-300 text-sm font-medium mb-2">Estimated Budget</p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold tracking-tight">${mealPlan.totalCost.toFixed(2)}</span>
                <span className="text-primary font-medium">at Aldi</span>
              </div>
              {budget && (
                <div className="mt-3 flex items-center gap-2">
                  <span className={`text-sm font-bold ${mealPlan.totalCost <= budget ? 'text-green-400' : 'text-red-400'}`}>
                    {mealPlan.totalCost <= budget ? '✓' : '✗'} 
                    {mealPlan.totalCost <= budget ? ' Within Budget' : ' Over Budget'}
                  </span>
                  <span className="text-stone-400 text-sm">
                    (${budget.toFixed(2)} limit)
                  </span>
                  {mealPlan.totalCost <= budget && (
                    <span className="text-green-400 text-sm font-medium">
                      ${(budget - mealPlan.totalCost).toFixed(2)} remaining
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="p-3 bg-stone-700 rounded-2xl border border-stone-600">
              <span className="material-symbols-outlined text-primary text-3xl" aria-hidden="true">savings</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <span className="text-sm font-medium text-stone-300" id="progress-label">Shopping Progress</span>
              <span className="text-xl font-bold text-primary">{Math.round(progress)}%</span>
            </div>
            <div className="h-3 w-full bg-stone-700 rounded-full overflow-hidden border border-stone-600" aria-labelledby="progress-label" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
              <div 
                className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-stone-400 font-medium">{completedCount} of {totalCount} items checked</p>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex gap-4 no-print">
        <button 
          onClick={() => window.print()}
          className="flex-1 py-4 bg-white border-2 border-stone-200 text-stone-800 font-bold rounded-xl flex items-center justify-center gap-2 hover:border-stone-400 focus:ring-4 focus:ring-stone-200 focus:outline-none transition-all"
        >
          <span className="material-symbols-outlined" aria-hidden="true">print</span>
          Print List
        </button>
        <button 
          onClick={scrollToRecipes}
          className="flex-1 py-4 bg-primary text-stone-900 font-bold rounded-xl flex items-center justify-center gap-2 shadow-md hover:bg-primary-dark focus:ring-4 focus:ring-primary/50 focus:outline-none transition-all"
        >
          <span className="material-symbols-outlined" aria-hidden="true">restaurant</span>
          View Recipes
        </button>
      </div>

      {/* Categorized List */}
      <div className="space-y-10 mt-2">
        {categories.map(cat => {
          const items = allIngredients.filter(i => i.category === cat);
          return (
            <section key={cat} className="animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center gap-3 mb-4 px-2 sticky top-20 bg-stone-50/95 backdrop-blur-sm z-10 py-3 border-b border-stone-200/50">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-stone-200 shadow-sm">
                  <span className="material-symbols-outlined text-stone-500 text-xl" aria-hidden="true">
                    {cat === 'Produce' ? 'nutrition' : cat === 'Meat' ? 'egg_alt' : 'grocery'}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-stone-800">{cat}</h3>
              </div>
              
              <div className="grid grid-cols-1 gap-3" role="list">
                {items.map((item, idx) => {
                  const itemId = `${cat}-${item.name}-${idx}`;
                  const isChecked = checkedItems.has(itemId);
                  return (
                    <label 
                      key={itemId}
                      className={`flex items-center p-4 rounded-2xl border transition-all cursor-pointer select-none group focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 ${
                        isChecked ? 'bg-stone-100 border-stone-200 opacity-75' : 'bg-white border-stone-200 hover:border-stone-300 shadow-sm'
                      }`}
                    >
                      <input 
                        type="checkbox" 
                        className="sr-only" 
                        onChange={() => toggleItem(itemId)}
                        checked={isChecked}
                      />
                      <div className={`w-6 h-6 rounded-lg border-2 mr-4 flex items-center justify-center transition-colors ${
                        isChecked ? 'bg-primary border-primary' : 'bg-white border-stone-300 group-hover:border-stone-400'
                      }`}>
                        {isChecked && <span className="material-symbols-outlined text-stone-900 text-base font-bold">check</span>}
                      </div>
                      
                      <div className="flex-1">
                        <p className={`text-base font-medium transition-colors ${isChecked ? 'line-through text-stone-400' : 'text-stone-900'}`}>
                          {item.name}
                        </p>
                        <p className="text-sm text-stone-500 mt-0.5">{item.quantity}</p>
                      </div>
                      
                      <div className="text-right ml-4">
                        <p className={`font-mono text-base font-bold ${isChecked ? 'text-stone-300' : 'text-stone-600'}`}>
                          ${item.price.toFixed(2)}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default GroceryList;
