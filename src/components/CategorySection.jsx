import { GroceryListItem } from './grocery/GroceryListItem';

const CATEGORY_META = {
  Produce: {
    emoji: '🥦',
    location: 'Front Left',
    accent: 'bg-apple-50',
  },
  Meat: {
    emoji: '🥩',
    location: 'Back Left',
    accent: 'bg-tomato-50',
  },
  Dairy: {
    emoji: '🧀',
    location: 'Back Right',
    accent: 'bg-strawberry-50',
  },
  Pantry: {
    emoji: '🍞',
    location: 'Center Aisles',
    accent: 'bg-lemon-50',
  },
  Frozen: {
    emoji: '🧊',
    location: 'Middle Right',
    accent: 'bg-blueberry-50',
  },
  Bakery: {
    emoji: '🥐',
    location: 'Center Aisles',
    accent: 'bg-clementine-50',
  },
};

/**
 * CategorySection Component
 * 
 * Uses design tokens for typography, colors, and spacing.
 */
export function CategorySection({ category, items = [], onToggle }) {
  if (!items.length) return null;

  const meta = CATEGORY_META[category.name] || {
    emoji: '📦',
    location: category.location || 'Various',
    accent: 'bg-blueberry-50',
  };

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface-card px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${meta.accent}`}>
            <span className="text-2xl" aria-hidden>
              {meta.emoji}
            </span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-body">{category.name}</h2>
            <p className="text-xs font-medium uppercase tracking-wide text-icon-subtle">{meta.location}</p>
          </div>
        </div>
        <span className="text-xs font-medium uppercase tracking-wide text-icon-subtle">
          {items.length} item{items.length === 1 ? '' : 's'}
        </span>
      </header>

      <div className="space-y-2">
        {items.map((item) => (
          <GroceryListItem key={item.id} item={item} onToggle={onToggle} />
        ))}
      </div>
    </section>
  );
}
