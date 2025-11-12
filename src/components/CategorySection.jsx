import { GroceryListItem } from './grocery/GroceryListItem';

const CATEGORY_META = {
  Produce: {
    iconFile: 'food icon=broccoli.png',
    location: 'Front Left',
    accent: 'bg-apple-100',
  },
  Meat: {
    iconFile: 'food icon=steak.png',
    location: 'Back Left',
    accent: 'bg-tomato-100',
  },
  Dairy: {
    iconFile: 'food icon=cheese.png',
    location: 'Back Right',
    accent: 'bg-strawberry-100',
  },
  Pantry: {
    iconFile: 'food icon=bread-02.png',
    location: 'Center Aisles',
    accent: 'bg-lemon-100',
  },
  Frozen: {
    iconFile: 'food icon=ice-cream-02.png',
    location: 'Middle Right',
    accent: 'bg-blueberry-100',
  },
  Bakery: {
    iconFile: 'food icon=croissant.png',
    location: 'Center Aisles',
    accent: 'bg-clementine-100',
  },
};

function encodePublicPath(file) {
  if (!file) return null;
  return `/icons/food-icons/${encodeURIComponent(file)}`;
}

export function CategorySection({ category, items = [], onToggle }) {
  if (!items.length) return null;

  const meta = CATEGORY_META[category.name] || {
    iconFile: 'food icon=organic-food.png',
    location: category.location || 'Various',
    accent: 'bg-blueberry-50',
  };

  const iconSrc = encodePublicPath(meta.iconFile);

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between rounded-2xl border border-border-subtle bg-surface-card px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${meta.accent}`}>
            {iconSrc ? (
              <img src={iconSrc} alt="" className="h-8 w-8 object-contain" />
            ) : (
              <span className="text-xl" aria-hidden>
                📦
              </span>
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-body">{category.name}</h2>
            <p className="text-xs uppercase tracking-wide text-icon-subtle">{meta.location}</p>
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
