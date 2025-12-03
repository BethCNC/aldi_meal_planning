/**
 * EmptyState Component
 * 
 * Uses design tokens for typography and colors.
 */
export function EmptyState({ title, message, action }) {
  return (
    <div className="text-center p-12">
      <h3 className="text-xl font-medium text-text-body mb-2">{title}</h3>
      {message && <p className="text-base font-medium text-text-subtle mb-6">{message}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}
