import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useSchedule } from '../contexts/ScheduleContext';
import { useIngredientSearch } from '../hooks/useIngredientSearch';
import { replacePantryItems } from '../api/pantry';
import { WEEK_DAYS, getDayName } from '../utils/days';

const DAY_OPTIONS = WEEK_DAYS;

const DEFAULT_UNITS = ['each', 'lb', 'oz', 'pack', 'bag'];

function dayIndex(day) {
  if (typeof day === 'number') return day;
  const idx = DAY_OPTIONS.findIndex((d) => d === day);
  return idx >= 0 ? idx : 0;
}

const createTempId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

function DayButton({ label, selected, onClick }) {
  return (
    <button
      type="button"
      className={`px-4 py-3 border rounded-lg transition-all ${
        selected
          ? 'border-border-focus bg-surface-primary text-text-inverse'
          : 'border-border-subtle bg-surface-page text-text-body hover:bg-surface-card'
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function PantryListItem({ item, onQuantityChange, onUnitChange, onRemove }) {
  return (
    <li className="flex items-center gap-3 p-3 border border-border-subtle rounded-lg bg-surface-card">
      <span className="flex-1 text-text-body font-medium">{item.name}</span>
      <input
        type="number"
        min="0.25"
        step="0.25"
        className="w-20 border border-border-subtle rounded px-2 py-1 text-right"
        value={item.quantity}
        onChange={(e) => onQuantityChange(item.tempId, Number(e.target.value))}
      />
      <select
        className="border border-border-subtle rounded px-2 py-1 text-text-body"
        value={item.unit}
        onChange={(e) => onUnitChange(item.tempId, e.target.value)}
      >
        {DEFAULT_UNITS.map((unit) => (
          <option key={unit} value={unit}>
            {unit}
          </option>
        ))}
      </select>
      <Button variant="secondary" size="sm" onClick={() => onRemove(item.tempId)}>
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
  const [mealPlanDay, setMealPlanDay] = useState(1); // default Monday
  const [groceryDay, setGroceryDay] = useState(0); // default Sunday
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
    [pantryItems]
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
          unit: 'each'
        }
      ];
    });
    setInput('');
    clear();
  };

  const handleQuantityChange = (tempId, value) => {
    setPantryItems((prev) =>
      prev.map((item) => (item.tempId === tempId ? { ...item, quantity: value } : item))
    );
  };

  const handleUnitChange = (tempId, value) => {
    setPantryItems((prev) =>
      prev.map((item) => (item.tempId === tempId ? { ...item, unit: value } : item))
    );
  };

  const handleRemoveItem = (tempId) => {
    setPantryItems((prev) => prev.filter((item) => item.tempId !== tempId));
  };

  const canContinueSchedule = useMemo(() => mealPlanDay !== null && groceryDay !== null, [mealPlanDay, groceryDay]);

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

    const schedulePayload = {
      meal_plan_day: mealPlanDay,
      grocery_day: groceryDay,
      onboarding_completed: true
    };

    try {
      await updatePreferences(schedulePayload);
      if (pantryItems.length > 0) {
        await replacePantryItems(
          pantryItems.map((item) => ({
            ingredient_id: item.ingredient_id,
            quantity: item.quantity,
            unit: item.unit,
            source: 'onboarding'
          }))
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

  if (loading) {
    return (
      <div className="max-w-xl mx-auto p-6">
        <p className="text-text-body">Loading your preferences...</p>
      </div>
    );
  }

  const scheduleDayLabel = (index) => getDayName(index);

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-text-body mb-2">Welcome to your Aldi meal planner</h1>
        <p className="text-icon-subtle">
          Let’s set up your weekly rhythm so the planner can handle decisions for you.
        </p>
      </header>

      {error && (
        <div className="border border-error/40 bg-error/10 text-text-body px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {step === 0 && (
        <section className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-text-body mb-2">Pick your meal plan day</h2>
            <p className="text-icon-subtle mb-3">
              We’ll generate new recipes on this day each week.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {DAY_OPTIONS.map((day, index) => (
                <DayButton
                  key={`meal-${day}`}
                  label={day}
                  selected={mealPlanDay === index}
                  onClick={() => setMealPlanDay(index)}
                />
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-text-body mb-2">Pick your grocery day</h2>
            <p className="text-icon-subtle mb-3">
              We’ll remind you to review your pantry before shopping.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {DAY_OPTIONS.map((day, index) => (
                <DayButton
                  key={`shop-${day}`}
                  label={day}
                  selected={groceryDay === index}
                  onClick={() => setGroceryDay(index)}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-text-body mb-2">What’s already in your kitchen?</h2>
            <p className="text-icon-subtle mb-4">
              Add a few essentials so we can prioritize recipes that use what you have. You can always update this later.
            </p>
          </div>

          <div>
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
              className="w-full px-4 py-3 text-base border-2 border-border-subtle rounded-lg focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus"
            />
            {isSearching && (
              <p className="text-sm text-icon-subtle mt-2">Searching ingredients...</p>
            )}
            {suggestions.length > 0 && (
              <ul className="mt-2 border border-border-subtle rounded-lg shadow-lg bg-surface-page max-h-60 overflow-y-auto">
                {suggestions.map((item) => (
                  <li
                    key={item.id}
                    onClick={() => handleAddSuggestion(item)}
                    className="px-4 py-3 hover:bg-surface-card cursor-pointer text-text-body"
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
            <p className="text-icon-subtle italic">
              Add at least one pantry item or continue to skip for now.
            </p>
          )}
        </section>
      )}

      {step === 2 && (
        <section className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-text-body mb-2">All set!</h2>
            <p className="text-icon-subtle">
              Here’s what we’ll do every week. You can change these anytime in Settings.
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 border border-border-subtle rounded-lg bg-surface-card">
              <h3 className="text-lg font-semibold text-text-body mb-1">Weekly schedule</h3>
              <p className="text-icon-subtle">
                Meal plan on <strong>{scheduleDayLabel(mealPlanDay)}</strong> • Grocery run on{' '}
                <strong>{scheduleDayLabel(groceryDay)}</strong>
              </p>
            </div>

            <div className="p-4 border border-border-subtle rounded-lg bg-surface-card">
              <h3 className="text-lg font-semibold text-text-body mb-2">Pantry highlights</h3>
              {pantryItems.length > 0 ? (
                <ul className="list-disc list-inside text-icon-subtle">
                  {sortedPantryItems.map((item) => (
                    <li key={item.tempId}>
                      {item.name} — {item.quantity} {item.unit}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-icon-subtle italic">
                  No pantry items added yet. You can update this anytime under Pantry.
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      <footer className="flex justify-between items-center">
        {step > 0 ? (
          <Button variant="secondary" onClick={handleBack}>
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


