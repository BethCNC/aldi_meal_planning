const DAY_CONFIG = {
  Sunday: {abbr: 'Su', className: 'bg-surface-day-Sunday'},
  Monday: {abbr: 'M', className: 'bg-surface-day-Monday'},
  Tuesday: {abbr: 'T', className: 'bg-surface-day-Tuesday'},
  Wednesday: {abbr: 'W', className: 'bg-surface-day-Wednesday'},
  Thursday: {abbr: 'Th', className: 'bg-surface-day-Thursday'},
  Friday: {abbr: 'F', className: 'bg-surface-day-Friday'},
  Saturday: {abbr: 'S', className: 'bg-surface-day-Saturday'},
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
      className={`relative flex w-full shrink-0 flex-col items-center justify-center border-b-2 border-border-body py-2 ${
        colorClass || ''
      } ${className}`}
      data-day-chip={dayName}
      aria-label={isToday ? `${dayName} (today)` : dayName}
    >
      <span className="text-2xl font-bold text-text-display leading-tight">{abbr}</span>
      <span className="sr-only">{dayName}</span>
    </div>
  );
}


