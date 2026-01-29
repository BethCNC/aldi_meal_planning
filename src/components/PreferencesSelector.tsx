import React, { useState, useEffect } from 'react';
import { UserPreferences } from '../types';
import { Heart, ThumbsDown, AlertTriangle, Sparkles } from 'lucide-react'; // New import
import { useSupabase } from '../SupabaseProvider';

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
  // Load preferences from localStorage on mount
  const [selectedLikes, setSelectedLikes] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('userPreferencesLikes');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [selectedDislikes, setSelectedDislikes] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('userPreferencesDislikes');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [selectedExclusions, setSelectedExclusions] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('userPreferencesExclusions');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  // Save preferences to localStorage whenever they change
  React.useEffect(() => {
    localStorage.setItem('userPreferencesLikes', JSON.stringify(Array.from(selectedLikes)));
  }, [selectedLikes]);

  React.useEffect(() => {
    localStorage.setItem('userPreferencesDislikes', JSON.stringify(Array.from(selectedDislikes)));
  }, [selectedDislikes]);

  React.useEffect(() => {
    localStorage.setItem('userPreferencesExclusions', JSON.stringify(Array.from(selectedExclusions)));
  }, [selectedExclusions]);

  const { user } = useSupabase();

  // Try to load server-side preferences for the current user (if available)
  useEffect(() => {
    const userId = user?.id || (import.meta.env.VITE_SINGLE_USER_ID as string) || null;
    if (!userId) return;

    (async () => {
      try {
        const res = await fetch(`/api/v1/preferences?user_id=${encodeURIComponent(userId)}`);
        if (!res.ok) return;
        const json = await res.json();
        const prefs = json.preferences;
        if (!prefs) return;

        if (Array.isArray(prefs.liked_ingredients)) setSelectedLikes(new Set(prefs.liked_ingredients));
        if (Array.isArray(prefs.disliked_ingredients)) setSelectedDislikes(new Set(prefs.disliked_ingredients));
        if (Array.isArray(prefs.dietary_tags)) setSelectedExclusions(new Set(prefs.dietary_tags));
      } catch (e) {
        // ignore network errors; keep local values
      }
    })();
  }, [user]);

  const toggleOption = (option: string, set: Set<string>, setter: React.Dispatch<React.SetStateAction<Set<string>>>) => {
    const next = new Set(set);
    if (next.has(option)) next.delete(option);
    else next.add(option);
    setter(next);
  };

  const handleFinish = () => {
    const likesArr = Array.from(selectedLikes);
    const dislikesArr = Array.from(selectedDislikes);
    const exclusionsArr = Array.from(selectedExclusions);

    // Save to server (best-effort). Use user id from context or VITE_SINGLE_USER_ID fallback
    const userId = (user && user.id) || (import.meta.env.VITE_SINGLE_USER_ID as string) || 'default';
    fetch('/api/v1/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, likes: likesArr, dislikes: dislikesArr, exclusions: exclusionsArr })
    }).catch(() => {
      // ignore errors; preferences are still saved to localStorage
    });

    onComplete({
      likes: likesArr.join(', '),
      dislikes: dislikesArr.join(', '),
      exclusions: exclusionsArr.join(', ')
    });
  };

  const OptionGroup = ({ 
    title, 
    options, 
    selected, 
    onToggle, 
    Icon, // Changed from icon: string to Icon: React.ElementType
    activeClass 
  }: { 
    title: string, 
    options: string[], 
    selected: Set<string>, 
    onToggle: (opt: string) => void,
    Icon: React.ElementType, // Changed type
    activeClass: string
  }) => (
    <div className="space-y-4">
      <div className="flex items-center gap-3 px-2">
        <Icon className="text-stone-900 w-6 h-6" /> {/* Render Icon component */}
        <h3 className="text-sm font-black text-stone-900 uppercase tracking-widest">{title}</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => {
          const isActive = selected.has(opt);
          return (
            <button
              key={opt}
              onClick={() => onToggle(opt)}
              className={`px-4 py-3 rounded-2xl border-4 font-bold text-sm transition-all active:scale-95 ${
                isActive 
                  ? `${activeClass} border-stone-900` 
                  : 'bg-white border-stone-200 text-stone-500 hover:border-stone-400'
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
    <div className="flex flex-col items-center min-h-[70vh] p-6 gap-10 /* animate-in fade-in slide-in-from-right-8 duration-500 */ max-w-2xl mx-auto">
      <div className="space-y-4 text-center">
        <h2 className="text-4xl font-black tracking-tighter text-stone-900 uppercase">Your Profile</h2>
        <p className="text-lg text-stone-600 font-medium">
          Tap what fits. No typing needed. I'll pick recipes based on these.
        </p>
      </div>

      <div className="w-full space-y-12">
        <OptionGroup 
          title="What do you love?" 
          options={LIKE_OPTIONS} 
          selected={selectedLikes} 
          onToggle={(opt) => toggleOption(opt, selectedLikes, setSelectedLikes)}
          Icon={Heart} // Pass Heart component
          activeClass="bg-primary text-stone-900"
        />

        <OptionGroup 
          title="What should I avoid?" 
          options={DISLIKE_OPTIONS} 
          selected={selectedDislikes} 
          onToggle={(opt) => toggleOption(opt, selectedDislikes, setSelectedDislikes)}
          Icon={ThumbsDown} // Pass ThumbsDown component
          activeClass="bg-stone-300 text-stone-900"
        />

        <OptionGroup 
          title="Allergies / Exclusions" 
          options={EXCLUSION_OPTIONS} 
          selected={selectedExclusions} 
          onToggle={(opt) => toggleOption(opt, selectedExclusions, setSelectedExclusions)}
          Icon={AlertTriangle} // Pass AlertTriangle component
          activeClass="bg-red-500 text-white"
        />

        <div className="pt-8 sticky bottom-0 bg-stone-50 py-6">
          <button
            onClick={handleFinish}
            className="w-full py-6 bg-stone-900 hover:bg-stone-800 text-white font-black text-2xl rounded-[2rem] shadow-2xl border-4 border-stone-800 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
          >
            GENERATE MY PLAN
            <Sparkles className="w-7 h-7" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PreferencesSelector;
