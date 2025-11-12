export function Checkbox({ label, checked, onChange, className = '', ...props }) {
  return (
    <label className={`flex items-center gap-2 cursor-pointer ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
        className="w-5 h-5 text-surface-primary rounded focus:ring-2 focus:ring-icon-focus"
        {...props}
      />
      {label && <span className="text-sm text-text-body">{label}</span>}
    </label>
  );
}
