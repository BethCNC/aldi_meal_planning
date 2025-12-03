import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';

/**
 * WeekHeader Component
 * 
 * Header with navigation buttons for week selection.
 * Uses design tokens for typography, colors, and spacing.
 * Fully responsive typography system.
 * 
 * @param {string} label - Week label text
 * @param {function} onPrev - Handler for previous week button
 * @param {function} onNext - Handler for next week button
 * @param {string} className - Additional CSS classes
 */
export function WeekHeader({ label, onPrev, onNext, className = '' }) {
  // Design tokens:
  // - Background: surface-inverse
  // - Padding: px-6 (24px - Spacing/6), py-3 (12px - Spacing/3)
  // - Typography: Responsive - text-2xl/font-semibold on mobile, text-3xl/font-semibold on larger screens
  // - Text color: text-inverse
  // - Icon color: text-inverse
  // - Icon size: 20px (h-5 w-5) on mobile, 24px (h-6 w-6) on larger screens

  return (
    <div className={`flex items-center justify-between bg-surface-inverse px-6 py-3 text-text-inverse ${className}`}>
      <button
        type="button"
        onClick={onPrev}
        className="inline-flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-full text-text-inverse hover:bg-surface-inverse-hover/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface-inverse transition-colors"
        aria-label="Previous week"
      >
        <IconChevronLeft className="h-5 w-5 md:h-6 md:w-6" strokeWidth={1.75} />
      </button>
      
      <h2 className="text-style-text-2xl-semibold md:text-style-text-3xl-semibold text-text-inverse text-center flex-1">
        {label}
      </h2>
      
      <button
        type="button"
        onClick={onNext}
        className="inline-flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-full text-text-inverse hover:bg-surface-inverse-hover/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface-inverse transition-colors"
        aria-label="Next week"
      >
        <IconChevronRight className="h-5 w-5 md:h-6 md:w-6" strokeWidth={1.75} />
      </button>
    </div>
  );
}
