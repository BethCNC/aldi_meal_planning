import { useEffect, useMemo, useState } from 'react';
import { Badge } from '../ui/Badge';
import { formatCurrency } from '../../utils/numberFormat';

const FALLBACK_IMAGE = '/icons/food-icons/food%20icon=natural-food.png';

export function RecipeHeader({recipe, showMeta = true, className = ''}) {
  const {
    name,
    category,
    total_cost,
    cost_per_serving,
    servings,
    time,
    image_url,
    tags,
    notes,
  } = recipe || {};

  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [hasImageError, setHasImageError] = useState(false);

  const tagList = useMemo(() => {
    if (Array.isArray(tags)) return tags;
    if (typeof tags === 'string') {
      return tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
    }
    return [];
  }, [tags]);

  useEffect(() => {
    setIsImageLoaded(false);
    setHasImageError(false);
  }, [image_url]);

  const resolvedImage = hasImageError ? FALLBACK_IMAGE : image_url || FALLBACK_IMAGE;

  const isSafe = typeof notes === 'string' && notes.toLowerCase().includes('safe recipe');

  if (!showMeta) {
    return (
      <div className={`relative overflow-hidden rounded-3xl border border-border-subtle bg-surface-card shadow-lg ${className}`}>
        {!isImageLoaded && (
          <div className="absolute inset-0 animate-pulse bg-surface-primary/40" aria-hidden />
        )}
        <img
          src={resolvedImage}
          alt={name ? `${name} plated meal` : 'Recipe preview'}
          loading="lazy"
          onLoad={() => setIsImageLoaded(true)}
          onError={() => setHasImageError(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
            isImageLoaded && !hasImageError ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <div className="relative h-full w-full pb-[57%]" aria-hidden />
      </div>
    );
  }

  return (
    <header className={`space-y-4 ${className}`}>
      <div className="relative overflow-hidden rounded-3xl border border-border-subtle bg-surface-card shadow-lg">
        {!isImageLoaded && (
          <div className="absolute inset-0 animate-pulse bg-surface-primary/40" aria-hidden />
        )}
        <div className="absolute inset-0 bg-surface-inverse/80" />
        <img
          src={resolvedImage}
          alt={name ? `${name} plated meal` : 'Recipe preview'}
          loading="lazy"
          onLoad={() => setIsImageLoaded(true)}
          onError={() => setHasImageError(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
            isImageLoaded && !hasImageError ? 'opacity-40' : 'opacity-0'
          }`}
        />
        <div className="relative space-y-4 px-5 py-6 text-text-inverse">
          <div className="flex items-center gap-2">
            {category && <Badge variant="secondary">{category}</Badge>}
            {isSafe && <Badge variant="success">Safe Favorite</Badge>}
          </div>
          <h1 className="text-3xl font-semibold leading-8">{name}</h1>
          <div className="flex flex-wrap gap-3 text-sm font-medium text-text-inverse/80">
            <span>⏱ {time ? `${time} min` : '45 min'}</span>
            {servings && <span>🍽 {servings} servings</span>}
            {cost_per_serving != null && (
              <span>💵 {formatCurrency(cost_per_serving)}/serving</span>
            )}
            {total_cost != null && <span>Total {formatCurrency(total_cost)}</span>}
          </div>
          {tagList.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tagList.map((tag) => (
                <Badge key={tag} variant="outline" className="border-text-inverse/40 text-text-inverse">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}


