export const WEEK_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const MONDAY_FIRST_SEQUENCE = [1, 2, 3, 4, 5, 6, 0];
const DAY_ORDER_MAP = MONDAY_FIRST_SEQUENCE.reduce((acc, dayIndex, position) => {
  acc[dayIndex] = position;
  return acc;
}, {});

export const getDayName = (index) => WEEK_DAYS[index] || WEEK_DAYS[0];

function getDayIndex(day) {
  if (typeof day?.day_of_week === 'number') {
    return day.day_of_week;
  }
  if (typeof day?.dayName === 'string') {
    const matchIndex = WEEK_DAYS.findIndex(
      (weekDay) => weekDay.toLowerCase() === day.dayName.toLowerCase()
    );
    if (matchIndex !== -1) {
      return matchIndex;
    }
  }
  return 0;
}

export function sortDaysMondayFirst(days = []) {
  return [...days].sort((a, b) => {
    const aIndex = getDayIndex(a);
    const bIndex = getDayIndex(b);
    const aOrder = DAY_ORDER_MAP[aIndex] ?? DAY_ORDER_MAP[0];
    const bOrder = DAY_ORDER_MAP[bIndex] ?? DAY_ORDER_MAP[0];
    return aOrder - bOrder;
  });
}

