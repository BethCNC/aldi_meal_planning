export function Button({ children, variant = 'primary', size = 'md', className = '', ...props }) {
  const baseClasses =
    'font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-surface-primary text-text-inverse hover:bg-surface-primary-hover focus:ring-icon-primary',
    secondary:
      'bg-surface-secondary text-text-body hover:bg-surface-secondary-hover focus:ring-icon-focus',
    success: 'bg-surface-primary text-text-inverse hover:bg-surface-primary-hover focus:ring-icon-primary',
    ghost:
      'bg-transparent text-text-body border border-border-subtle hover:bg-surface-card focus:ring-icon-focus'
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };
  
  return (
    <button 
      className={`${baseClasses} ${variants[variant] ?? variants.primary} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
