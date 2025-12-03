# PDF Generation Requirements - Aldi Meal Planner

**Date:** January 2025  
**Status:** CRITICAL GAP - PDF generation not yet implemented  
**Priority:** HIGH - Core deliverable for the app

---

## 🎯 Core Goal

**The ultimate goal of this app is to produce printable PDF files (letter size, 8.5" x 11") containing:**

1. **Weekly Meal Plan** - A clean, printable menu showing the week's dinners
2. **Grocery List** - A printable shopping list organized by store category

---

## 📋 Current State Analysis

### ✅ What EXISTS

**Web App:**
- Weekly meal plan view (`WeeklyPlanView.jsx`)
- Grocery list view (`GroceryListView.jsx`)
- Both display data correctly in the browser

**Backend Scripts:**
- `scripts/generate-grocery-list.js` - Generates text file output
- Meal plan generation working
- Grocery list generation working

**Data:**
- Meal plans stored in Supabase
- Grocery lists stored in Supabase
- All data needed for PDFs is available

### ❌ What's MISSING

**PDF Generation:**
- No PDF generation library installed
- No PDF generation functions
- No "Print" or "Export PDF" buttons in UI
- No letter-size (8.5" x 11") formatting
- No print-optimized layouts

**Current Output:**
- Grocery list: Text file only (`grocery-list.txt`)
- Meal plan: Web view only (no export)

---

## 📐 PDF Requirements

### **Weekly Meal Plan PDF**

**Format:**
- Letter size: 8.5" x 11"
- Portrait orientation
- Print-friendly margins (0.5" minimum)
- Single page (if possible) or clean multi-page

**Content:**
- Week header: "Week of [Start Date] - [End Date]"
- Budget summary: "Budget: $X.XX | Actual: $X.XX"
- Daily schedule:
  - Monday: [Recipe Name] - $X.XX
  - Tuesday: [Recipe Name] - $X.XX
  - Wednesday: Leftover Night
  - Thursday: [Recipe Name] - $X.XX
  - Friday: Leftover Night
  - Saturday: [Recipe Name] - $X.XX
  - Sunday: Leftover Night
- Recipe details (optional): Brief notes per meal
- Footer: Generated date/time

**Design:**
- Use design system colors and typography
- Clear visual hierarchy
- Checkboxes for "cooked" tracking (optional)
- Clean, minimal layout

### **Grocery List PDF**

**Format:**
- Letter size: 8.5" x 11"
- Portrait orientation
- Print-friendly margins
- Single page preferred, multi-page if needed

**Content:**
- Header: "Week of [Date]" and "Estimated Total: $X.XX"
- Categories (grouped by store layout):
  - Produce (Front Left)
  - Meat (Back Left)
  - Dairy (Back Right)
  - Pantry (Center Aisles)
  - Frozen (Middle Right)
  - Bakery (if applicable)
- Each item:
  - Checkbox for shopping
  - Item name
  - Quantity/package info
  - Unit price (optional)
  - Total price
- "Already Have" section (if applicable)
- Footer: Total cost, savings from pantry

**Design:**
- Checkboxes for shopping
- Category headers with icons/colors
- Clear spacing between items
- Price totals per category (optional)
- Print-optimized (no colors that won't print well)

---

## 🛠️ Implementation Plan

### **Phase 1: Install PDF Library**

**Option A: jsPDF (Recommended for simplicity)**
```bash
npm install jspdf
```

**Option B: PDFKit (More control, more complex)**
```bash
npm install pdfkit
```

**Option C: React-PDF (React-friendly)**
```bash
npm install @react-pdf/renderer
```

**Recommendation:** Use `@react-pdf/renderer` since this is a React app. It allows creating PDFs using React components, which aligns with the existing codebase.

### **Phase 2: Create PDF Components**

**Files to create:**
1. `src/components/pdf/WeeklyPlanPDF.jsx` - PDF component for meal plan
2. `src/components/pdf/GroceryListPDF.jsx` - PDF component for grocery list
3. `src/utils/pdfGenerator.js` - Utility functions for PDF generation

### **Phase 3: Add Export Buttons**

**Update existing views:**
1. `WeeklyPlanView.jsx` - Add "Export PDF" button
2. `GroceryListView.jsx` - Add "Export PDF" button

**Button placement:**
- Top-right of each view
- Next to existing "Generate" buttons
- Clear icon + text: "Export PDF"

### **Phase 4: PDF Generation Functions**

**Functions needed:**
```javascript
// src/utils/pdfGenerator.js
export async function generateWeeklyPlanPDF(weekStartDate) {
  // Fetch meal plan data
  // Render PDF component
  // Download PDF file
}

export async function generateGroceryListPDF(weekStartDate) {
  // Fetch grocery list data
  // Render PDF component
  // Download PDF file
}
```

---

## 📝 Technical Specifications

### **PDF Library: @react-pdf/renderer**

**Why:**
- React-native approach (fits existing codebase)
- Component-based (reusable design system)
- Good TypeScript support
- Active maintenance
- Letter size support built-in

**Installation:**
```bash
npm install @react-pdf/renderer
```

**Basic Usage:**
```javascript
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 12,
    fontFamily: 'Plus Jakarta Sans',
  },
  // ... more styles
});

const WeeklyPlanPDF = ({ mealPlan }) => (
  <Document>
    <Page size="LETTER" style={styles.page}>
      <View>
        <Text>Week of {weekStartDate}</Text>
        {/* Meal plan content */}
      </View>
    </Page>
  </Document>
);
```

### **Design System Integration**

**Colors:**
- Use design tokens from `tokens.json`
- Convert to RGB for PDF (PDF doesn't support CSS variables)
- Ensure print-friendly contrast

**Typography:**
- Use Plus Jakarta Sans font (already loaded)
- Map design system font sizes to PDF sizes
- Maintain hierarchy (headings, body, labels)

**Spacing:**
- Use design system spacing tokens
- Ensure margins/padding work for letter size
- Test print margins (0.5" minimum)

---

## 🎨 PDF Layout Specifications

### **Weekly Meal Plan Layout**

```
┌─────────────────────────────────────────┐
│  Week of January 27 - February 2, 2025 │
│  Budget: $75.00 | Actual: $68.42        │
├─────────────────────────────────────────┤
│                                         │
│  Monday                                 │
│  🍽️ Chicken Stir-Fry                    │
│  $9.50 • 40 min • 4 servings           │
│                                         │
│  Tuesday                                │
│  🍽️ Beef Tacos                          │
│  $11.20 • 30 min • 4 servings          │
│                                         │
│  Wednesday                              │
│  ♻️ Leftover Night                      │
│                                         │
│  Thursday                               │
│  🍽️ Spaghetti & Meat Sauce              │
│  $8.80 • 45 min • 4 servings           │
│                                         │
│  Friday                                 │
│  ♻️ Leftover Night                      │
│                                         │
│  Saturday                               │
│  🍽️ Sheet Pan Sausage                  │
│  $9.90 • 35 min • 4 servings           │
│                                         │
│  Sunday                                 │
│  ♻️ Leftover Night                      │
│                                         │
│  Generated: January 26, 2025            │
└─────────────────────────────────────────┘
```

### **Grocery List Layout**

```
┌─────────────────────────────────────────┐
│  Week of January 27, 2025               │
│  Estimated Total: $68.42                │
├─────────────────────────────────────────┤
│                                         │
│  🥦 PRODUCE (Front Left)                │
│  ┌───────────────────────────────────┐ │
│  │ ☐ Bell Peppers (3)        $3.00   │ │
│  │ ☐ Onions (1 bag)          $2.50   │ │
│  │ ☐ Tomatoes (2 pkg)        $3.00   │ │
│  └───────────────────────────────────┘ │
│                                         │
│  🥩 MEAT (Back Left)                    │
│  ┌───────────────────────────────────┐ │
│  │ ☐ Chicken Breast (2 pkg)  $12.00  │ │
│  │ ☐ Ground Beef (1.5 lb)    $7.50   │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ... (more categories)                  │
│                                         │
│  ✅ Already Have                        │
│  • Rice (saved $3.50)                   │
│                                         │
│  Total: $68.42                          │
│  Savings: $3.50                         │
└─────────────────────────────────────────┘
```

---

## ✅ Success Criteria

**PDF Generation Complete When:**
- [ ] Can generate weekly meal plan PDF (letter size)
- [ ] Can generate grocery list PDF (letter size)
- [ ] PDFs use design system colors and typography
- [ ] PDFs are print-optimized (proper margins, readable)
- [ ] "Export PDF" buttons work in both views
- [ ] PDFs download with descriptive filenames
- [ ] PDFs render correctly when printed
- [ ] Single-page PDFs when possible (multi-page if needed)

---

## 🚀 Implementation Steps

### **Step 1: Install Dependencies**
```bash
npm install @react-pdf/renderer
```

### **Step 2: Create PDF Components**
- Create `src/components/pdf/` directory
- Build `WeeklyPlanPDF.jsx`
- Build `GroceryListPDF.jsx`

### **Step 3: Create PDF Generator Utility**
- Create `src/utils/pdfGenerator.js`
- Add functions to generate and download PDFs

### **Step 4: Add Export Buttons**
- Update `WeeklyPlanView.jsx`
- Update `GroceryListView.jsx`
- Add click handlers

### **Step 5: Test & Refine**
- Test PDF generation
- Test printing
- Refine layouts
- Ensure design system compliance

---

## 📚 References

**React-PDF Documentation:**
- https://react-pdf.org/
- https://react-pdf.org/styling

**Design System:**
- `tokens.json` - Color and typography tokens
- `tailwind.config.js` - Design system configuration

**Existing Components:**
- `src/pages/WeeklyPlanView.jsx` - Data source for meal plan PDF
- `src/pages/GroceryListView.jsx` - Data source for grocery list PDF

---

## 🎯 Priority

**HIGH** - This is the core deliverable. The app's value is in producing printable PDFs that users can take shopping and reference throughout the week.

**Without PDF generation, the app is incomplete.**

---

**Next Action:** Install `@react-pdf/renderer` and begin building PDF components.

