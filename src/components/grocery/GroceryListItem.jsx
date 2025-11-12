import { Checkbox } from '../ui/Checkbox';
import { formatCurrency } from '../../utils/numberFormat';
import { formatQuantity } from '../../utils/textFormat';

/**
 * Individual grocery list item with checkbox, quantity, and cost
 * 
 * @param {object} item - Grocery item data
 * @param {function} onToggle - Toggle handler for purchased state
 */
export function GroceryListItem({ item, onToggle }) {
  const isPurchased = item.is_purchased || false;
  const quantityDisplay = formatQuantity(item.quantity_needed, item.unit);
  const itemName = item.ingredient?.item || item.notes || 'Unnamed item';
  const cost = item.estimated_cost != null ? formatCurrency(item.estimated_cost) : '—';
  const pantryNote = item.pantry_quantity ? `${item.pantry_quantity} in pantry` : null;

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border border-border-subtle bg-surface-card px-3 py-3 shadow-sm transition-opacity ${
        isPurchased ? 'opacity-60' : 'opacity-100'
      }`}
    >
      <Checkbox
        checked={isPurchased}
        onChange={(checked) => onToggle?.(item.id, checked)}
        id={`grocery-item-${item.id}`}
        className="mt-1 flex-shrink-0"
        aria-label={`Mark ${itemName} as purchased`}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <label
          htmlFor={`grocery-item-${item.id}`}
          className={`cursor-pointer ${
            isPurchased ? 'line-through text-icon-subtle' : 'text-text-body'
          }`}
        >
          <p className={`text-sm font-semibold ${isPurchased ? 'line-through text-icon-subtle' : 'text-text-body'}`}>
            {itemName}
          </p>
        </label>
        {(quantityDisplay || pantryNote) && (
          <p className="text-xs text-icon-subtle">
            {quantityDisplay}
            {quantityDisplay && pantryNote ? ' • ' : ''}
            {pantryNote}
          </p>
        )}
      </div>
      <span
        className={`text-sm font-semibold flex-shrink-0 ${
          isPurchased ? 'line-through text-icon-subtle' : 'text-text-body'
        }`}
      >
        {cost}
      </span>
    </div>
  );
}

