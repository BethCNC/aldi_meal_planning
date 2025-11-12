# Token Coverage Report — Figma Component System

Date: 2025-11-12  
Source design: [Aldi Meal Planning App – Components](https://www.figma.com/design/v00kzyE21XWrbZpvRZNvJK/Aldi-Meal-Planning-App?node-id=14-19501&m=dev)

## Summary

All colors, typography, spacing, radii, and shadow values used across the Figma components are represented by existing entries in `tokens.json` and exposed through `tailwind.config.js`, with a handful of clean-up items noted below. No new primitives are required before starting component implementation.

## Color Coverage

| Design Usage | Token | Notes |
|--------------|-------|-------|
| Action fills (primary button, tab active bg) | `surface.primary` / `surface.primary-hover` | Matches apple green ramp. |
| Action outline focus ring | `surface.focus` / `surface.focus-subtle` | Focus halo uses translucent `#5cb4f34d` already present. |
| Neutral surfaces (page, card, elevated) | `surface.page`, `surface.card`, `surface.elevated`, `surface.disabled` | Align with light stone/neutral ramp. |
| Dark backgrounds (week header, filled button) | `surface.inverse`, `surface.inverse-hover` | Both tokens exist; ensure hover uses `surface.inverse-hover`. |
| Text colors (default/inverse/subtle/primary/focus) | `text.body`, `text.inverse`, `text.subtle`, `text.primary`, `text.focus` | All referenced values covered. |
| Disabled text | `text.disabled` | Token now correctly named and surfaced through Tailwind. |
| Icon colors | `icon.display`, `icon.subtle`, `icon.primary`, `icon.focus`, `icon.disabled`, `icon.inverse` | Matches usage in nav/tab items. |
| Weekday badge backgrounds | `surface.day.monday` … `surface.day.sunday` | Palette aligns with Figma chip colors. |
| Borders (default, subtle, focus, primary) | `border.default`, `border.subtle`, `border.focus`, `border.primary` | Outline button/tab separators covered. |
| Form outline disabled | `border.disabled` | Matches grey border in disabled inputs. |
| Dark-mode equivalents | `ThemeDark.*` | Provides inverse mappings for all above; no gaps identified. |

## Typography Coverage

| Figma Style | Tailwind Utility | Token Reference |
|-------------|-----------------|-----------------|
| `text-4xl / font-bold` (Week header) | `text-4xl font-bold leading-[48px]` | `text-4xl` scale present; ensure Tailwind `font-bold` maps to token `fontWeights.plus-jakarta-sans-4`. |
| `text-2xl / font-semibold` (Meal title) | `text-2xl font-semibold leading-8` | Covered. |
| `text-sm / font-semibold` (Tab labels) | `text-sm font-semibold leading-[19px]` | Covered. |
| `text-xs / font-medium` (Small buttons) | `text-xs font-medium leading-4` | Covered. |
| Body copy (`text-base`, `text-lg`) | Already in scale | Covered. |

No additional typography tokens required. Continue to centralize through planned Typography helpers.

## Spacing, Radii, Shadows

- **Spacing:** Figma references values such as `spacing/0`, `spacing/1`, `spacing/1․5`, `spacing/2`, `spacing/3`, `spacing/6`. All exist in `tokens.json` and Tailwind `extend.spacing`.  
- **Radii:** Buttons use `rounded` (4px) and `rounded-lg` (8px); badges sometimes use `rounded-2xl`. All defined under `Primitives ➜ Border Radius`.  
- **Shadows:** Recipe card/image uses `shadow-md`/`shadow-lg`. Token entries already mirror Tailwind defaults (from `tokens.json`), so we can alias directly.

## Identified Gaps & Cleanup Tasks

1. **Semantic aliases:** Consider adding explicit semantic aliases during component implementation (e.g., `button.filled.bg`, `input.border.default`) for clarity, but not required before coding.  
2. **Dark-mode testing:** Ensure `ThemeDark.surface.focus-subtle` uses an actual translucent variant (`blueberry` at reduced alpha). Current value reuses solid `blueberry.400`; may want `#5cb4f352` equivalent later when implementing dark mode focus rings.

## Recommendation

Proceed to component development (Phase 2 of plan) with existing tokens. If we introduce additional semantic aliases, capture them in `tokens.json` under a new layer (e.g., `Component.button`), but this can wait until initial implementations highlight true repetition. ‼️

