# Figma Component Inventory → React Mapping

Source design: [Aldi Meal Planning App – Components](https://www.figma.com/design/v00kzyE21XWrbZpvRZNvJK/Aldi-Meal-Planning-App?node-id=14-19501&m=dev)

This document lists every mobile component/symbol exported from the Figma Components page and maps it to the current (or planned) React implementation. Use it as the canonical checklist while we port the visual system.

## Legend

- **Status**
  - `exists` – component already lives in the codebase (may still need polish)
  - `needs-build` – no React equivalent yet
  - `extend` – component exists but requires additional variants/state support
- **Target Path** – preferred location under `src/`
- **Notes** – required variants, token usage, or integration details

## 1. Core Controls

| Figma Component | Status | Target Path | Notes |
|-----------------|--------|-------------|-------|
| Button (all size/style/state combinations) | exists | `src/components/ui/Button.jsx` | ✅ Supports `variant=primary/secondary/success/ghost`, `size=sm/md/lg`, focus states, disabled. Uses design tokens. |
| Separator → Type=Default | exists | `src/components/ui/Separator.jsx` | ✅ Horizontal/vertical separators with `border-border.subtle`, ARIA roles. |
| Checkbox Primitive & Checkbox (state variants) | exists | `src/components/ui/Checkbox.jsx` | ✅ Supports label, checked state, focus ring with `focus:ring-icon-focus`. |
| Switch Primitive & Switch | exists | `src/components/ui/Switch.jsx` | ✅ Toggle component with `role="switch"`, uses `surface.primary` for checked state, disabled support. |
| Input (default/active/disabled) | exists | `src/components/ui/Input.jsx` | ✅ Full ARIA support (`aria-invalid`, `aria-describedby`), error states, focus ring, validation. |
| Label (default/disabled) | exists | `src/components/ui/Label.jsx` | ✅ Typography tokens, required indicator, disabled state styling. |
| Select (trigger, group, item variants) | exists | `src/components/ui/Select.jsx` | ✅ Native select with ARIA attributes, error states, focus ring. For complex dropdowns, consider Radix UI Select. |
| Breadcrumb Item & Breadcrumb | exists | `src/components/navigation/Breadcrumb.jsx` | ✅ Proper `<nav>` structure, `aria-current="page"`, chevron separators. |

## 2. Layout & Navigation

| Figma Component | Status | Target Path | Notes |
|-----------------|--------|-------------|-------|
| Status Bar – iPhone | exists | `src/components/Layout.jsx` (StatusBar) | ✅ Mobile preview shell with decorative status indicators, `aria-hidden` for icons. |
| Nav Bar | exists | `src/components/Layout.jsx` (NavBar) | ✅ Logo icon + menu button, proper spacing, `aria-label` on menu button. |
| tab item (Default/Hover/Focus/Active) | exists | `src/components/BottomNav.jsx` | ✅ Active tab uses `surface.primary`, focus styles, `aria-current="page"`. |
| tab bar | exists | `src/components/BottomNav.jsx` | ✅ 5 items, proper `<nav>` structure, ARIA labels. |
| week header (`week`) | exists | `src/components/week/WeekHeader.jsx` | ✅ Week range display, dark background, navigation buttons with ARIA labels. |
| stripes background | optional | asset handled via CSS | If used, convert to background pattern asset. |

## 3. Branding Assets

| Figma Component | Status | Target Path | Notes |
|-----------------|--------|-------------|-------|
| Logo variants (`logo full`, `logo full-color`, `logo full-no color`, `logo apple`) | needs-build | `src/components/icons/Logo*.jsx` | Export inline SVGs so colors can swap in dark mode. |
| Favicons (`16`, `32`, `48`, `180`, `192`, `512`) | exists | `public/` | Already added; ensure manifest references correct files. |
| Vector (apple mark accent) | optional | `src/components/icons/` | Only if reused inside app. |

## 4. Meal Planning Modules

| Figma Component | Status | Target Path | Notes |
|-----------------|--------|-------------|-------|
| day chip (Monday–Sunday variants) | exists | `src/components/week/DayChip.jsx` | ✅ Maps to `surface.day.*` colors, `aria-label` with day name, `sr-only` text for screen readers. |
| Daily Recipe | exists | `src/components/DayCard.jsx` | ✅ Uses `<article>`, keyboard navigation, status badges, cost display, ARIA labels. |
| Separator (meal row) | exists | `src/components/ui/Separator.jsx` | ✅ Reusable separator component with ARIA roles. |

## 5. Grocery Components

| Figma Component | Status | Target Path | Notes |
|-----------------|--------|-------------|-------|
| grocery checklist item | exists | `src/components/grocery/GroceryListItem.jsx` | ✅ Checkbox, quantity, cost, pantry indicator, ARIA labels, keyboard accessible. |
| grocery item group | exists | `src/components/CategorySection.jsx` | ✅ Section header with aisle icon, grouped items, location labels. |

## 6. Recipe Detail Components

| Figma Component | Status | Target Path | Notes |
|-----------------|--------|-------------|-------|
| Recipe (composite screen) | exists | `src/pages/RecipeDetailView.jsx` + subcomponents | ✅ Composed of subcomponents below. |
| recipe name | exists | `src/components/recipe/RecipeHeader.jsx` | ✅ Title, image, metadata (cost, time, servings), badges. |
| Ingredients label | exists | `src/components/recipe/SectionLabel.jsx` | ✅ Shared label styling with uppercase tracking. |
| Ingredients (list) | exists | `src/components/recipe/IngredientList.jsx` | ✅ Checkbox list, quantity formatting, keyboard accessible. |
| Instructions label | exists | `src/components/recipe/SectionLabel.jsx` | ✅ Reuses SectionLabel component. |
| Instructions (list) | exists | `src/components/recipe/InstructionList.jsx` | ✅ Numbered steps with spacing tokens, card styling. |
| recipe image | exists | `src/components/recipe/RecipeHeader.jsx` | ✅ Image with fallback, gradient overlay, shadow tokens. |

## 7. Forms, Onboarding & Settings

| Figma Component | Status | Target Path | Notes |
|-----------------|--------|-------------|-------|
| Select components (trigger/group/item/label) | see Core Controls | `src/components/ui/Select.jsx` | – |
| Input / Label | see Core Controls | – | – |
| Switch / Checkbox | see Core Controls | – | – |
| Form layouts | needs-build | `src/pages/OnboardingView.jsx`, `src/pages/SettingsView.jsx` (with layout helpers) | Match spacing, step indicators, summary cards once design available. |

## 8. Miscellaneous

| Figma Component | Status | Target Path | Notes |
|-----------------|--------|-------------|-------|
| Breadcrumb (default) | needs-build | `src/components/navigation/Breadcrumb.jsx` | Compose items with separator icon (chevron). |
| label (utility) | see Core Controls | – | – |

## Next Steps

1. Use this inventory to drive implementation order (Phase 2 onward in `ux.plan.md`).
2. Track progress by updating the project todo list (already synced with these entries).
3. As components are implemented, add Storybook stories or doc snippets referencing this mapping for future desktop/responsive work. ***!

