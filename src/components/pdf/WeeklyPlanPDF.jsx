import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { formatWeekRange } from '../../utils/dateHelpers';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 12,
    fontFamily: 'Helvetica',
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    fontWeight: 'bold',
  },
  weekOf: {
    fontSize: 14,
    marginBottom: 30,
  },
  table: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  tableRow: {
    display: 'flex',
    flexDirection: 'row',
    borderBottom: '1pt solid #e5e5e5',
    paddingVertical: 8,
  },
  dayCell: {
    width: '30%',
    fontWeight: 'bold',
  },
  mealCell: {
    width: '70%',
    paddingLeft: 10,
  },
  leftoverText: {
    fontStyle: 'italic',
    color: '#666',
  },
});

/**
 * Weekly Meal Plan PDF Component
 * Matches the format: "This Week's Meals" with a table of days and meals
 */
export function WeeklyPlanPDF({ mealPlan, weekStartDate }) {
  const weekRange = formatWeekRange(weekStartDate);
  
  // Day names in Monday-first order for display
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  // Map database day_of_week (0=Sunday, 1=Monday, ..., 6=Saturday) to Monday-first index
  // day_of_week 0 (Sunday) → PDF index 6
  // day_of_week 1 (Monday) → PDF index 0
  // day_of_week 2 (Tuesday) → PDF index 1
  // etc.
  const dayOfWeekToIndex = (dayOfWeek) => {
    if (dayOfWeek === 0) return 6; // Sunday → last position
    return dayOfWeek - 1; // Monday (1) → 0, Tuesday (2) → 1, etc.
  };
  
  // Create a map of PDF index (Monday-first) to meal
  const mealMap = new Map();
  if (mealPlan?.days) {
    mealPlan.days.forEach((day) => {
      const dayOfWeek = day.day_of_week !== undefined ? day.day_of_week : 0;
      const pdfIndex = dayOfWeekToIndex(dayOfWeek);
      
      if (day.is_leftover_night || day.recipe === null || !day.recipe) {
        mealMap.set(pdfIndex, 'Leftovers');
      } else if (day.recipe?.name) {
        mealMap.set(pdfIndex, day.recipe.name);
      } else {
        mealMap.set(pdfIndex, '');
      }
    });
  }

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View>
          <Text style={styles.title}>This Week&apos;s Meals</Text>
          <Text style={styles.weekOf}>Week of: {weekRange}</Text>
          
          <View style={styles.table}>
            {dayNames.map((dayName, index) => {
              const meal = mealMap.get(index) || '';
              const isLeftover = meal === 'Leftovers' || meal === '';
              
              return (
                <View key={dayName} style={styles.tableRow}>
                  <Text style={styles.dayCell}>{dayName}</Text>
                  <Text style={[styles.mealCell, isLeftover && styles.leftoverText]}>
                    {meal || ''}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </Page>
    </Document>
  );
}

