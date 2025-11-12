export function EmptyState({ title, message, action }) {
  return (
    <div className="text-center p-12">
      <h3 className="text-xl font-bold text-text-body mb-2">{title}</h3>
      {message && <p className="text-stone-600 mb-6">{message}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}
