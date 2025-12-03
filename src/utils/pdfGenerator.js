import { pdf } from '@react-pdf/renderer';
import React from 'react';
import { WeeklyPlanPDF } from '../components/pdf/WeeklyPlanPDF';

/**
 * Generate and download a weekly meal plan PDF
 * @param {Object} mealPlan - The meal plan data
 * @param {string} weekStartDate - ISO date string for week start
 */
export async function generateWeeklyPlanPDF(mealPlan, weekStartDate) {
  try {
    // Create PDF document using React.createElement
    const doc = React.createElement(WeeklyPlanPDF, { mealPlan, weekStartDate });
    
    // Generate PDF blob
    const blob = await pdf(doc).toBlob();
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Generate filename: "nov 24-30.pdf" format
    const start = new Date(weekStartDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    
    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const month = monthNames[start.getMonth()];
    const startDay = start.getDate();
    const endDay = end.getDate();
    
    const filename = `${month} ${startDay}-${endDay}.pdf`;
    link.download = filename;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    URL.revokeObjectURL(url);
    
    return filename;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error(`Failed to generate PDF: ${error.message}`);
  }
}

