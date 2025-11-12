export function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-stone-100 text-stone-800',
    success: 'bg-apple-100 text-apple-800',
    warning: 'bg-lemon-100 text-lemon-800',
    error: 'bg-strawberry-100 text-strawberry-800',
  };
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
