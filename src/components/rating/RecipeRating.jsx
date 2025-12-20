import { useState } from 'react';
import { StarIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarIconOutline } from '@heroicons/react/24/outline';

export function RecipeRating({ rating, onChange, readOnly = false, size = "md" }) {
  const [hoverRating, setHoverRating] = useState(0);

  const starSize = size === "sm" ? "h-4 w-4" : "h-8 w-8";

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          className={`${readOnly ? 'cursor-default' : 'cursor-pointer'} transition-colors`}
          onMouseEnter={() => !readOnly && setHoverRating(star)}
          onMouseLeave={() => !readOnly && setHoverRating(0)}
          onClick={() => !readOnly && onChange(star)}
        >
          {star <= (hoverRating || rating) ? (
            <StarIcon className={`${starSize} text-yellow-400`} />
          ) : (
            <StarIconOutline className={`${starSize} text-gray-300`} />
          )}
        </button>
      ))}
    </div>
  );
}

