import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getMonday, formatWeekRange } from '../utils/dateHelpers';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { WeekHeader } from '../components/week/WeekHeader';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { formatCurrency } from '../utils/numberFormat';

const WEEK_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DAY_COLOR_CLASSES = {
  Sunday: 'bg-day-sunday',
  Monday: 'bg-day-monday',
  Tuesday: 'bg-day-tuesday',
  Wednesday: 'bg-day-wednesday',
  Thursday: 'bg-day-thursday',
  Friday: 'bg-day-friday',
  Saturday: 'bg-day-saturday',
};

const DAY_ABBREVIATIONS = {
  Sunday: 'Sun',
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
  Saturday: 'Sat',
};

/**
 * Compact daily recipe card for grid display
 */
function DailyRecipeCard({ day, recipe, isToday, onClick, isFullWidth = false }) {
  const dayName = day.dayName || WEEK_DAYS[day.day_of_week || 0];
  const recipeName = recipe?.name || 'No meal planned';
  const isActionable = Boolean(recipe);
  const dayColorClass = DAY_COLOR_CLASSES[dayName] || 'bg-surface-elevated';
  const dayAbbr = DAY_ABBREVIATIONS[dayName] || dayName.substring(0, 3);

  return (
    <button
      onClick={() => isActionable && onClick?.()}
      disabled={!isActionable}
      className={`
        flex flex-col overflow-hidden rounded-xl border transition-all
        ${isActionable 
          ? 'border-border-subtle bg-surface-card hover:border-border-focus hover:shadow-md cursor-pointer' 
          : 'border-border-disabled bg-surface-disabled cursor-not-allowed opacity-60'
        }
        ${isToday ? 'ring-2 ring-offset-2 ring-surface-focus' : ''}
        ${isFullWidth ? 'w-full' : ''}
      `}
      aria-label={isActionable ? `View ${recipeName} for ${dayName}` : `No meal planned for ${dayName}`}
    >
      <div className={`h-8 flex items-center justify-center ${dayColorClass}`}>
        <span className="text-xs font-semibold text-text-inverse uppercase">
          {dayAbbr}
        </span>
      </div>
      <div className="flex-1 p-2 min-h-[80px] flex items-center">
        <p className={`text-xs font-medium leading-tight line-clamp-3 text-center w-full ${
          isActionable ? 'text-text-body' : 'text-text-disabled'
        }`}>
          {recipeName}
        </p>
      </div>
    </button>
  );
}

export function HomeView() {
  const navigate = useNavigate();
  const [weekStartDate, setWeekStartDate] = useState(getMonday(new Date()).toISOString().split('T')[0]);
  const [mealPlan, setMealPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [budget, setBudget] = useState(100);
  const [servings, setServings] = useState(4);

  useEffect(() => {
    loadMealPlan();
  }, [weekStartDate]);

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
        // Map day_of_week to day names
        const daysWithNames = data.map((day) => ({
          ...day,
          dayName: day.dayName || WEEK_DAYS[day.day_of_week || 0]
        }));
        
        const totalCost = daysWithNames.reduce((sum, day) => sum + (day.recipe?.total_cost || 0), 0);
        setMealPlan({
          weekStartDate,
          days: daysWithNames,
          totalCost
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

  const changeWeek = (direction) => {
    const current = new Date(weekStartDate);
    current.setDate(current.getDate() + (direction * 7));
    setWeekStartDate(getMonday(current).toISOString().split('T')[0]);
  };

  const handleRecipeClick = (day) => {
    if (day.recipe?.id) {
      navigate(`/recipe/${day.recipe.id}`);
    }
  };

  const handleViewFullPlan = () => {
    navigate('/weekly-plan');
  };

  const handleGenerateGroceryList = () => {
    navigate(`/grocery-list?week=${weekStartDate}`);
  };

  if (loading) {
    return <LoadingSpinner message="Loading meal plan..." />;
  }

  const today = new Date();
  const currentDayOfWeek = today.getDay();
  const todayDate = today.toISOString().split('T')[0];

  // Prepare days for grid display
  const gridDays = mealPlan?.days || [];
  const totalCost = mealPlan?.totalCost || 0;

  return (
    <div className="mx-auto flex w-full max-w-[430px] flex-col">
      <WeekHeader
        label={`Week of ${formatWeekRange(weekStartDate)}`}
        onPrev={() => changeWeek(-1)}
        onNext={() => changeWeek(1)}
      />

      {/* Total Cost Display */}
      {mealPlan && (
        <div className="px-6 py-6 bg-surface-page">
          <div className="text-center">
            <p className="text-5xl font-bold text-text-body mb-3">
              {formatCurrency(totalCost)}
            </p>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-icon-subtle">
              Estimated Total
            </p>
          </div>
        </div>
      )}

      {/* Daily Recipe Grid */}
      <div className="px-6 py-4">
        {mealPlan && gridDays.length > 0 ? (
          <>
            <div className="grid grid-cols-3 gap-3 mb-3">
              {gridDays.slice(0, 6).map((day) => {
                const dayDate = new Date(weekStartDate);
                dayDate.setDate(dayDate.getDate() + (day.day_of_week || 0));
                const isTodayDay = dayDate.toISOString().split('T')[0] === todayDate && 
                                   currentDayOfWeek === day.day_of_week;

                return (
                  <DailyRecipeCard
                    key={day.id || `${weekStartDate}-${day.day_of_week}`}
                    day={day}
                    recipe={day.recipe}
                    isToday={isTodayDay}
                    onClick={() => handleRecipeClick(day)}
                  />
                );
              })}
            </div>
            {/* Full-width Saturday card if exists */}
            {gridDays.length > 6 && (
              <DailyRecipeCard
                day={gridDays[6]}
                recipe={gridDays[6].recipe}
                isToday={false}
                onClick={() => handleRecipeClick(gridDays[6])}
                isFullWidth={true}
              />
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-icon-subtle mb-4">No meal plan yet</p>
            <Button onClick={() => navigate('/weekly-plan')}>
              Create Meal Plan
            </Button>
          </div>
        )}

        {/* Action Buttons */}
        {mealPlan && (
          <div className="flex flex-col gap-3 mt-6">
            <Button onClick={handleViewFullPlan} variant="secondary" className="w-full">
              View Full Plan
            </Button>
            <Button onClick={handleGenerateGroceryList} className="w-full">
              Generate Grocery List →
            </Button>
          </div>
        )}
      </div>

      {/* Second Week Header (for next week preview) */}
      {mealPlan && (
        <WeekHeader
          label={`Next Week`}
          onPrev={() => {}}
          onNext={() => {}}
        />
      )}

      {/* Quick Input Section */}
      {mealPlan && (
        <div className="px-6 py-4 space-y-4 pb-24">
          <Input
            label="Weekly Budget"
            type="number"
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            placeholder="100"
          />
          <Input
            label="Servings"
            type="number"
            value={servings}
            onChange={(e) => setServings(Number(e.target.value))}
            placeholder="4"
          />
        </div>
      )}
    </div>
  );
}

