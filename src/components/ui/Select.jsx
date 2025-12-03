/**
 * Select component with consistent styling
 * Uses design tokens for all styling values.
 * 
 * Note: For complex dropdowns with search/filtering, consider using Radix UI Select
 * This is a basic styled native select for simple use cases
 * 
 * @param {string} label - Optional label text
 * @param {string} error - Optional error message
 * @param {boolean} disabled - Disabled state
 * @param {string} className - Additional CSS classes
 * @param {object} props - Standard select props
 */
export function Select({ label, error, disabled, className = '', id, children, ...props }) {
  const selectId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
  const hasError = Boolean(error);

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={selectId}
          className={`text-sm font-medium ${
            disabled ? 'text-text-disabled' : hasError ? 'text-error' : 'text-text-body'
          }`}
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        disabled={disabled}
        aria-invalid={hasError}
        aria-describedby={error ? `${selectId}-error` : undefined}
        className={`
          w-full rounded border px-4 py-3 text-base font-medium transition-colors
          focus:outline-none focus:ring-2 focus:ring-offset-2
          ${
            disabled
              ? 'border-border-disabled bg-surface-disabled text-text-disabled cursor-not-allowed'
              : hasError
                ? 'border-error bg-error/5 text-text-body focus:ring-border-focus'
                : 'border-border-subtle bg-surface-page text-text-body focus:border-border-focus focus:ring-border-focus'
          }
        `}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p id={`${selectId}-error`} className="text-xs font-medium text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
