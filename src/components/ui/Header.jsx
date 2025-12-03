/**
 * Header Component
 * 
 * Simple header component built from Figma design specifications.
 * Uses design tokens for typography, colors, and spacing.
 * Fully responsive typography system.
 * 
 * @param {string} text - Header text content
 * @param {string} className - Additional CSS classes
 */
export function Header({ text = "Week of Nov 10 - 16", className = '' }) {
  // Design tokens from Figma:
  // - Background: surface/inverse (#1c1917)
  // - Padding: px-6 (24px - Spacing/6), py-3 (12px - Spacing/3)
  // - Typography: text-4xl/font-bold (36px, bold weight, line-height 48px)
  // - Text color: text-inverse (#fafbfc)
  // - Text alignment: center
  
  // Responsive typography: 
  // - Mobile: text-2xl font-bold (24px) 
  // - Tablet+: text-3xl font-bold (30px)
  // - Desktop: text-4xl font-bold (36px) - matches Figma
  // Using text style utilities from design tokens for proper responsive behavior

  return (
    <div className={`flex items-center justify-center bg-surface-inverse px-6 py-3 ${className}`}>
      <h1 className="text-style-text-2xl-bold md:text-style-text-3xl-bold lg:text-style-text-4xl-bold text-text-inverse text-center w-full">
        {text}
      </h1>
    </div>
  );
}

