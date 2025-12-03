import { useNavigate } from 'react-router-dom';
import { Badge } from './ui/Badge';
import { DayChip } from './week/DayChip';
import { getDayName } from '../utils/days';

const statusMeta = {
  planned: {label: 'Planned', variant: 'warning'},
  shopped: {label: 'Shopped', variant: 'default'},
  completed: {label: 'Complete', variant: 'success'}
};

function extractFromNotes(notes, field) {
  if (!notes) return null;
  const regex = new RegExp(`${field}:\s*([^|]+)`, 'i');
  const match = notes.match(regex);
  return match ? match[1].trim() : null;
}

function formatCurrency(value) {
  if (value === null || value === undefined) return null;
  return `$${Number(value).toFixed(2)}`;
}

export function DayCard({ day, isToday, onUpdateStatus }) {
  const navigate = useNavigate();
  const dayName = day.dayName || getDayName(day.day_of_week || 0);
  const recipe = day.recipe;
  const statusKey = day.status || 'planned';
  const status = statusMeta[statusKey] || statusMeta.planned;
  const notesText = typeof recipe?.notes === 'string' ? recipe.notes : '';
  const prepTimeNote = extractFromNotes(notesText, 'Prep Time');
  const familiarityNote = extractFromNotes(notesText, 'Familiarity');
  const totalCost = recipe?.total_cost ?? recipe?.totalCost ?? null;
  const costPerServing = recipe?.cost_per_serving ?? recipe?.costPerServing ?? null;
  const servings = recipe?.servings ?? recipe?.serving_size ?? null;
  const actionable = Boolean(recipe);
  const isSafeRecipe = notesText.toLowerCase().includes('safe recipe');

  const nextStatusLabel = statusKey === 'planned'
    ? 'Mark Shopped'
    : statusKey === 'shopped'
      ? 'Mark Complete'
      : 'Reset to Planned';

  const handleStatusAdvance = (event) => {
    event.stopPropagation();
    if (actionable) {
      onUpdateStatus?.();
    }
  };

  return (
    <article
      className={`
        flex min-h-[101px] items-stretch border-b border-border-subtle transition-colors
        ${isToday ? 'bg-surface-card' : 'bg-surface-page'}
        ${actionable ? 'hover:bg-surface-card cursor-pointer focus-within:ring-2 focus-within:ring-border-focus focus-within:ring-offset-2' : ''}
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
      <DayChip dayName={dayName} isToday={isToday} />

      <div className="flex flex-1 flex-col justify-center gap-2 px-4 py-3">
        {actionable ? (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <h3 className="text-lg font-semibold text-text-body truncate">
                {recipe.name}
              </h3>
              <div className="flex flex-wrap items-center gap-2 text-xs text-icon-subtle">
                <Badge variant={status.variant}>{status.label}</Badge>
                {isSafeRecipe && <Badge variant="success">Safe Favorite</Badge>}
                {prepTimeNote && <Badge>{prepTimeNote}</Badge>}
                {familiarityNote && <Badge variant="default">{familiarityNote}</Badge>}
                {totalCost != null && (
                  <span>Total {formatCurrency(totalCost)}</span>
                )}
                {costPerServing != null && servings && (
                  <span>{formatCurrency(costPerServing)} / serving</span>
                )}
              </div>
            </div>
            <button
              className="text-xs text-icon-subtle hover:text-icon-focus underline focus:outline-none focus:ring-2 focus:ring-border-focus focus:ring-offset-2 rounded"
              onClick={handleStatusAdvance}
              aria-label={`${nextStatusLabel} for ${recipe.name}`}
            >
              {nextStatusLabel}
            </button>
          </div>
        ) : day.isLeftoverNight ? (
          <div>
            <h3 className="text-lg font-semibold text-icon-subtle">Leftover Night</h3>
            <p className="text-xs text-icon-subtle mt-1">No cooking needed - enjoy leftovers or order pizza!</p>
          </div>
        ) : day.isOrderOutNight ? (
          <h3 className="text-lg font-semibold text-icon-subtle">Order Out (guilt-free!)</h3>
        ) : (
          <h3 className="text-lg font-semibold text-text-disabled">No meal planned</h3>
        )}

        {actionable && recipe?.source_url && (
          <p className="text-xs text-icon-subtle truncate">
            {recipe.source_url.replace(/^https?:\/\//, '')}
          </p>
        )}
      </div>
    </article>
  );
}
