/**
 * Separator component for visual division between content sections
 * 
 * @param {string} orientation - 'horizontal' or 'vertical' (default: 'horizontal')
 * @param {string} className - Additional CSS classes
 */
export function Separator({ orientation = 'horizontal', className = '' }) {
  if (orientation === 'vertical') {
    return (
      <div
        className={`w-px bg-border-subtle ${className}`}
        role="separator"
        aria-orientation="vertical"
      />
    );
  }

  return (
    <div
      className={`h-px w-full bg-border-subtle ${className}`}
      role="separator"
      aria-orientation="horizontal"
    />
  );
}

