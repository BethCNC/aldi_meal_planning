import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useSchedule } from '../contexts/ScheduleContext';
import { useIngredientSearch } from '../hooks/useIngredientSearch';
import { replacePantryItems } from '../api/pantry';
import { getDayName } from '../utils/days';
import { DaySelectGrid } from '../components/schedule/DaySelectGrid';

const STEP_INFO = [
  {
    title: 'Set your weekly rhythm',
    description: 'Pick the days you want fresh meal plans and gentle grocery nudges.',
    icon: '/icons/icon%3Dcalendar-star.png',
  },
  {
    title: 'Snapshot your pantry',
    description: 'Add a few staples so we can prioritize recipes that use what you already own.',
    icon: '/icons/food-icons/food%20icon=natural-food.png',
  },
  {
    title: 'Review & finish',
    description: 'Double-check your selections before the planner takes over.',
    icon: '/icons/icon%3Dcheck.png',
  },
];

const DEFAULT_UNITS = ['each', 'lb', 'oz', 'pack', 'bag'];

const createTempId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

function StepIndicator({ current }) {
  return (
    <div className="flex items-center justify-between gap-2">
      {STEP_INFO.map((step, index) => {
        const isActive = current === index;
        const isComplete = index < current;
        return (
          <div key={step.title} className="flex flex-1 items-center gap-2 last:flex-none">
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition-shadow ${
                isActive
                  ? 'border-border-focus bg-surface-primary text-text-display shadow-sm'
                  : isComplete
                    ? 'border-border-focus bg-surface-primary/20 text-text-body'
                    : 'border-border-subtle bg-surface-page text-icon-subtle'
              }`}
            >
              {index + 1}
            </span>
            {index < STEP_INFO.length - 1 && (
              <span
                className={`h-[2px] flex-1 rounded-full ${
                  index < current ? 'bg-surface-primary' : 'bg-border-subtle'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function PantryListItem({ item, onQuantityChange, onUnitChange, onRemove }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-border-subtle bg-surface-card px-3 py-3 shadow-sm">
      <span className="flex-1 text-sm font-semibold text-text-body">{item.name}</span>
      <input
        type="number"
        min="0.25"
        step="0.25"
        className="w-20 rounded-lg border border-border-subtle px-2 py-2 text-right text-sm focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus"
        value={item.quantity}
        onChange={(e) => onQuantityChange(item.tempId, Number(e.target.value))}
      />
      <select
        className="rounded-lg border border-border-subtle px-2 py-2 text-sm text-text-body focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus"
        value={item.unit}
        onChange={(e) => onUnitChange(item.tempId, e.target.value)}
      >
        {DEFAULT_UNITS.map((unit) => (
          <option key={unit} value={unit}>
            {unit}
          </option>
        ))}
      </select>
      <Button variant="ghost" size="small" onClick={() => onRemove(item.tempId)}>
        Remove
      </Button>
    </li>
  );
}

export function OnboardingView() {
  const navigate = useNavigate();
  const { preferences, updatePreferences, markOnboardingComplete, loading } = useSchedule();
  const { suggestions, search, clear, isSearching } = useIngredientSearch();
  const [step, setStep] = useState(0);
  const [mealPlanDay, setMealPlanDay] = useState(1);
  const [groceryDay, setGroceryDay] = useState(0);
  const [input, setInput] = useState('');
  const [pantryItems, setPantryItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (preferences) {
      if (typeof preferences.meal_plan_day === 'number') {
        setMealPlanDay(preferences.meal_plan_day);
      }
      if (typeof preferences.grocery_day === 'number') {
        setGroceryDay(preferences.grocery_day);
      }
    }
  }, [preferences]);

  const sortedPantryItems = useMemo(
    () => [...pantryItems].sort((a, b) => a.name.localeCompare(b.name)),
    [pantryItems],
  );

  const handleAddSuggestion = (ingredient) => {
    if (!ingredient?.id) return;
    setPantryItems((prev) => {
      if (prev.some((item) => item.ingredient_id === ingredient.id)) {
        return prev;
      }
      return [
        ...prev,
        {
          tempId: createTempId(),
          ingredient_id: ingredient.id,
          name: ingredient.item,
          quantity: 1,
          unit: 'each',
        },
      ];
    });
    setInput('');
    clear();
  };

  const handleQuantityChange = (tempId, value) => {
    setPantryItems((prev) =>
      prev.map((item) => (item.tempId === tempId ? { ...item, quantity: value } : item)),
    );
  };

  const handleUnitChange = (tempId, value) => {
    setPantryItems((prev) =>
      prev.map((item) => (item.tempId === tempId ? { ...item, unit: value } : item)),
    );
  };

  const handleRemoveItem = (tempId) => {
    setPantryItems((prev) => prev.filter((item) => item.tempId !== tempId));
  };

  const canContinueSchedule = useMemo(
    () => mealPlanDay !== null && groceryDay !== null,
    [mealPlanDay, groceryDay],
  );

  const handleNext = () => {
    if (step === 0 && !canContinueSchedule) {
      setError('Please choose your preferred schedule before continuing.');
      return;
    }
    setError(null);
    setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setError(null);
    setStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      await updatePreferences({
        meal_plan_day: mealPlanDay,
        grocery_day: groceryDay,
        onboarding_completed: true,
      });

      if (pantryItems.length > 0) {
        await replacePantryItems(
          pantryItems.map((item) => ({
            ingredient_id: item.ingredient_id,
            quantity: item.quantity,
            unit: item.unit,
            source: 'onboarding',
          })),
        );
      }

      await markOnboardingComplete();
      navigate('/');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to save onboarding details. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const scheduleDayLabel = (index) => getDayName(index);
  const currentStepConfig = STEP_INFO[step] ?? STEP_INFO[0];

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-[430px] flex-col gap-4 px-4 py-10">
        <p className="text-sm text-text-body">Loading your preferences...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[430px] flex-col space-y-6 px-4 pb-24 pt-6">
      <div className="overflow-hidden rounded-3xl border border-border-subtle bg-surface-inverse text-text-inverse shadow-lg">
        <div className="relative flex flex-col gap-4 px-6 py-8">
          <div className="flex items-center gap-3">
            {currentStepConfig?.icon && (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-page/20">
                <img src={currentStepConfig.icon} alt="" className="h-8 w-8 object-contain" />
              </div>
            )}
            <div>
              <p className="text-xs uppercase tracking-wide text-text-inverse/80">
                Step {step + 1} of {STEP_INFO.length}
              </p>
              <h1 className="text-2xl font-semibold leading-8">
                {currentStepConfig?.title || 'Welcome to your Aldi meal planner'}
              </h1>
            </div>
          </div>
          <p className="text-sm text-text-inverse/80">
            {currentStepConfig?.description ||
              'Let’s set up your weekly rhythm so the planner can handle decisions for you.'}
          </p>
        </div>
      </div>

      <StepIndicator current={step} />

      {error && (
        <div className="rounded-2xl border border-error/40 bg-error/10 px-4 py-3 text-sm text-text-body">
          {error}
        </div>
      )}

      {step === 0 && (
        <section className="space-y-6">
          <div className="space-y-3 rounded-2xl border border-border-subtle bg-surface-card px-4 py-5 shadow-sm">
            <h2 className="text-lg font-semibold text-text-body">Pick your meal plan day</h2>
            <p className="text-sm text-icon-subtle">We'll generate new recipes on this day each week.</p>
            <DaySelectGrid selectedIndex={mealPlanDay} onSelect={setMealPlanDay} />
            <div className="mt-4 rounded-lg border border-border-subtle bg-surface-page p-3">
              <p className="text-xs font-semibold text-text-body mb-1">📅 Weekly Meal Schedule:</p>
              <ul className="text-xs text-icon-subtle space-y-1">
                <li>• <strong className="text-text-body">Monday, Tuesday, Thursday, Saturday:</strong> Cook new meals</li>
                <li>• <strong className="text-text-body">Wednesday, Friday, Sunday:</strong> Leftover nights (no cooking!)</li>
              </ul>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-border-subtle bg-surface-card px-4 py-5 shadow-sm">
            <h2 className="text-lg font-semibold text-text-body">Pick your grocery day</h2>
            <p className="text-sm text-icon-subtle">We’ll remind you to review your pantry before shopping.</p>
            <DaySelectGrid selectedIndex={groceryDay} onSelect={setGroceryDay} />
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="space-y-6">
          <div className="space-y-3 rounded-2xl border border-border-subtle bg-surface-card px-4 py-5 shadow-sm">
            <h2 className="text-lg font-semibold text-text-body">What’s already in your kitchen?</h2>
            <p className="text-sm text-icon-subtle">
              Add a few essentials so we can prioritize recipes that use what you have. You can always update this later.
            </p>
            <label htmlFor="pantry-search" className="sr-only">
              Search ingredients
            </label>
            <input
              id="pantry-search"
              type="text"
              value={input}
              onChange={(e) => {
                const value = e.target.value;
                setInput(value);
                if (value.length > 1) {
                  search(value);
                } else {
                  clear();
                }
              }}
              placeholder="Search Aldi ingredients (e.g., chicken breast, jasmine rice)"
              className="w-full rounded-xl border border-border-subtle px-4 py-3 text-sm focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus"
            />
            {isSearching && <p className="mt-2 text-xs text-icon-subtle">Searching ingredients...</p>}
            {suggestions.length > 0 && (
              <ul className="mt-2 max-h-60 overflow-y-auto rounded-xl border border-border-subtle bg-surface-page shadow-lg">
                {suggestions.map((item) => (
                  <li
                    key={item.id}
                    onClick={() => handleAddSuggestion(item)}
                    className="cursor-pointer px-4 py-3 text-sm text-text-body hover:bg-surface-card"
                  >
                    {item.item}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {pantryItems.length > 0 ? (
            <ul className="space-y-3">
              {sortedPantryItems.map((item) => (
                <PantryListItem
                  key={item.tempId}
                  item={item}
                  onQuantityChange={handleQuantityChange}
                  onUnitChange={handleUnitChange}
                  onRemove={handleRemoveItem}
                />
              ))}
            </ul>
          ) : (
            <p className="text-sm italic text-icon-subtle">
              Add at least one pantry item or continue to skip for now.
            </p>
          )}
        </section>
      )}

      {step === 2 && (
        <section className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-text-body">All set!</h2>
            <p className="text-sm text-icon-subtle">
              Here’s what we’ll do every week. You can change these anytime in Settings.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2 rounded-2xl border border-border-subtle bg-surface-card px-4 py-5 shadow-sm">
              <h3 className="text-base font-semibold text-text-body">Weekly schedule</h3>
              <p className="text-sm text-icon-subtle">
                Meal plan on <strong>{scheduleDayLabel(mealPlanDay)}</strong> • Grocery run on{' '}
                <strong>{scheduleDayLabel(groceryDay)}</strong>
              </p>
            </div>

            <div className="space-y-2 rounded-2xl border border-border-subtle bg-surface-card px-4 py-5 shadow-sm">
              <h3 className="text-base font-semibold text-text-body">Pantry highlights</h3>
              {pantryItems.length > 0 ? (
                <ul className="list-disc list-inside text-sm text-icon-subtle">
                  {sortedPantryItems.map((item) => (
                    <li key={item.tempId}>
                      {item.name} — {item.quantity} {item.unit}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm italic text-icon-subtle">
                  No pantry items added yet. You can update this anytime under Pantry.
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      <footer className="flex items-center justify-between gap-3 border-t border-border-subtle pt-4">
        {step > 0 ? (
          <Button variant="ghost" onClick={handleBack}>
            Back
          </Button>
        ) : (
          <span />
        )}

        {step < 2 ? (
          <div className="flex gap-2">
            {step === 1 && (
              <Button variant="ghost" onClick={handleNext}>
                Skip for now
              </Button>
            )}
            <Button onClick={handleNext} disabled={step === 0 && !canContinueSchedule}>
              Continue →
            </Button>
          </div>
        ) : (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Finish setup'}
          </Button>
        )}
      </footer>
    </div>
  );
}


