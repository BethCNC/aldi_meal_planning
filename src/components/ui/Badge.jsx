/**
 * Badge Component
 * 
 * Uses design tokens for colors and typography.
 */
export function Badge({ children, variant = 'default', className = '' }) {
  // Using semantic color tokens from design system
  const variants = {
    default: 'bg-surface-card text-text-body border border-border-subtle',
    success: 'bg-surface-primary text-text-inverse',
    warning: 'bg-surface-secondary text-text-body',
    error: 'bg-strawberry-500 text-text-inverse',
  };
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
