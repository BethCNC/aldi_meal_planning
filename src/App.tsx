import React, { useState, useEffect } from 'react';
import { AppStage, MealPlan, UserPreferences } from './types';
import DaysSelector from './components/DaysSelector';
import PreferencesSelector from './components/PreferencesSelector';
import ConversationUI from './components/ConversationUI';
import GroceryList from './components/GroceryList';
import RecipeCard from './components/RecipeCard';
import Welcome from './components/Welcome';
import Auth from './components/Auth';
import OnboardingIntro from './components/OnboardingIntro';
import { useSupabase } from './SupabaseProvider';
import { Home, ArrowLeft, Settings, RefreshCcw, RotateCcw } from 'lucide-react'; // New import for Lucide icons

// This function will call our backend, not Gemini directly.
const generateMealPlan = async (days: number, budget: number | undefined, preferences: UserPreferences, userId: string | undefined): Promise<MealPlan> => {
  const response = await fetch('/api/v1/plan/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // This is where you would add an Authorization header if needed
      // 'Authorization': `Bearer ${your_auth_token}`
    },
    body: JSON.stringify({
      day_count: days,
      user_id: userId, // Pass userId
      budget: budget, // Pass budget
      sensory_preferences: { // Mapping preferences to the backend schema
        likes: preferences.likes,
        dislikes: preferences.dislikes,
        exclusions: preferences.exclusions
      }
    }),
  });

  if (!response.ok) {
    // In a real app, you'd handle this more gracefully
    console.error("API call failed with status:", response.status);
    // For now, returning a dummy empty plan on failure
    return { days: 0, meals: [], totalCost: 0 };
  }

  const data = await response.json();

  // The backend response needs to be mapped to the frontend MealPlan type.
  // This is a placeholder mapping and might need adjustment based on the actual API response shape.
  const mappedMeals = data.plan.map((p: any) => ({
    day: p.day,
    recipe: {
      id: p.recipe.id,
      name: p.recipe.title,
      costPerServing: p.recipe.cost_per_serving || 0, // Assuming this data comes from backend
      category: p.recipe.protein_category || 'Unknown',
      instructions: p.recipe.instructions || ['Instructions not available.'],
      ingredients: p.recipe.ingredients || [],
    }
  }));

  return {
    days: data.plan.length,
    meals: mappedMeals,
    totalCost: data.meta.total_cost_usd,
  };
};

const App: React.FC = () => {
  const { user } = useSupabase(); // Get user from Supabase context
  const [stage, setStage] = useState<AppStage>(AppStage.WELCOME); // Initial stage to WELCOME
  const [days, setDays] = useState<number>(7);
  const [budget, setBudget] = useState<number | undefined>(undefined); // New state for budget
  // Hard-coded default preferences for single-user mode
  const DEFAULT_PREFERENCES: UserPreferences = {
    likes: 'Chicken Breasts, Pork Chops, Steak, Sausage, Ground Beef, some seafood, simple',
    dislikes: 'spicy, chicken thighs (dark meat), tofu, casseroles',
    exclusions: ''
  };
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);

  const handleDaysSelected = async (selectedDays: number, selectedBudget: number | undefined) => {
    // When using hard-coded preferences, skip the Preferences step and generate immediately
    setDays(selectedDays);
    setBudget(selectedBudget);
    setStage(AppStage.GENERATING);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const userId = user?.id || (import.meta.env.VITE_SINGLE_USER_ID as string) || undefined;
    const plan = await generateMealPlan(selectedDays, selectedBudget, preferences, userId);
    setMealPlan(plan);
    setStage(AppStage.RESULT);
  };

  const handlePreferencesCompleted = async (selectedPrefs: UserPreferences) => {
    setPreferences(selectedPrefs);
    setStage(AppStage.GENERATING);
    
    const plan = await generateMealPlan(days, budget, selectedPrefs, user?.id); // Pass budget and userId
    setMealPlan(plan);
    setStage(AppStage.RESULT);
  };

  const handleRestart = () => {
    setStage(AppStage.WELCOME); // Restart to Welcome screen
    setMealPlan(null);
    setBudget(undefined); // Clear budget on restart
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col pb-32">
      {/* Dynamic Header - Solid background, no blurs */}
      <header className="sticky top-0 z-[60] bg-stone-100 border-b-2 border-stone-200 no-print">
        <div className="max-w-2xl mx-auto px-6 py-5 flex items-center justify-between">
          <button 
            onClick={handleRestart}
            className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border-2 border-stone-300 text-stone-900 shadow-sm active:scale-90 transition-all"
            aria-label="Home"
          >
            {stage === AppStage.WELCOME ? <Home className="w-6 h-6" /> : <ArrowLeft className="w-6 h-6" />}
          </button>
          
          <div className="text-center">
            <h1 className="text-xl font-black tracking-tight text-stone-900 uppercase">
              {stage === AppStage.RESULT ? 'Your Week Sorted' : 'Aldi Planner'}
            </h1>
            {stage === AppStage.RESULT && (
              <p className="text-[10px] font-black text-primary-dark uppercase tracking-[0.3em]">Ready to shop</p>
            )}
            {(stage === AppStage.PREFERENCES || stage === AppStage.GENERATING) && (
              <p className="text-[10px] font-black text-primary-dark uppercase tracking-[0.3em]">Step 2 of 2</p>
            )}
            {stage === AppStage.AUTH && (
              <p className="text-[10px] font-black text-primary-dark uppercase tracking-[0.3em]">Sign in or Register</p>
            )}
             {stage === AppStage.ONBOARDING_INTRO && (
              <p className="text-[10px] font-black text-primary-dark uppercase tracking-[0.3em]">How it works</p>
            )}
          </div>

          <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border-2 border-stone-300 text-stone-900 shadow-sm opacity-0 pointer-events-none">
            <Settings className="w-6 h-6" />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-4xl mx-auto print:max-w-none">
        {stage === AppStage.WELCOME && <Welcome setStage={setStage} />}
        {stage === AppStage.AUTH && <Auth setStage={setStage} />}
        {stage === AppStage.ONBOARDING_INTRO && <OnboardingIntro setStage={setStage} />}

        {stage === AppStage.INPUT && (
          <div /* className="animate-in fade-in zoom-in-95 duration-500" */>
            <DaysSelector onSelect={handleDaysSelected} />
          </div>
        )}

        {stage === AppStage.PREFERENCES && (
          <PreferencesSelector onComplete={handlePreferencesCompleted} />
        )}

        {stage === AppStage.GENERATING && (
          <ConversationUI days={days} />
        )}

        {stage === AppStage.RESULT && mealPlan && (
          <div className="space-y-16 /* animate-in fade-in slide-in-from-bottom-8 duration-700 */ pb-20">
            
            {/* Section 1: Shopping */}
            <div id="shopping-section">
              <div className="px-6 pt-10 text-center max-w-lg mx-auto mb-4">
                <span className="inline-block px-4 py-1.5 bg-stone-900 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full mb-4">Phase One</span>
                <h2 className="text-4xl font-black text-stone-900 tracking-tighter">Your Grocery List</h2>
                <p className="text-stone-500 font-medium mt-2">Everything you need from Aldi in one go.</p>
              </div>
              <GroceryList mealPlan={mealPlan} />
            </div>

            {/* Visual Break */}
            <div className="flex justify-center no-print">
              <div className="w-1 h-12 bg-stone-200 rounded-full" />
            </div>

            {/* Section 2: Cooking */}
            <div id="recipes-section" className="px-4">
              <div className="text-center max-w-lg mx-auto mb-10">
                <span className="inline-block px-4 py-1.5 bg-primary text-stone-900 text-[10px] font-black uppercase tracking-[0.2em] rounded-full mb-4">Phase Two</span>
                <h2 className="text-4xl font-black text-stone-900 tracking-tighter">Meal Instructions</h2>
                <p className="text-stone-500 font-medium mt-2">Simple steps for a stress-free week.</p>
              </div>
              
              <div className="space-y-6 max-w-2xl mx-auto">
                {mealPlan.meals.map((meal) => (
                  <RecipeCard key={meal.day} recipe={meal.recipe} day={meal.day} />
                ))}
              </div>

              <div className="max-w-2xl mx-auto mt-12 no-print">
                <button 
                  onClick={() => handlePreferencesCompleted(preferences)}
                  className="w-full py-6 bg-white border-4 border-dashed border-stone-200 text-stone-400 font-black rounded-[2rem] flex flex-col items-center justify-center gap-2 hover:bg-stone-100 hover:border-stone-300 transition-all active:scale-[0.98]"
                >
                  <RefreshCcw className="w-8 h-8" />
                  <span className="uppercase tracking-widest text-xs">Don't like this plan? Generate a new one</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Action Navigation */}
      {stage === AppStage.RESULT && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex gap-4 no-print z-50">
          <button 
            onClick={handleRestart}
            className="px-8 py-5 bg-stone-900 text-white font-black rounded-3xl shadow-xl flex items-center gap-3 hover:scale-105 active:scale-95 transition-all border-2 border-stone-700"
          >
            <RotateCcw className="w-6 h-6" />
            NEW START
          </button>
        </div>
      )}
    </div>
  );
};

export default App;