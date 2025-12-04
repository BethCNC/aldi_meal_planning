# Component Documentation

**Last Updated:** 2025-11-12  
**Purpose:** Reference guide for all React components in the Aldi Meal Planner app, including props, variants, usage examples, and design token references for future responsive work.

---

## Table of Contents

1. [UI Primitives](#ui-primitives)
2. [Layout Components](#layout-components)
3. [Meal Planning Components](#meal-planning-components)
4. [Grocery Components](#grocery-components)
5. [Recipe Components](#recipe-components)
6. [Form Components](#form-components)
7. [Navigation Components](#navigation-components)

---

## UI Primitives

### Button

**Path:** `src/components/ui/Button.jsx`

**Description:** Primary button component with multiple variants and sizes.

**Props:**
- `variant` (string): `'primary' | 'secondary' | 'success' | 'ghost'` (default: `'primary'`)
- `size` (string): `'small' | 'medium' | 'large'` (default: `'medium'`)
- `className` (string): Additional CSS classes
- Standard button props (`onClick`, `disabled`, `type`, etc.)

**Design Tokens:**
- Colors: `surface-primary`, `surface-secondary`, `text-inverse`, `text-body`
- Focus: `focus:ring-2 focus:ring-icon-primary`
- Spacing: `px-4 py-2` (md), `px-3 py-1.5` (sm), `px-6 py-3` (lg)

**Usage:**
```jsx
<Button variant="primary" size="medium" onClick={handleClick}>
  Generate Meal Plan
</Button>
```

**Accessibility:** Full keyboard support, focus indicators, disabled state handling.

---

### Input

**Path:** `src/components/ui/Input.jsx`

**Description:** Text input with label, error handling, and validation states.

**Props:**
- `label` (string): Optional label text
- `error` (string): Optional error message (displays below input)
- `disabled` (boolean): Disabled state
- `id` (string): Input ID (auto-generated from label if not provided)
- Standard input props (`type`, `placeholder`, `value`, `onChange`, etc.)

**Design Tokens:**
- Border: `border-border-subtle`, `border-error` (error state)
- Background: `bg-surface-page`, `bg-error/5` (error state)
- Focus: `focus:ring-2 focus:ring-border-focus`

**Usage:**
```jsx
<Input
  label="Recipe Name"
  type="text"
  value={name}
  onChange={(e) => setName(e.target.value)}
  error={errors.name}
/>
```

**Accessibility:** Full ARIA support (`aria-invalid`, `aria-describedby`), error announcements.

---

### Checkbox

**Path:** `src/components/ui/Checkbox.jsx`

**Description:** Checkbox input with optional label.

**Props:**
- `label` (ReactNode): Optional label content
- `checked` (boolean): Checked state
- `onChange` (function): Change handler `(checked: boolean) => void`
- `className` (string): Additional CSS classes
- Standard input props (`id`, `disabled`, etc.)

**Design Tokens:**
- Color: `text-surface-primary` (checked state)
- Focus: `focus:ring-2 focus:ring-icon-focus`

**Usage:**
```jsx
<Checkbox
  label="Use pantry items first"
  checked={usePantry}
  onChange={setUsePantry}
/>
```

**Accessibility:** Proper label association, keyboard accessible.

---

### Switch

**Path:** `src/components/ui/Switch.jsx`

**Description:** Toggle switch for boolean settings.

**Props:**
- `label` (string): Optional label text
- `checked` (boolean): Checked state
- `onChange` (function): Change handler `(checked: boolean) => void`
- `disabled` (boolean): Disabled state
- `id` (string): Switch ID (auto-generated from label if not provided)

**Design Tokens:**
- Background: `bg-surface-primary` (checked), `bg-surface-elevated` (unchecked)
- Transition: `transition-colors duration-200 ease-in-out`

**Usage:**
```jsx
<Switch
  label="Enable notifications"
  checked={notifications}
  onChange={setNotifications}
/>
```

**Accessibility:** Uses `role="switch"` for proper semantics.

---

### Select

**Path:** `src/components/ui/Select.jsx`

**Description:** Native select dropdown with label and error handling.

**Props:**
- `label` (string): Optional label text
- `error` (string): Optional error message
- `disabled` (boolean): Disabled state
- `id` (string): Select ID (auto-generated from label if not provided)
- Standard select props (`value`, `onChange`, `children`, etc.)

**Design Tokens:**
- Same as Input component (border, background, focus styles)

**Usage:**
```jsx
<Select label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
  <option value="beef">Beef</option>
  <option value="chicken">Chicken</option>
</Select>
```

**Note:** For complex dropdowns with search/filtering, consider using Radix UI Select.

---

### Label

**Path:** `src/components/ui/Label.jsx`

**Description:** Form label with required indicator support.

**Props:**
- `htmlFor` (string): ID of associated input element
- `required` (boolean): Show required asterisk
- `disabled` (boolean): Disabled state styling
- `className` (string): Additional CSS classes
- `children` (ReactNode): Label content

**Design Tokens:**
- Typography: `text-sm font-semibold`
- Colors: `text-text-body`, `text-text-disabled` (disabled state)

**Usage:**
```jsx
<Label htmlFor="recipe-name" required>
  Recipe Name
</Label>
```

---

### Separator

**Path:** `src/components/ui/Separator.jsx`

**Description:** Visual divider between content sections.

**Props:**
- `orientation` (string): `'horizontal' | 'vertical'` (default: `'horizontal'`)
- `className` (string): Additional CSS classes

**Design Tokens:**
- Color: `bg-border-subtle`
- Size: `h-px` (horizontal), `w-px` (vertical)

**Usage:**
```jsx
<Separator orientation="horizontal" />
```

**Accessibility:** Uses `role="separator"` with `aria-orientation`.

---

### Badge

**Path:** `src/components/ui/Badge.jsx`

**Description:** Small status indicator badge.

**Props:**
- `variant` (string): `'default' | 'success' | 'warning' | 'error'`
- `children` (ReactNode): Badge content
- `className` (string): Additional CSS classes

**Design Tokens:**
- Background colors vary by variant
- Typography: `text-xs font-semibold`

**Usage:**
```jsx
<Badge variant="success">Safe Favorite</Badge>
```

---

## Layout Components

### Layout

**Path:** `src/components/Layout.jsx`

**Description:** Main app shell with status bar, navigation bar, and bottom navigation.

**Components:**
- `StatusBar`: Mobile status bar (decorative, `aria-hidden` icons)
- `NavBar`: Top navigation with logo and menu button
- `BottomNav`: Bottom tab navigation (rendered separately)

**Design Tokens:**
- Background: `bg-surface-page`
- Max width: `max-w-[430px]` (mobile-first)
- Padding: `pb-24` (space for bottom nav)

**Usage:**
```jsx
<Layout>
  <Outlet /> {/* React Router outlet */}
</Layout>
```

**Accessibility:** NavBar menu button has `aria-label="Open navigation menu"`.

---

### StatusBar

**Path:** `src/components/Layout.jsx` (internal component)

**Description:** Decorative iPhone status bar for mobile preview.

**Design Tokens:**
- Typography: `text-[11px] font-semibold`
- Colors: `text-text-body`, `text-icon-display`

**Note:** All status indicators are decorative (`aria-hidden="true"`).

---

### NavBar

**Path:** `src/components/Layout.jsx` (internal component)

**Description:** Top navigation bar with app logo and menu button.

**Design Tokens:**
- Background: `bg-surface-focus`
- Text: `text-text-inverse`
- Logo: `bg-surface-primary` circle with emoji

**Accessibility:** Menu button has `aria-label` and focus ring.

---

### BottomNav

**Path:** `src/components/BottomNav.jsx`

**Description:** Bottom tab navigation with 5 items (Home, Meals, Groceries, Recipes, Settings).

**Props:** None (uses React Router `useLocation` internally)

**Design Tokens:**
- Active tab: `bg-surface-primary text-text-display`
- Inactive tab: `text-icon-subtle`
- Focus: `focus:ring-2 focus:ring-border-focus`

**Usage:**
```jsx
<BottomNav /> {/* Rendered in Layout */}
```

**Accessibility:** 
- `aria-label="Main navigation"`
- `aria-current="page"` on active tab
- `aria-hidden="true"` on decorative icons

---

## Meal Planning Components

### WeekHeader

**Path:** `src/components/week/WeekHeader.jsx`

**Description:** Week range display with previous/next navigation buttons.

**Props:**
- `label` (string): Week range text (e.g., "Week of Nov 4-10, 2025")
- `onPrev` (function): Previous week handler
- `onNext` (function): Next week handler

**Design Tokens:**
- Background: `bg-surface-inverse`
- Text: `text-text-inverse`
- Buttons: `hover:bg-surface-primary/20`, focus rings

**Usage:**
```jsx
<WeekHeader
  label="Week of Nov 4-10, 2025"
  onPrev={() => changeWeek(-1)}
  onNext={() => changeWeek(1)}
/>
```

**Accessibility:** Navigation buttons have `aria-label` attributes.

---

### DayChip

**Path:** `src/components/week/DayChip.jsx`

**Description:** Color-coded day abbreviation badge.

**Props:**
- `dayName` (string): Full day name (e.g., "Monday")
- `isToday` (boolean): Highlight today indicator
- `className` (string): Additional CSS classes

**Design Tokens:**
- Background: `bg-day-monday` through `bg-day-sunday` (from `surface.day.*`)
- Text: `text-text-inverse`
- Typography: `text-3xl font-semibold`

**Usage:**
```jsx
<DayChip dayName="Monday" isToday={true} />
```

**Accessibility:** 
- `aria-label` with day name and "today" indicator
- `sr-only` text for screen readers
- Decorative elements use `aria-hidden="true"`

---

### DayCard

**Path:** `src/components/DayCard.jsx`

**Description:** Daily meal card showing recipe, status, cost, and badges.

**Props:**
- `day` (object): Day data with `recipe`, `status`, `day_of_week`, etc.
- `isToday` (boolean): Highlight today's card
- `onUpdateStatus` (function): Status advancement handler
- `onSwap` (function): Swap recipe handler `(day) => void`

**Design Tokens:**
- Background: `bg-surface-card` (today), `bg-surface-page` (other days)
- Border: `border-border-subtle`
- Typography: `text-lg font-semibold` (recipe name)

**Usage:**
```jsx
<DayCard
  day={dayData}
  isToday={isToday}
  onUpdateStatus={() => advanceStatus(day)}
/>
```

**Accessibility:**
- Uses `<article>` for semantic structure
- Keyboard navigation (Enter/Space to view recipe)
- `aria-label` describing action
- Status button has descriptive `aria-label`

---

## Grocery Components

### CategorySection

**Path:** `src/components/CategorySection.jsx`

**Description:** Grocery category section with header (icon, name, location) and grouped items.

**Props:**
- `category` (object): Category data with `name`, `location`
- `items` (array): Array of grocery items
- `onToggle` (function): Toggle handler `(itemId, checked) => void`

**Design Tokens:**
- Header: `bg-surface-card`, `border-border-subtle`
- Icons: Category-specific accent colors (`bg-apple-100`, `bg-tomato-100`, etc.)

**Usage:**
```jsx
<CategorySection
  category={{ name: 'Produce', location: 'Front Left' }}
  items={produceItems}
  onToggle={handleToggle}
/>
```

---

### GroceryListItem

**Path:** `src/components/grocery/GroceryListItem.jsx`

**Description:** Individual grocery item with checkbox, quantity, and cost.

**Props:**
- `item` (object): Item data with `ingredient`, `quantity_needed`, `unit`, `estimated_cost`, `is_purchased`
- `onToggle` (function): Toggle handler `(itemId, checked) => void`

**Design Tokens:**
- Background: `bg-surface-page`
- Border: `border-border-subtle`
- Typography: `text-sm font-medium` (name), `text-sm font-semibold` (cost)

**Usage:**
```jsx
<GroceryListItem
  item={groceryItem}
  onToggle={(id, checked) => updatePurchaseStatus(id, checked)}
/>
```

**Accessibility:**
- Proper label association for checkbox
- `aria-label` on checkbox
- Keyboard accessible

---

## Recipe Components

### RecipeHeader

**Path:** `src/components/recipe/RecipeHeader.jsx`

**Description:** Recipe title block with image, metadata (time, cost, servings), and badges.

**Props:**
- `recipe` (object): Recipe data with `name`, `image_url`, `time`, `total_cost`, `cost_per_serving`, `servings`, `notes`

**Design Tokens:**
- Image: `h-48`, `rounded-2xl`, `shadow-md`
- Typography: `text-3xl font-semibold` (title)
- Metadata: `text-sm text-icon-subtle`

**Usage:**
```jsx
<RecipeHeader recipe={recipeData} />
```

---

### SectionLabel

**Path:** `src/components/recipe/SectionLabel.jsx`

**Description:** Section heading with uppercase tracking.

**Props:**
- `children` (ReactNode): Label text

**Design Tokens:**
- Typography: `text-xs font-semibold uppercase tracking-[0.2em]`
- Color: `text-icon-subtle`

**Usage:**
```jsx
<SectionLabel>Ingredients</SectionLabel>
```

---

### IngredientList

**Path:** `src/components/recipe/IngredientList.jsx`

**Description:** List of ingredients with checkboxes.

**Props:**
- `items` (array): Array of ingredient entries with `id`, `quantity`, `unit`, `ingredient`
- `checked` (Set): Set of checked ingredient IDs
- `onToggle` (function): Toggle handler `(ingredientId) => void`

**Design Tokens:**
- Spacing: `space-y-2`
- Typography: `text-sm text-text-body`

**Usage:**
```jsx
<IngredientList
  items={ingredients}
  checked={checkedIngredients}
  onToggle={toggleIngredient}
/>
```

---

### InstructionList

**Path:** `src/components/recipe/InstructionList.jsx`

**Description:** Numbered instruction steps.

**Props:**
- `instructions` (string): Multi-line instruction text

**Design Tokens:**
- Card: `bg-surface-card`, `border-border-subtle`, `rounded-2xl`
- Number badge: `bg-surface-primary`, `text-text-inverse`
- Typography: `text-sm text-text-body`

**Usage:**
```jsx
<InstructionList instructions={recipe.instructions} />
```

---

## Form Components

### DaySelectGrid

**Path:** `src/components/schedule/DaySelectGrid.jsx`

**Description:** Grid of selectable day buttons for schedule selection.

**Props:**
- `selectedIndex` (number): Index of selected day (0-6, Sunday-Saturday)
- `onSelect` (function): Selection handler `(index: number) => void`
- `className` (string): Additional CSS classes

**Design Tokens:**
- Selected: `bg-surface-primary/15`, `border-border-focus`
- Unselected: `bg-surface-page`, `border-border-subtle`
- Day colors: `bg-day-*` classes

**Usage:**
```jsx
<DaySelectGrid
  selectedIndex={mealPlanDay}
  onSelect={setMealPlanDay}
/>
```

**Accessibility:** Proper button semantics, focus styles.

---

### StepIndicator

**Path:** `src/components/onboarding/StepIndicator.jsx`

**Description:** Progress indicator for multi-step flows.

**Props:**
- `current` (number): Current step index (0-based)

**Design Tokens:**
- Active: `bg-surface-primary`, `border-border-focus`
- Complete: `bg-surface-primary/20`
- Incomplete: `bg-surface-page`, `border-border-subtle`

**Usage:**
```jsx
<StepIndicator current={step} />
```

---

## Navigation Components

### Breadcrumb

**Path:** `src/components/navigation/Breadcrumb.jsx`

**Description:** Breadcrumb navigation with chevron separators.

**Props:**
- `items` (array): Array of `{label: string, href?: string, onClick?: function}` objects
- `className` (string): Additional CSS classes

**Design Tokens:**
- Typography: `text-sm`
- Colors: `text-icon-subtle` (inactive), `text-text-body` (active)
- Separator: `text-icon-subtle`

**Usage:**
```jsx
<Breadcrumb
  items={[
    { label: 'Home', href: '/' },
    { label: 'Recipes', href: '/recipes' },
    { label: 'Chicken Stir-Fry' }
  ]}
/>
```

**Accessibility:**
- `aria-label="Breadcrumb"` on nav
- `aria-current="page"` on last item

---

## Design Token Reference

All components use design tokens from `tokens.json` via Tailwind CSS classes. Key token categories:

- **Colors:** `text-*`, `bg-surface-*`, `border-*`, `icon-*`
- **Typography:** `text-xs` through `text-9xl`, `font-*` weights
- **Spacing:** `p-*`, `m-*`, `gap-*` (0.25rem increments)
- **Radii:** `rounded-*` (sm, md, lg, xl, 2xl, 3xl, full)
- **Shadows:** `shadow-sm`, `shadow`, `shadow-md`, `shadow-lg`, `shadow-xl`, `shadow-2xl`

See `docs/TOKEN_COVERAGE_REPORT.md` for complete token mapping.

---

## Future Responsive Considerations

When adapting components for desktop/responsive layouts:

1. **Breakpoints:** Use Tailwind's `sm:`, `md:`, `lg:`, `xl:` prefixes
2. **Layout:** Consider multi-column layouts for wider screens
3. **Spacing:** Increase padding/margins on larger screens
4. **Typography:** Scale font sizes appropriately
5. **Navigation:** Consider sidebar navigation for desktop
6. **Grids:** Use CSS Grid for complex layouts (e.g., recipe cards grid)

All components are built mobile-first and can be extended with responsive classes as needed.

---

## Testing Recommendations

- **Accessibility:** Use screen readers (VoiceOver, NVDA) and keyboard-only navigation
- **Visual:** Test at 200% zoom, verify focus indicators
- **Responsive:** Test on various screen sizes (320px to 1920px+)
- **Dark Mode:** When implemented, verify all contrast ratios meet WCAG AA

See `docs/ACCESSIBILITY_AUDIT.md` for detailed accessibility guidelines.

