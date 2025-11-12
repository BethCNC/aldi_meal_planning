import { useNavigate } from 'react-router-dom';
import { Badge } from './ui/Badge';

const dayAbbreviations = {
  'Monday': 'M',
  'Tuesday': 'T',
  'Wednesday': 'W',
  'Thursday': 'Th',
  'Friday': 'F',
  'Saturday': 'S',
  'Sunday': 'Su',
};

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
  const dayName = day.dayName || ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day.day_of_week || 0];
  const dayAbbr = dayAbbreviations[dayName] || 'M';
  const dayBgClass = `bg-day-${(dayName || 'Monday').toLowerCase()}`;
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
    <div
      className={`
        flex items-start gap-4 p-4 border-b border-border-subtle transition-colors
        ${isToday ? 'bg-surface-card' : 'bg-surface-page'}
        ${actionable ? 'hover:bg-surface-card cursor-pointer' : ''}
      `}
      onClick={() => actionable && navigate(`/recipe/${recipe.id}`)}
    >
      <div
        className={`w-12 h-12 rounded-lg flex items-center justify-center text-text-inverse font-bold text-lg flex-shrink-0 ${dayBgClass}`}
      >
        {dayAbbr}
      </div>

      <div className="flex-1 min-w-0 space-y-2">
        {actionable ? (
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-text-body truncate">
                {recipe.name}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-icon-subtle">
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
              className="text-xs text-icon-subtle hover:text-icon-focus underline"
              onClick={handleStatusAdvance}
            >
              {nextStatusLabel}
            </button>
          </div>
        ) : day.isLeftoverNight ? (
          <h3 className="text-base font-semibold text-icon-subtle">Leftover Night or Pizza</h3>
        ) : day.isOrderOutNight ? (
          <h3 className="text-base font-semibold text-icon-subtle">Order Out (guilt-free!)</h3>
        ) : (
          <h3 className="text-base font-semibold text-text-disabled">No meal planned</h3>
        )}

        {actionable && recipe?.source_url && (
          <p className="text-xs text-icon-subtle truncate">
            {recipe.source_url.replace(/^https?:\/\//, '')}
          </p>
        )}
      </div>
    </div>
  );
}
