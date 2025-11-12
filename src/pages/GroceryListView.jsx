import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getMonday, formatWeekRange } from '../utils/dateHelpers';
import { generateGroceryList } from '../api/groceryListGenerator';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { CategorySection } from '../components/CategorySection';
import { Button } from '../components/ui/Button';
import { useSchedule } from '../contexts/ScheduleContext';
import { getDayName } from '../utils/days';
import { WeekHeader } from '../components/week/WeekHeader';

const CATEGORY_INFO = {
  Produce: { location: 'Front Left' },
  Meat: { location: 'Back Left' },
  Dairy: { location: 'Back Right' },
  Pantry: { location: 'Center Aisles' },
  Frozen: { location: 'Middle Right' },
  Bakery: { location: 'Center Aisles' },
};

export function GroceryListView() {
  const [searchParams] = useSearchParams();
  const weekParam = searchParams.get('week');
  const weekStartDate = weekParam || getMonday(new Date()).toISOString().split('T')[0];
  const navigate = useNavigate();
  
  const { preferences, hasSeenPrompt, markPromptSeen } = useSchedule();
  const [groceryList, setGroceryList] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showGroceryPrompt, setShowGroceryPrompt] = useState(false);
  
  useEffect(() => {
    loadGroceryList();
  }, [weekStartDate]);

  const groceryWeekKey = useMemo(() => weekStartDate, [weekStartDate]);

  useEffect(() => {
    if (!preferences) return;
    const todayIndex = new Date().getDay();
    const scheduled = preferences.grocery_day;
    if (
      typeof scheduled === 'number' &&
      todayIndex === scheduled &&
      !hasSeenPrompt('grocery_day', groceryWeekKey)
    ) {
      setShowGroceryPrompt(true);
    } else {
      setShowGroceryPrompt(false);
    }
  }, [preferences, hasSeenPrompt, groceryWeekKey]);
  
  const loadGroceryList = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('grocery_lists')
        .select(`
          *,
          ingredient:ingredients(*)
        `)
        .eq('week_start_date', weekStartDate)
        .order('category');
      
      if (data && data.length > 0) {
        const byCategory = {};
        data.forEach((item) => {
          const cat = item.category || 'Other';
          if (!byCategory[cat]) {
            const info = CATEGORY_INFO[cat] || { location: 'Various' };
            byCategory[cat] = {
              name: cat,
              location: info.location,
              items: []
            };
          }
          byCategory[cat].items.push(item);
        });
        
        setGroceryList({
          weekStartDate,
          itemsByCategory: byCategory,
          totalCost: data.reduce((sum, item) => sum + (item.estimated_cost || 0), 0)
        });
      }
    } catch (error) {
      console.error('Error loading grocery list:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleGenerate = async () => {
    if (preferences && typeof preferences.grocery_day === 'number') {
      const todayIndex = new Date().getDay();
      if (todayIndex !== preferences.grocery_day) {
        const proceed = window.confirm(
          `Your grocery day is ${getDayName(preferences.grocery_day)}. Generate a list now?`
        );
        if (!proceed) {
          return;
        }
      }
    }
    if (showGroceryPrompt) {
      markPromptSeen('grocery_day', groceryWeekKey);
      setShowGroceryPrompt(false);
    }
    setGenerating(true);
    try {
      const list = await generateGroceryList(weekStartDate, { usePantry: true });
      setGroceryList(list);
    } catch (error) {
      console.error('Error generating grocery list:', error);
      alert(`Failed to generate grocery list: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const acknowledgeGroceryPrompt = (action) => {
    markPromptSeen('grocery_day', groceryWeekKey);
    setShowGroceryPrompt(false);
    if (action === 'pantry') {
      navigate('/pantry-input');
    }
  };
  
  const handleToggleItem = async (id, purchased) => {
    try {
      await supabase
        .from('grocery_lists')
        .update({ is_purchased: purchased })
        .eq('id', id);
      
      // Reload list
      loadGroceryList();
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };
  
  if (loading || generating) {
    return <LoadingSpinner message={generating ? 'Generating grocery list...' : 'Loading...'} />;
  }
  
  const changeWeek = (direction) => {
    const current = new Date(weekStartDate);
    current.setDate(current.getDate() + direction * 7);
    const newWeek = getMonday(current).toISOString().split('T')[0];
    navigate(`/grocery-list?week=${newWeek}`);
  };

  return (
    <div className="mx-auto flex w-full max-w-[430px] flex-col">
      <WeekHeader
        label={`Week of ${formatWeekRange(weekStartDate)}`}
        onPrev={() => changeWeek(-1)}
        onNext={() => changeWeek(1)}
      />

      {groceryList ? (
        <>
          {/* Total Cost Display - matches Figma */}
          <div className="px-6 py-6 bg-surface-page">
            <div className="text-center">
              <p className="text-5xl font-bold text-text-body mb-3">
                {groceryList.totalCost != null ? `$${groceryList.totalCost.toFixed(2)}` : '$0.00'}
              </p>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-icon-subtle">
                Estimated Total
              </p>
            </div>
          </div>

          {/* Grocery Lists by Category - matches Figma structure */}
          <div className="flex-1 overflow-y-auto px-4 pb-24">
            {showGroceryPrompt && preferences && (
              <div className="mb-4 rounded-xl border border-border-focus bg-surface-card p-4 shadow-sm">
                <h3 className="text-lg font-semibold text-text-body mb-1">
                  It&apos;s {getDayName(preferences.grocery_day)}—time to sync your pantry.
                </h3>
                <p className="text-icon-subtle mb-3">
                  Confirm what&apos;s on hand so your grocery list only includes what you need.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => acknowledgeGroceryPrompt('pantry')}>Update pantry</Button>
                  <Button variant="secondary" onClick={() => acknowledgeGroceryPrompt('later')}>
                    Continue without updating
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-6">
              {Object.values(groceryList.itemsByCategory).map((category) => (
                <CategorySection
                  key={category.name}
                  category={category}
                  items={category.items}
                  onToggle={handleToggleItem}
                />
              ))}
            </div>

            {groceryList.alreadyHave && groceryList.alreadyHave.length > 0 && (
              <div className="mt-6 rounded-2xl border border-apple-200 bg-apple-50 p-5 shadow-sm">
                <h2 className="text-lg font-semibold mb-2 text-apple-900">
                  ✅ Already Have ({groceryList.savings != null ? `$${groceryList.savings.toFixed(2)}` : '$0.00'} saved)
                </h2>
                <ul className="list-disc list-inside text-sm text-icon-subtle">
                  {groceryList.alreadyHave.map((item, idx) => (
                    <li key={idx}>
                      {item.ingredient?.item || item.notes} ({item.pantry_quantity} {item.unit})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center px-4 py-12">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4 text-text-body">No grocery list yet</h2>
            <p className="text-icon-subtle mb-8">
              Generate a grocery list for this week
            </p>
            <Button onClick={handleGenerate} size="lg">
              Generate Grocery List
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
