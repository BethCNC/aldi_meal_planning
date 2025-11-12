import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getMonday, formatWeekRange, isToday } from '../utils/dateHelpers';
import { generateWeeklyMealPlan } from '../api/mealPlanGenerator';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { BudgetProgress } from '../components/BudgetProgress';
import { DayCard } from '../components/DayCard';
import { Button } from '../components/ui/Button';
import { useSchedule } from '../contexts/ScheduleContext';
import { getDayName } from '../utils/days';

const STATUS_FLOW = ['planned', 'shopped', 'completed'];

export function WeeklyPlanView() {
  const navigate = useNavigate();
  const location = useLocation();
  const { preferences, hasSeenPrompt, markPromptSeen } = useSchedule();
  
  const [weekStartDate, setWeekStartDate] = useState(getMonday(new Date()).toISOString().split('T')[0]);
  const [mealPlan, setMealPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);
  const [showMealPrompt, setShowMealPrompt] = useState(false);
  
  const changeWeek = (direction) => {
    const current = new Date(weekStartDate);
    current.setDate(current.getDate() + (direction * 7));
    setWeekStartDate(getMonday(current).toISOString().split('T')[0]);
  };
  
  const pantryItems = location.state?.pantryItems || [];
  const selectedRecipeIds = location.state?.selectedRecipeIds || [];
  
  useEffect(() => {
    loadMealPlan();
  }, [weekStartDate]);

  const mealPlanWeekKey = useMemo(() => weekStartDate, [weekStartDate]);

  useEffect(() => {
    if (!preferences) return;
    const todayIndex = new Date().getDay();
    const scheduledDay = preferences.meal_plan_day;
    if (
      typeof scheduledDay === 'number' &&
      todayIndex === scheduledDay &&
      !hasSeenPrompt('meal_plan', mealPlanWeekKey)
    ) {
      setShowMealPrompt(true);
    } else {
      setShowMealPrompt(false);
    }
  }, [preferences, hasSeenPrompt, mealPlanWeekKey]);
  
  const loadMealPlan = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('meal_plans')
        .select(`
          *,
          recipe:recipes(*)
        `)
        .eq('week_start_date', weekStartDate)
        .order('day_of_week');
      
      if (data && data.length > 0) {
        setMealPlan({
          weekStartDate,
          days: data,
          totalCost: data.reduce((sum, day) => sum + (day.recipe?.total_cost || 0), 0),
          budget: 100
        });
      } else {
        setMealPlan(null);
      }
    } catch (error) {
      console.error('Error loading meal plan:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const advanceStatus = async (day) => {
    if (!day?.id) return;
    const current = day.status || 'planned';
    const currentIndex = STATUS_FLOW.indexOf(current);
    const nextStatus = STATUS_FLOW[(currentIndex + 1) % STATUS_FLOW.length];
    setStatusUpdatingId(day.id);
    try {
      await supabase
        .from('meal_plans')
        .update({ status: nextStatus })
        .eq('id', day.id);
      await loadMealPlan();
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const acknowledgeMealPrompt = (action) => {
    markPromptSeen('meal_plan', mealPlanWeekKey);
    setShowMealPrompt(false);
    if (action === 'pantry') {
      navigate('/pantry-input');
    }
  };
  
  const handleGenerate = async () => {
    if (preferences && typeof preferences.meal_plan_day === 'number') {
      const todayIndex = new Date().getDay();
      if (todayIndex !== preferences.meal_plan_day) {
        const proceed = window.confirm(
          `Your scheduled meal plan day is ${getDayName(preferences.meal_plan_day)}. Generate a plan now?`
        );
        if (!proceed) {
          return;
        }
      }
    }
    if (showMealPrompt) {
      markPromptSeen('meal_plan', mealPlanWeekKey);
      setShowMealPrompt(false);
    }
    setGenerating(true);
    try {
      const plan = await generateWeeklyMealPlan({
        budget: 100,
        servings: 4,
        weekStartDate,
        pantryItems,
        usePantryFirst: pantryItems.length > 0
      });
      
      setMealPlan(plan);
    } catch (error) {
      console.error('Error generating meal plan:', error);
      alert(`Failed to generate meal plan: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };
  
  if (loading || generating || statusUpdatingId) {
    const message = generating
      ? 'Generating your meal plan...'
      : statusUpdatingId
        ? 'Updating status...'
        : 'Loading...';
    return <LoadingSpinner message={message} />;
  }
  
  const today = new Date();
  const currentDayOfWeek = today.getDay();
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-surface-inverted text-text-inverse px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold">
            Week of {formatWeekRange(weekStartDate)}
          </span>
          <div className="flex gap-2">
            <button 
              onClick={() => changeWeek(-1)}
              className="text-text-inverse hover:text-icon-focus px-2 py-1"
            >
              ←
            </button>
            <button 
              onClick={() => changeWeek(1)}
              className="text-text-inverse hover:text-icon-focus px-2 py-1"
            >
              →
            </button>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        {mealPlan ? (
          <>
            {showMealPrompt && preferences && (
              <div className="mb-4 border border-border-focus bg-surface-card rounded-lg p-4">
                <h3 className="text-lg font-semibold text-text-body mb-1">
                  It&apos;s {getDayName(preferences.meal_plan_day)}—pantry check time!
                </h3>
                <p className="text-icon-subtle mb-3">
                  Refresh what you have before generating this week&apos;s plan so we can prioritize the right recipes.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => acknowledgeMealPrompt('pantry')}>Review pantry</Button>
                  <Button variant="secondary" onClick={() => acknowledgeMealPrompt('later')}>
                    I&apos;ll do it later
                  </Button>
                </div>
              </div>
            )}

            <BudgetProgress 
              current={mealPlan.totalCost} 
              budget={mealPlan.budget || 100}
              className="mb-6"
            />
            
            <div className="bg-surface-page rounded-lg border border-border-subtle overflow-hidden mb-6">
              {mealPlan.days.map((day) => {
                const dayDate = new Date(weekStartDate);
                dayDate.setDate(dayDate.getDate() + (day.day_of_week || 0));
                const isTodayDay = isToday(dayDate) && currentDayOfWeek === day.day_of_week;
                
                return (
                  <DayCard
                    key={day.id || `${weekStartDate}-${day.day_of_week}`}
                    day={day}
                    isToday={isTodayDay}
                    onUpdateStatus={() => advanceStatus(day)}
                  />
                );
              })}
            </div>
            
            <div className="flex gap-4">
              <Button onClick={() => navigate(`/grocery-list?week=${weekStartDate}`)}>
                Generate Grocery List →
              </Button>
              <Button variant="secondary" onClick={handleGenerate}>
                Regenerate Plan
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4 text-text-body">No meal plan yet</h2>
            <p className="text-icon-subtle mb-8">
              Generate your weekly meal plan to get started
            </p>
            <Button onClick={handleGenerate} size="lg">
              Generate Meal Plan
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
