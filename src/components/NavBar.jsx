import { IconMenu2 } from '@tabler/icons-react';
import favicon32 from '/favicon-32x32.png';

/**
 * NavBar Component
 * 
 * Built from Figma design specifications using design tokens.
 * Uses semantic color tokens and typography tokens.
 * 
 * @param {function} onMenuClick - Handler for menu button click
 * @param {boolean} showCopy - Whether to show "Meal Planner" text (default: true)
 */
export function NavBar({ onMenuClick, showCopy = true }) {
  // Design tokens from Figma:
  // - Background: surface/focus (#5cb4f3 - blueberry.500)
  // - Padding: px-6 (24px), py-3 (12px - Spacing/3)
  // - Gap: gap-3 (12px - Spacing/3)
  // - Favicon: 32px (h-8 w-8)
  // - Typography: text-3xl font-semibold (30px, semibold, line-height 40px)
  // - Text color: text-display (#0c0a09)
  // - Icon: 24px (h-6 w-6), icon-display color (#1c1917)

  return (
    <div className="flex items-center gap-3 bg-surface-focus px-6 py-3 w-full">
      {/* Favicon - 32px from Figma */}
      <img
        src={favicon32}
        alt="Aldi Meal Planner logo"
        className="h-8 w-8 shrink-0"
      />
      
      {/* Title - text-3xl/font-semibold from Figma */}
      {showCopy && (
        <span className="flex-1 text-3xl font-semibold text-text-display leading-10 min-w-0">
          Meal Planner
        </span>
      )}
      
      {/* Menu Button - 24px icon from Figma */}
      <button
        type="button"
        onClick={onMenuClick}
        className="inline-flex h-6 w-6 items-center justify-center shrink-0 text-icon-display transition-colors hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2"
        aria-label="Open navigation menu"
      >
        <IconMenu2 className="h-6 w-6" strokeWidth={1.75} />
      </button>
    </div>
  );
}
