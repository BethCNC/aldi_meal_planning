export function Card({ children, className = '', ...props }) {
  return (
    <div className={`bg-surface-card rounded-lg border border-stone-200 shadow-sm ${className}`} {...props}>
      {children}
    </div>
  );
}
