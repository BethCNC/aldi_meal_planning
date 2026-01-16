
import React, { useState } from 'react';
import { UserPreferences } from '../types';

interface PreferencesSelectorProps {
  onComplete: (prefs: UserPreferences) => void;
}

const LIKE_OPTIONS = [
  "Pasta", "Chicken", "Beef", "Pork", "Rice Dishes", "Potatoes", 
  "Quick Meals (<20m)", "One-Pot", "Sheet Pan", "Mexican", "Italian", 
  "Asian Inspired", "Comfort Food", "Spicy", "Kid Friendly"
];

const DISLIKE_OPTIONS = [
  "Mushrooms", "Onions", "Seafood", "Fish", "Tofu", "Very Spicy", 
  "Soggy Veggies", "Olives", "Pickles", "Strong Herbs"
];

const EXCLUSION_OPTIONS = [
  "Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Nut-Free", 
  "No Pork", "Low Carb", "Egg-Free"
];

const PreferencesSelector: React.FC<PreferencesSelectorProps> = ({ onComplete }) => {
  const [selectedLikes, setSelectedLikes] = useState<Set<string>>(new Set());
  const [selectedDislikes, setSelectedDislikes] = useState<Set<string>>(new Set());
  const [selectedExclusions, setSelectedExclusions] = useState<Set<string>>(new Set());
  const [budget, setBudget] = useState<string>('');

  const toggleOption = (option: string, set: Set<string>, setter: React.Dispatch<React.SetStateAction<Set<string>>>) => {
    const next = new Set(set);
    if (next.has(option)) next.delete(option);
    else next.add(option);
    setter(next);
  };

  const handleFinish = () => {
    onComplete({
      likes: Array.from(selectedLikes).join(", "),
      dislikes: Array.from(selectedDislikes).join(", "),
      exclusions: Array.from(selectedExclusions).join(", "),
      budget: budget ? parseFloat(budget) : undefined
    });
  };

  const OptionGroup = ({ 
    title, 
    options, 
    selected, 
    onToggle, 
    icon, 
    activeClass 
  }: { 
    title: string, 
    options: string[], 
    selected: Set<string>, 
    onToggle: (opt: string) => void,
    icon: string,
    activeClass: string
  }) => (
    <div className="space-y-4">
      <div className="flex items-center gap-3 px-1">
        <span className="material-symbols-outlined text-stone-700" aria-hidden="true">{icon}</span>
        <h3 className="text-lg font-bold text-stone-900">{title}</h3>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label={title}>
        {options.map(opt => {
          const isActive = selected.has(opt);
          return (
            <button
              key={opt}
              onClick={() => onToggle(opt)}
              aria-pressed={isActive}
              className={`px-4 py-3 rounded-xl border-2 font-medium text-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-stone-400 ${
                isActive 
                  ? `${activeClass} border-transparent shadow-sm` 
                  : 'bg-white border-stone-200 text-stone-600 hover:border-stone-400 hover:bg-stone-50'
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center min-h-[70vh] p-6 gap-8 animate-in fade-in slide-in-from-right-8 duration-500 max-w-2xl mx-auto">
      <div className="space-y-2 text-center max-w-lg">
        <h2 className="text-3xl font-bold tracking-tight text-stone-900">Your Preferences</h2>
        <p className="text-lg text-stone-600">
          Tap what fits. I'll pick recipes based on these.
        </p>
      </div>

      <div className="w-full space-y-10">
        <OptionGroup 
          title="What do you love?" 
          options={LIKE_OPTIONS} 
          selected={selectedLikes} 
          onToggle={(opt) => toggleOption(opt, selectedLikes, setSelectedLikes)}
          icon="favorite"
          activeClass="bg-primary text-stone-900 ring-primary"
        />

        <OptionGroup 
          title="What should I avoid?" 
          options={DISLIKE_OPTIONS} 
          selected={selectedDislikes} 
          onToggle={(opt) => toggleOption(opt, selectedDislikes, setSelectedDislikes)}
          icon="thumb_down"
          activeClass="bg-stone-200 text-stone-900 ring-stone-400"
        />

        <OptionGroup 
          title="Allergies / Exclusions" 
          options={EXCLUSION_OPTIONS} 
          selected={selectedExclusions} 
          onToggle={(opt) => toggleOption(opt, selectedExclusions, setSelectedExclusions)}
          icon="warning"
          activeClass="bg-red-100 text-red-900 border-red-200 ring-red-400"
        />

        {/* Budget Input */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 px-1">
            <span className="material-symbols-outlined text-stone-700" aria-hidden="true">savings</span>
            <h3 className="text-lg font-bold text-stone-900">Budget (Optional)</h3>
          </div>
          <div className="bg-white border-2 border-stone-200 rounded-xl p-4">
            <label htmlFor="budget-input" className="block text-sm font-medium text-stone-600 mb-2">
              Weekly Budget ($)
            </label>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-stone-400">$</span>
              <input
                id="budget-input"
                type="number"
                min="0"
                step="0.01"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="e.g., 75.00"
                className="flex-1 text-2xl font-bold text-stone-900 bg-transparent border-none outline-none focus:ring-0"
              />
            </div>
            <p className="text-xs text-stone-500 mt-2">
              Leave empty for no budget limit, or set a maximum weekly spending amount.
            </p>
          </div>
        </div>

        <div className="pt-8 sticky bottom-0 bg-gradient-to-t from-stone-50 via-stone-50 to-transparent py-6">
          <button
            onClick={handleFinish}
            className="w-full py-5 bg-stone-900 text-white font-bold text-xl rounded-2xl shadow-xl transition-all hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-3 hover:bg-stone-800 focus:ring-4 focus:ring-stone-500 focus:outline-none"
          >
            Generate My Plan
            <span className="material-symbols-outlined text-2xl" aria-hidden="true">auto_awesome</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PreferencesSelector;
