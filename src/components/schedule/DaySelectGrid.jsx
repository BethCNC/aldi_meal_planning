import { WEEK_DAYS } from '../../utils/days';

const DAY_COLORS = {
  Sunday: 'bg-surface-day-Sunday',
  Monday: 'bg-surface-day-Monday',
  Tuesday: 'bg-surface-day-Tuesday',
  Wednesday: 'bg-surface-day-Wednesday',
  Thursday: 'bg-surface-day-Thursday',
  Friday: 'bg-surface-day-Friday',
  Saturday: 'bg-surface-day-Saturday',
};

function getInitials(day) {
  if (!day) return '';
  if (day === 'Thursday') return 'Th';
  if (day === 'Saturday') return 'Sa';
  if (day === 'Sunday') return 'Su';
  return day[0];
}

export function DaySelectGrid({selectedIndex, onSelect, className = ''}) {
  return (
    <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 ${className}`}>
      {WEEK_DAYS.map((day, index) => {
        const isSelected = selectedIndex === index;
        const colorClass = DAY_COLORS[day] || 'bg-surface-primary';
        return (
          <button
            key={day}
            type="button"
            onClick={() => onSelect?.(index)}
            className={`flex flex-col items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-focus ${
              isSelected
                ? 'border-border-focus bg-surface-primary/15 text-text-body shadow-sm'
                : 'border-border-subtle bg-surface-page text-icon-subtle hover:border-border-focus hover:text-text-body'
            }`}
          >
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-full text-base font-semibold text-text-inverse ${colorClass}`}
            >
              {getInitials(day)}
            </span>
            <span>{day}</span>
          </button>
        );
      })}
    </div>
  );
}


