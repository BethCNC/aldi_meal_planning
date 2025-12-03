/**
 * Card Component
 * 
 * Uses design tokens for colors, borders, and shadows.
 */
export function Card({ children, className = '', ...props }) {
  return (
    <div className={`bg-surface-card rounded-lg border border-border-subtle shadow-sm ${className}`} {...props}>
      {children}
    </div>
  );
}
