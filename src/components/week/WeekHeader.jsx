import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';

export function WeekHeader({label, onPrev, onNext}) {
  return (
    <div className="flex items-center justify-between bg-surface-inverse px-4 py-3 text-text-inverse">
      <button
        type="button"
        onClick={onPrev}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-text-inverse hover:bg-surface-inverted-hover/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface-inverse"
        aria-label="Previous week"
      >
        <IconChevronLeft className="h-5 w-5" strokeWidth={1.75} />
      </button>
      <h2 className="text-xl font-semibold leading-8 tracking-wide text-center">{label}</h2>
      <button
        type="button"
        onClick={onNext}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-text-inverse hover:bg-surface-inverted-hover/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface-inverse"
        aria-label="Next week"
      >
        <IconChevronRight className="h-5 w-5" strokeWidth={1.75} />
      </button>
    </div>
  );
}


