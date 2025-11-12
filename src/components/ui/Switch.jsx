/**
 * Switch/Toggle component for boolean settings
 * 
 * @param {string} label - Optional label text
 * @param {boolean} checked - Checked state
 * @param {function} onChange - Change handler
 * @param {boolean} disabled - Disabled state
 * @param {string} className - Additional CSS classes
 * @param {object} props - Standard input props
 */
export function Switch({ label, checked, onChange, disabled, className = '', id, ...props }) {
  const switchId = id || (label ? `switch-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <label
      htmlFor={switchId}
      className={`
        flex items-center gap-3 cursor-pointer
        ${disabled ? 'cursor-not-allowed opacity-60' : ''}
        ${className}
      `}
    >
      <div className="relative inline-flex h-6 w-11 items-center">
        <input
          id={switchId}
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={(e) => onChange?.(e.target.checked)}
          disabled={disabled}
          className="sr-only"
          {...props}
        />
        <span
          className={`
            inline-block h-6 w-11 rounded-full transition-colors duration-200 ease-in-out
            ${
              checked
                ? 'bg-surface-primary'
                : 'bg-surface-elevated'
            }
            ${disabled ? 'opacity-50' : ''}
          `}
          aria-hidden="true"
        />
        <span
          className={`
            absolute left-1 inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out
            ${checked ? 'translate-x-5' : 'translate-x-0'}
          `}
          aria-hidden="true"
        />
      </div>
      {label && (
        <span className={`text-sm ${disabled ? 'text-text-disabled' : 'text-text-body'}`}>
          {label}
        </span>
      )}
    </label>
  );
}

