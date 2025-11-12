import { Checkbox } from '../ui/Checkbox';
import { formatQuantity } from '../../utils/textFormat';

const buildLabel = (entry) => {
  const labelParts = [
    formatQuantity(entry.quantity, entry.unit),
    entry.ingredient?.item || entry.ingredient_name || 'Ingredient',
  ].filter(Boolean);

  return labelParts.join(' ');
};

export function IngredientList({
  items = [],
  checked = new Set(),
  onToggle,
  interactive = true,
  columns = 1,
}) {
  if (!items.length) {
    return <p className="text-icon-subtle">No ingredients listed for this recipe.</p>;
  }

  if (!interactive) {
    const gridClass =
      columns >= 2
        ? 'grid grid-cols-2 gap-x-6 gap-y-2'
        : 'grid grid-cols-1 gap-y-2';

    return (
      <div className={gridClass}>
        {items.map((entry) => (
          <div key={entry.id} className="flex items-start gap-2 text-sm text-text-body">
            <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-text-body" aria-hidden />
            <span>{buildLabel(entry)}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((entry) => (
        <Checkbox
          key={entry.id}
          checked={checked.has(entry.id)}
          onChange={() => onToggle?.(entry.id)}
          className="w-full rounded-xl border border-border-subtle bg-surface-card px-3 py-2 text-sm font-medium text-text-body shadow-sm transition hover:border-border-focus"
          label={buildLabel(entry)}
        />
      ))}
    </div>
  );
}

