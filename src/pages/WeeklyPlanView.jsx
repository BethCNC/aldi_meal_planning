import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getMonday, formatWeekRange, isToday } from '../utils/dateHelpers';
import { generateWeeklyMealPlan } from '../api/mealPlanGenerator';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { BudgetProgress } from '../components/BudgetProgress';
import { DayCard } from '../components/DayCard';
import { Button } from '../components/ui/Button';
import { Checkbox } from '../components/ui/Checkbox';
import { useSchedule } from '../contexts/ScheduleContext';
import { getDayName, sortDaysMondayFirst } from '../utils/days';
import { WeekHeader } from '../components/week/WeekHeader';
import { generateWeeklyPlanPDF } from '../utils/pdfGenerator';
import { IconDownload } from '@tabler/icons-react';

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
        const orderedDays = sortDaysMondayFirst(data);
        setMealPlan({
          weekStartDate,
          days: orderedDays,
          totalCost: orderedDays.reduce((sum, day) => sum + (day.recipe?.total_cost || 0), 0),
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
  
  const [useAI, setUseAI] = useState(false);
  
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
        usePantryFirst: pantryItems.length > 0,
        useAI // Pass toggle state
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
      ? (useAI ? 'Thinking like a chef (AI)...' : 'Generating your meal plan...')
      : statusUpdatingId
        ? 'Updating status...'
        : 'Loading...';
    return <LoadingSpinner message={message} />;
  }
  
  const today = new Date();
  const currentDayOfWeek = today.getDay();
  
  return (
    <div className="mx-auto flex w-full max-w-[430px] flex-col">
      <WeekHeader
        label={`Week of ${formatWeekRange(weekStartDate)}`}
        onPrev={() => changeWeek(-1)}
        onNext={() => changeWeek(1)}
      />

      {mealPlan ? (
        <>
          {/* Export PDF Button */}
          <div className="px-4 pt-4">
            <Button
              variant="secondary"
              iconLeading={<IconDownload className="h-4 w-4" />}
              onClick={async () => {
                try {
                  await generateWeeklyPlanPDF(mealPlan, weekStartDate);
                } catch (error) {
                  console.error('Error generating PDF:', error);
                  alert(`Failed to generate PDF: ${error.message}`);
                }
              }}
              className="w-full"
            >
              Export PDF
            </Button>
          </div>

          {/* Schedule Info Banner */}
          <div className="px-4 pt-4">
            <div className="rounded-lg border border-border-subtle bg-surface-card p-3">
              <p className="text-xs text-icon-subtle">
                <strong className="text-text-body">Weekly Schedule:</strong> Cook Mon/Tue/Thu/Sat • Leftovers Wed/Fri/Sun
              </p>
            </div>
          </div>

          {/* Prompt banner (if applicable) */}
          {showMealPrompt && preferences && (
            <div className="px-4 pt-4">
              <div className="rounded-xl border border-border-focus bg-surface-card p-4 shadow-sm">
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
            </div>
          )}

          {/* Daily Recipe List - matches Figma menu screen structure */}
          <div className="flex-1 overflow-y-auto">
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
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center px-4 py-12">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4 text-text-body">No meal plan yet</h2>
            <p className="text-icon-subtle mb-4">
              Generate your weekly meal plan to get started
            </p>
            <div className="mb-8 rounded-lg border border-border-subtle bg-surface-card p-4 text-left">
              <p className="text-sm font-semibold text-text-body mb-2">📅 Weekly Schedule:</p>
              <ul className="text-xs text-icon-subtle space-y-1">
                <li>• <strong className="text-text-body">Monday, Tuesday, Thursday, Saturday:</strong> Cook new meals</li>
                <li>• <strong className="text-text-body">Wednesday, Friday, Sunday:</strong> Leftover nights (no cooking!)</li>
              </ul>
            </div>
            
            <div className="mb-6 flex items-center justify-center">
              <Checkbox
                label="Use Advanced AI (Better variety & pairings)"
                checked={useAI}
                onChange={setUseAI}
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full rounded-lg bg-surface-primary px-6 py-3 text-base font-semibold text-text-inverse transition hover:bg-surface-primary/90 focus:outline-none focus:ring-2 focus:ring-border-focus focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? 'Generating...' : 'Generate Meal Plan'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
