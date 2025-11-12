/**
 * Label component for form inputs with consistent typography
 * 
 * @param {string} htmlFor - ID of associated input element
 * @param {boolean} required - Show required indicator
 * @param {boolean} disabled - Disabled state styling
 * @param {string} className - Additional CSS classes
 * @param {React.ReactNode} children - Label content
 */
export function Label({ htmlFor, required, disabled, className = '', children, ...props }) {
  return (
    <label
      htmlFor={htmlFor}
      className={`
        text-sm font-semibold
        ${disabled ? 'text-text-disabled cursor-not-allowed' : 'text-text-body'}
        ${className}
      `}
      {...props}
    >
      {children}
      {required && <span className="ml-1 text-error" aria-label="required">*</span>}
    </label>
  );
}

