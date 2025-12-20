import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { IconCheck, IconX, IconPlus } from '@tabler/icons-react';

const COMMON_DIETS = [
  'Vegetarian', 'Vegan', 'Keto', 'Paleo', 
  'Gluten-Free', 'Dairy-Free', 'Low Carb', 'High Protein'
];

export function PreferencesView() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [dietaryTags, setDietaryTags] = useState([]);
  const [likedIngredients, setLikedIngredients] = useState([]);
  const [dislikedIngredients, setDislikedIngredients] = useState([]);
  
  const [likeInput, setLikeInput] = useState('');
  const [dislikeInput, setDislikeInput] = useState('');

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setDietaryTags(data.dietary_tags || []);
        setLikedIngredients(data.liked_ingredients || []);
        setDislikedIngredients(data.disliked_ingredients || []);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_preferences')
        .update({
          dietary_tags: dietaryTags,
          liked_ingredients: likedIngredients,
          disliked_ingredients: dislikedIngredients,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;
      alert('Preferences saved!');
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const toggleTag = (tag) => {
    setDietaryTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const addItem = (list, setList, input, setInput) => {
    if (!input.trim()) return;
    if (!list.includes(input.trim().toLowerCase())) {
      setList([...list, input.trim().toLowerCase()]);
    }
    setInput('');
  };

  const removeItem = (list, setList, item) => {
    setList(list.filter(i => i !== item));
  };

  if (loading) return <LoadingSpinner message="Loading preferences..." />;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8 pb-24">
      <header>
        <h1 className="text-2xl font-bold text-text-body">Dietary Preferences</h1>
        <p className="text-icon-subtle">Customize your meal plan recommendations.</p>
      </header>

      {/* Dietary Tags */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-text-body">Dietary Restrictions & Goals</h2>
        <div className="flex flex-wrap gap-2">
          {COMMON_DIETS.map(tag => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                dietaryTags.includes(tag)
                  ? 'bg-primary text-white border-primary'
                  : 'bg-surface-card text-text-body border-border-subtle hover:border-primary'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </section>

      {/* Dislikes */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-text-body">Ingredients to Avoid</h2>
        <p className="text-sm text-icon-subtle">We'll filter out recipes containing these items.</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={dislikeInput}
            onChange={(e) => setDislikeInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addItem(dislikedIngredients, setDislikedIngredients, dislikeInput, setDislikeInput)}
            placeholder="e.g., mushrooms, cilantro"
            className="flex-1 px-4 py-2 rounded-lg border border-border-subtle focus:ring-2 focus:ring-primary focus:outline-none"
          />
          <Button onClick={() => addItem(dislikedIngredients, setDislikedIngredients, dislikeInput, setDislikeInput)} variant="secondary">
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {dislikedIngredients.map(item => (
            <span key={item} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-error/10 text-error text-sm border border-error/20">
              {item}
              <button onClick={() => removeItem(dislikedIngredients, setDislikedIngredients, item)}>
                <IconX size={14} />
              </button>
            </span>
          ))}
        </div>
      </section>

      {/* Likes */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-text-body">Favorite Ingredients</h2>
        <p className="text-sm text-icon-subtle">We'll prioritize recipes with these items.</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={likeInput}
            onChange={(e) => setLikeInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addItem(likedIngredients, setLikedIngredients, likeInput, setLikeInput)}
            placeholder="e.g., avocado, salmon"
            className="flex-1 px-4 py-2 rounded-lg border border-border-subtle focus:ring-2 focus:ring-primary focus:outline-none"
          />
          <Button onClick={() => addItem(likedIngredients, setLikedIngredients, likeInput, setLikeInput)} variant="secondary">
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {likedIngredients.map(item => (
            <span key={item} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-success/10 text-success text-sm border border-success/20">
              {item}
              <button onClick={() => removeItem(likedIngredients, setLikedIngredients, item)}>
                <IconX size={14} />
              </button>
            </span>
          ))}
        </div>
      </section>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface-page border-t border-border-subtle flex justify-center">
        <div className="w-full max-w-2xl flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={() => navigate(-1)}>Cancel</Button>
          <Button className="flex-1" onClick={savePreferences} disabled={saving}>
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </div>
    </div>
  );
}

