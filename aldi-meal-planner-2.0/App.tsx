import React, { useState, useEffect } from 'react';
import { AppStage, MealPlan, UserPreferences } from './types';
import DaysSelector from './components/DaysSelector';
import PreferencesSelector from './components/PreferencesSelector';
import ConversationUI from './components/ConversationUI';
import GroceryList from './components/GroceryList';
import RecipeCard from './components/RecipeCard';
import { generateMealPlan } from './services/geminiService';

const App: React.FC = () => {
  const [stage, setStage] = useState<AppStage>(AppStage.INPUT);
  const [days, setDays] = useState<number>(7);
  const [preferences, setPreferences] = useState<UserPreferences>({
    likes: '',
    dislikes: '',
    exclusions: ''
  });
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);

  const handleDaysSelected = (selectedDays: number) => {
    setDays(selectedDays);
    setStage(AppStage.PREFERENCES);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePreferencesCompleted = async (selectedPrefs: UserPreferences) => {
    setPreferences(selectedPrefs);
    setStage(AppStage.GENERATING);
    
    try {
      const plan = await generateMealPlan(days, selectedPrefs);
      if (!plan || !plan.meals || plan.meals.length === 0) {
        throw new Error('Failed to generate meal plan');
      }
      setMealPlan(plan);
      setStage(AppStage.RESULT);
    } catch (error) {
      console.error('Error generating meal plan:', error);
      // Still set a fallback plan so user sees something
      const fallbackPlan = {
        days,
        meals: Array.from({ length: days }, (_, i) => ({
          day: i + 1,
          recipe: {
            id: `fallback-${i}`,
            name: `Meal ${i + 1}`,
            costPerServing: 0,
            category: 'Other',
            ingredients: [],
            instructions: ['Please check your GEMINI_API_KEY in .env file']
          }
        })),
        totalCost: 0
      };
      setMealPlan(fallbackPlan);
      setStage(AppStage.RESULT);
    }
  };

  const handleRestart = () => {
    setStage(AppStage.INPUT);
    setMealPlan(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col pb-32 font-sans text-stone-900">
      {/* Dynamic Header - Clean and simple */}
      <header className="sticky top-0 z-[60] bg-white/95 backdrop-blur border-b border-stone-200 no-print transition-all">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <button 
            onClick={handleRestart}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-stone-100 text-stone-600 transition-colors focus:outline-none focus:ring-2 focus:ring-stone-400"
            aria-label={stage === AppStage.INPUT ? "Current Step: Select Days" : "Go Back / Restart"}
          >
            <span className="material-symbols-outlined">
              {stage === AppStage.INPUT ? 'house' : 'arrow_back'}
            </span>
          </button>
          
          <div className="text-center">
            <h1 className="text-lg font-bold tracking-tight text-stone-900">
              {stage === AppStage.RESULT ? 'Your Meal Plan' : 'Aldi Planner'}
            </h1>
          </div>

          <div className="w-10 h-10" aria-hidden="true" /> {/* Spacer */}
        </div>
        
        {/* Progress Bar (Optional context) */}
        {stage !== AppStage.INPUT && stage !== AppStage.RESULT && (
          <div className="h-1 w-full bg-stone-100">
             <div 
               className="h-full bg-primary transition-all duration-500"
               style={{ width: stage === AppStage.PREFERENCES ? '50%' : '75%' }} 
             />
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-3xl mx-auto print:max-w-none p-4 md:p-6">
        {stage === AppStage.INPUT && (
          <DaysSelector onSelect={handleDaysSelected} />
        )}

        {stage === AppStage.PREFERENCES && (
          <PreferencesSelector onComplete={handlePreferencesCompleted} />
        )}

        {stage === AppStage.GENERATING && (
          <ConversationUI days={days} />
        )}

        {stage === AppStage.RESULT && mealPlan && (
          <div className="space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
            
            {/* Section 1: Shopping */}
            <div id="shopping-section" className="scroll-mt-24">
              <div className="px-4 pt-6 text-center max-w-lg mx-auto mb-6">
                <span className="inline-block px-3 py-1 bg-stone-100 text-stone-600 text-xs font-bold rounded-full mb-3">Step 1</span>
                <h2 className="text-3xl font-bold text-stone-900">Grocery List</h2>
                <p className="text-stone-600 mt-2">Everything you need for the week.</p>
              </div>
              <GroceryList mealPlan={mealPlan} budget={preferences.budget} />
            </div>

            {/* Visual Break */}
            <div className="flex justify-center no-print opacity-50">
              <span className="material-symbols-outlined text-stone-300 text-3xl">more_vert</span>
            </div>

            {/* Section 2: Cooking */}
            <div id="recipes-section" className="px-2 scroll-mt-24">
              <div className="text-center max-w-lg mx-auto mb-8">
                <span className="inline-block px-3 py-1 bg-primary/20 text-stone-900 text-xs font-bold rounded-full mb-3">Step 2</span>
                <h2 className="text-3xl font-bold text-stone-900">Daily Meals</h2>
                <p className="text-stone-600 mt-2">Your cooking instructions.</p>
              </div>
              
              <div className="space-y-4 max-w-2xl mx-auto">
                {mealPlan.meals.map((meal) => (
                  <RecipeCard key={meal.day} recipe={meal.recipe} day={meal.day} />
                ))}
              </div>

              <div className="max-w-xl mx-auto mt-16 no-print text-center">
                 <button 
                  onClick={() => handlePreferencesCompleted(preferences)}
                  className="px-6 py-4 text-stone-500 font-medium hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-colors flex items-center justify-center gap-2 mx-auto focus:outline-none focus:ring-2 focus:ring-stone-300"
                >
                  <span className="material-symbols-outlined">refresh</span>
                  Generate New Plan
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Action Navigation */}
      {stage === AppStage.RESULT && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex gap-4 no-print z-50 w-full max-w-xs px-4">
          <button 
            onClick={handleRestart}
            className="w-full py-4 bg-stone-900 text-white font-bold rounded-2xl shadow-xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all focus:ring-4 focus:ring-stone-500 focus:outline-none"
          >
            <span className="material-symbols-outlined">restart_alt</span>
            Start Over
          </button>
        </div>
      )}
    </div>
  );
};

export default App;