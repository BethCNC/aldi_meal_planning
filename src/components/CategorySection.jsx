import { Checkbox } from './ui/Checkbox';

export function CategorySection({ category, items, onToggle }) {
  if (!items || items.length === 0) return null;
  
  return (
    <div>
      <h2 className="text-xl font-bold mb-2 text-text-body">
        {category.icon} {category.name}
      </h2>
      <p className="text-sm text-icon-subtle mb-4">{category.location}</p>
      
      <div className="space-y-2">
        {items.map((item) => {
          const isPurchased = item.is_purchased || false;
          return (
            <div 
              key={item.id} 
              className={`flex items-center gap-4 p-3 bg-surface-card border border-border-subtle rounded-lg transition-opacity ${
                isPurchased ? 'opacity-60' : ''
              }`}
            >
              <Checkbox
                checked={isPurchased}
                onChange={(checked) => onToggle?.(item.id, checked)}
              />
              <span className={`flex-1 ${isPurchased ? 'line-through text-icon-subtle' : 'text-text-body'}`}>
                {item.ingredient?.item || item.notes} ({item.packages_to_buy || item.quantity_needed} {item.unit})
              </span>
              <span className={`font-medium ${isPurchased ? 'line-through text-icon-subtle' : 'text-text-body'}`}>
                ${item.estimated_cost?.toFixed(2) || '0.00'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
