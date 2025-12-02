const DAY_CONFIG = {
  Sunday: {abbr: 'Su', className: 'bg-day-sunday'},
  Monday: {abbr: 'M', className: 'bg-day-monday'},
  Tuesday: {abbr: 'T', className: 'bg-day-tuesday'},
  Wednesday: {abbr: 'W', className: 'bg-day-wednesday'},
  Thursday: {abbr: 'Th', className: 'bg-day-thursday'},
  Friday: {abbr: 'F', className: 'bg-day-friday'},
  Saturday: {abbr: 'S', className: 'bg-day-saturday'},
};

function getDayConfig(dayName) {
  const normalised =
    typeof dayName === 'string'
      ? dayName.charAt(0).toUpperCase() + dayName.slice(1).toLowerCase()
      : 'Monday';
  return DAY_CONFIG[normalised] || DAY_CONFIG.Monday;
}

export function DayChip({dayName, isToday = false, className = ''}) {
  const {abbr, className: colorClass} = getDayConfig(dayName);

  return (
    <div
      className={`relative flex w-24 shrink-0 flex-col items-center justify-center border-r border-border-subtle py-4 ${
        colorClass || ''
      } ${className}`}
      data-day-chip={dayName}
      aria-label={isToday ? `${dayName} (today)` : dayName}
    >
      {isToday && (
        <span className="absolute inset-y-2 left-2 right-auto w-1 rounded-full bg-surface-inverse" aria-hidden="true" />
      )}
      <span className="text-3xl font-semibold text-text-body drop-shadow-sm" aria-hidden="true">{abbr}</span>
      <span className="sr-only">{dayName}</span>
    </div>
  );
}


