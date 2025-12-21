import React, { useState } from 'react';
import { Ingredient, MealPlan } from '../types';
import { PiggyBank, Printer, CookingPot, Apple, Beef, ShoppingBag, Check } from 'lucide-react'; // New import

interface GroceryListProps {
  mealPlan: MealPlan;
}

const GroceryList: React.FC<GroceryListProps> = ({ mealPlan }) => {
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
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="flex flex-col gap-10 p-4 max-w-2xl mx-auto pb-10">
      {/* Summary Section - Solid Background, no gradients or glows */}
      <div className="bg-stone-900 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden group border-4 border-stone-800">
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-10">
            <div>
              <p className="text-stone-400 text-sm font-bold uppercase tracking-[0.2em] mb-3">Estimated Budget</p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black tracking-tighter">${mealPlan.totalCost.toFixed(2)}</span>
                <span className="text-primary font-bold">at Aldi</span>
              </div>
            </div>
            <div className="p-4 bg-stone-800 rounded-3xl border-2 border-stone-700">
              <PiggyBank className="text-primary w-8 h-8" />
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <span className="text-sm font-bold text-stone-300 uppercase tracking-widest">Shopping Progress</span>
              <span className="text-2xl font-black text-primary">{Math.round(progress)}%</span>
            </div>
            <div className="h-4 w-full bg-stone-800 rounded-full overflow-hidden border-2 border-stone-700 p-0.5">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-stone-500 font-bold">{completedCount} of {totalCount} items gathered</p>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex gap-3 no-print">
        <button 
          onClick={() => window.print()}
          className="flex-1 py-5 bg-white border-4 border-stone-200 text-stone-900 font-black rounded-2xl flex items-center justify-center gap-3 hover:border-stone-900 transition-all active:scale-[0.97]"
        >
          <Printer className="w-6 h-6" />
          PRINT LIST
        </button>
        <button 
          onClick={scrollToRecipes}
          className="flex-1 py-5 bg-primary text-stone-900 font-black rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-primary/10 border-4 border-primary-dark hover:bg-primary-dark transition-all active:scale-[0.97]"
        >
          <CookingPot className="w-6 h-6" />
          VIEW RECIPES
        </button>
      </div>

      {/* Categorized List */}
      <div className="space-y-12 mt-4">
        {categories.map(cat => {
          const items = allIngredients.filter(i => i.category === cat);
          if (items.length === 0) return null;
          return (
            <section key={cat} className="/* animate-in fade-in slide-in-from-bottom-4 */">
              <div className="flex items-center gap-3 mb-6 px-2 sticky top-24 bg-stone-50 z-10 py-2">
                <div className="w-10 h-10 bg-stone-200 rounded-xl flex items-center justify-center border-2 border-stone-300">
                  {cat === 'Produce' ? (
                    <Apple className="text-stone-600 w-6 h-6" />
                  ) : cat === 'Meat' ? (
                    <Beef className="text-stone-600 w-6 h-6" />
                  ) : (
                    <ShoppingBag className="text-stone-600 w-6 h-6" />
                  )}
                </div>
                <h3 className="text-2xl font-black text-stone-900 tracking-tight">{cat}</h3>
                <div className="h-1 bg-stone-200 flex-1 ml-2 rounded-full" />
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                {items.map((item, idx) => {
                  const itemId = `${cat}-${item.name}-${idx}`;
                  const isChecked = checkedItems.has(itemId);
                  return (
                    <label 
                      key={itemId}
                      className={`flex items-center p-5 rounded-3xl border-2 transition-all cursor-pointer group select-none ${
                        isChecked ? 'bg-stone-100 border-stone-200 opacity-60' : 'bg-white border-stone-200 hover:border-stone-400 shadow-sm'
                      }`}
                    >
                      <input 
                        type="checkbox" 
                        className="hidden" 
                        onChange={() => toggleItem(itemId)}
                        checked={isChecked}
                      />
                      <div className={`w-8 h-8 rounded-xl border-4 mr-5 flex items-center justify-center transition-all ${
                        isChecked ? 'bg-primary border-primary scale-105' : 'bg-white border-stone-300 group-hover:border-primary'
                      }`}>
                        {isChecked && <Check className="text-stone-900 w-5 h-5" />}
                      </div>
                      
                      <div className="flex-1">
                        <p className={`text-lg font-bold leading-tight transition-all ${isChecked ? 'line-through text-stone-400' : 'text-stone-900'}`}>
                          {item.name}
                        </p>
                        <p className="text-xs font-bold text-stone-500 uppercase tracking-widest mt-0.5">{item.quantity}</p>
                      </div>
                      
                      <div className="text-right ml-4">
                        <p className={`font-mono text-lg font-black ${isChecked ? 'text-stone-300' : 'text-stone-900'}`}>
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
