import { Button } from './ui/Button';
import { Checkbox } from './ui/Checkbox';

export function PantryItemCard({ item, onToggleMustUse, onRemove }) {
  return (
    <div className="flex items-center gap-4 p-3 bg-surface-card rounded-lg border border-border-subtle">
      <span className="flex-1 text-text-body">
        {item.ingredient?.item || item.item} ({item.quantity} {item.unit})
      </span>
      <Checkbox
        label="Use first"
        checked={item.must_use || item.mustUse || false}
        onChange={(checked) => onToggleMustUse?.(item.id, checked)}
      />
      <Button variant="secondary" size="small" onClick={() => onRemove?.(item.id)}>
        Remove
      </Button>
    </div>
  );
}
