import { IconMenu2 } from '@tabler/icons-react';
import favicon32 from '/favicon-32x32.png';

export function NavBar({ onMenuClick }) {
  return (
    <div className="flex h-14 items-center justify-between bg-surface-focus px-4 text-text-inverse md:h-16 md:px-6">
      <div className="flex items-center gap-2 md:gap-3">
        <img
          src={favicon32}
          alt="Aldi Meal Planner logo"
          className="h-9 w-9 md:h-10 md:w-10"
        />
        <span className="hidden text-lg font-semibold text-text-display md:block md:text-2xl">
          Meal Planner
        </span>
      </div>
      <button
        type="button"
        onClick={onMenuClick}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-icon-display transition hover:bg-surface-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface-focus md:h-10 md:w-10"
        aria-label="Open navigation menu"
      >
        <IconMenu2 className="h-5 w-5 md:h-6 md:w-6" strokeWidth={1.75} />
      </button>
    </div>
  );
}

