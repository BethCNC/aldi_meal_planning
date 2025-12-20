import { useNavigate } from 'react-router-dom';
import { IconRefresh, IconStar } from '@tabler/icons-react';
import { DayChip } from './week/DayChip';
import { getDayName } from '../utils/days';

function formatCurrency(value) {
  if (value === null || value === undefined) return null;
  return `$${Number(value).toFixed(2)}`;
}

export function DayCard({ day, isToday, onUpdateStatus, onSwap, onRate, className = '' }) {
  const navigate = useNavigate();
  const dayName = day.dayName || getDayName(day.day_of_week || 0);
  const recipe = day.recipe;
  const actionable = Boolean(recipe);
  const isCompleted = day.status === 'completed' || day.status === 'cooked';

  const handleStatusAdvance = (event) => {
    event.stopPropagation();
    if (actionable) {
      onUpdateStatus?.();
    }
  };

  const handleSwap = (event) => {
    event.stopPropagation();
    if (actionable && onSwap) {
      onSwap(day);
    }
  };

  return (
    <article
      className={`
        relative flex flex-col h-[112px] min-w-[100px] grow basis-0 items-center overflow-hidden
        rounded border-2 border-border-body bg-surface-page transition-colors group
        ${actionable ? 'hover:bg-surface-card cursor-pointer' : ''}
        ${className}
      `}
      onClick={() => actionable && navigate(`/recipe/${recipe.id}`)}
      role={actionable ? 'button' : undefined}
      tabIndex={actionable ? 0 : undefined}
      aria-label={actionable ? `View recipe: ${recipe.name}` : undefined}
      onKeyDown={(e) => {
        if (actionable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          navigate(`/recipe/${recipe.id}`);
        }
      }}
    >
      <div className="absolute top-1 right-1 z-10 flex gap-1">
        {/* Rate Button */}
        {actionable && onRate && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRate(day);
            }}
            className="rounded-full bg-surface-page p-1 shadow-sm border border-border-subtle hover:bg-surface-hover opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
            aria-label="Rate meal"
            title="Rate meal"
          >
            <IconStar size={14} className="text-yellow-500" />
          </button>
        )}

        {/* Swap Button */}
        {actionable && onSwap && (
          <button
            onClick={handleSwap}
            className="rounded-full bg-surface-page p-1 shadow-sm border border-border-subtle hover:bg-surface-hover opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
            aria-label="Swap meal"
            title="Swap meal"
          >
            <IconRefresh size={14} className="text-icon-subtle" />
          </button>
        )}
      </div>

      {/* Top section: Day Chip */}
      <DayChip dayName={dayName} isToday={isToday} className="w-full" />

      {/* Bottom section: Content */}
      <div className="flex flex-1 w-full flex-col items-center justify-center px-1 py-0 text-center relative group">
        {/* Helper for hover state targeting */}
        <div className="absolute inset-0 w-full h-full pointer-events-none" /> 
        
        {actionable ? (
          <p className="text-lg font-medium leading-6 text-text-body line-clamp-2">
            {recipe.name}
          </p>
        ) : day.isLeftoverNight ? (
          <p className="text-lg font-medium leading-6 text-text-body">Leftovers</p>
        ) : day.isOrderOutNight ? (
          <p className="text-lg font-medium leading-6 text-text-body">Order Out</p>
        ) : (
          <p className="text-lg font-medium leading-6 text-text-disabled">Plan Meal</p>
        )}
      </div>
    </article>
  );
}
