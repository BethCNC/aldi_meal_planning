/**
 * BudgetProgress Component
 * 
 * Uses design tokens for colors and typography.
 */
export function BudgetProgress({ current, budget, className = '' }) {
  const percentage = Math.min((current / budget) * 100, 100);
  const isOver = current > budget;
  
  return (
    <div className={`bg-surface-card p-6 rounded-lg border-2 border-border-subtle ${className}`}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-text-body">Budget</span>
        <span className={`text-2xl font-semibold ${isOver ? 'text-strawberry-600' : 'text-apple-600'}`}>
          ${current?.toFixed(2) || '0.00'} / ${budget?.toFixed(2) || '100.00'}
        </span>
      </div>
      
      <div className="w-full bg-surface-disabled rounded-full h-3">
        <div
          className={`h-3 rounded-full transition-all ${
            isOver ? 'bg-strawberry-500' : 'bg-apple-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      {isOver && (
        <p className="text-sm font-medium text-strawberry-600 mt-2">
          Over budget by ${((current || 0) - (budget || 100)).toFixed(2)}
        </p>
      )}
    </div>
  );
}
