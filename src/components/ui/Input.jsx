/**
 * Input component with consistent styling and accessibility support
 * 
 * @param {string} label - Optional label text
 * @param {string} error - Optional error message
 * @param {boolean} disabled - Disabled state
 * @param {string} className - Additional CSS classes
 * @param {object} props - Standard input props
 */
export function Input({ label, error, disabled, className = '', id, ...props }) {
  const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
  const hasError = Boolean(error);

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className={`text-sm font-semibold ${
            disabled ? 'text-text-disabled' : hasError ? 'text-error' : 'text-text-body'
          }`}
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        disabled={disabled}
        aria-invalid={hasError}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className={`
          w-full rounded-xl border px-4 py-3 text-sm transition-colors
          focus:outline-none focus:ring-2 focus:ring-offset-2
          ${
            disabled
              ? 'border-border-disabled bg-surface-disabled text-text-disabled cursor-not-allowed'
              : hasError
                ? 'border-error bg-error/5 text-text-body focus:ring-error'
                : 'border-border-subtle bg-surface-page text-text-body focus:border-border-focus focus:ring-border-focus'
          }
        `}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className="text-xs text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

