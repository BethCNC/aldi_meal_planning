import { forwardRef } from 'react'

/**
 * Input component with consistent styling and accessibility support
 * Built from Figma design specifications using design tokens.
 * 
 * @param {string} label - Optional label text
 * @param {string} helperText - Optional helper text below input
 * @param {string} error - Optional error message (overrides helperText)
 * @param {boolean} disabled - Disabled state
 * @param {string} state - Input state: 'default' | 'active' | 'disabled'
 * @param {ReactNode} leadIcon - Optional icon before input text
 * @param {ReactNode} trailIcon - Optional icon after input text
 * @param {ReactNode} button - Optional button element after input
 * @param {string} className - Additional CSS classes
 * @param {object} props - Standard input props
 */
export const Input = forwardRef(({
  label,
  helperText,
  error,
  disabled,
  state,
  leadIcon,
  trailIcon,
  button,
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
  const hasError = Boolean(error);
  const isDisabled = disabled || state === 'disabled'
  
  // Determine actual state
  const actualState = state || (isDisabled ? 'disabled' : 'default')
  
  // Typography: text-base/font-medium (16px, medium weight, line-height 21px)
  const typographyClass = 'text-base font-medium'
  const labelTypographyClass = 'text-base font-medium'
  
  // Spacing tokens from design system
  // Spacing/1 = 4px (gap-1)
  // padding/lg = 12px (px-3 = 12px)
  // padding/md = 8px (gap-2 = 8px)
  const gapClass = 'gap-1' // Spacing/1 (4px) - gap between label and input
  const fieldPaddingClass = 'px-3 py-3' // padding/lg (12px) - field padding
  const fieldGapClass = 'gap-2' // padding/md (8px) - gap between icon and text
  
  // Border radius: Border Radius/rounded (4px)
  const borderRadiusClass = 'rounded'
  
  // Border width: border-width/1 (1px)
  const borderWidthClass = 'border'
  
  // State-based styles using semantic tokens from Figma design
  const stateStyles = {
    default: {
      field: 'border-border-subtle bg-surface-page focus:border-border-focus focus:ring-2 focus:ring-border-focus focus:ring-offset-2',
      text: 'text-text-subtle placeholder:text-text-subtle', // Placeholder text uses text-subtle
      label: 'text-text-body',
      icon: 'text-icon-subtle',
      border: 'border-border-subtle',
    },
    active: {
      field: 'border-0 bg-surface-page', // No border in active state per Figma
      text: 'text-text-body',
      label: 'text-text-body',
      icon: 'text-icon-body',
      border: '',
    },
    disabled: {
      field: 'border-border-disabled bg-surface-disabled cursor-not-allowed',
      text: 'text-text-disabled placeholder:text-text-disabled',
      label: 'text-text-disabled opacity-70',
      icon: 'text-icon-disabled',
      border: 'border-border-disabled',
    },
  }
  
  const currentStateStyles = stateStyles[actualState] || stateStyles.default
  
  // Error state overrides
  const errorStyles = hasError ? {
    field: 'border-error bg-error/5',
    text: 'text-text-body',
    label: 'text-text-body',
    icon: 'text-icon-body',
    border: 'border-error',
  } : null
  
  const styles = errorStyles || currentStateStyles
  
  // Helper text or error message
  const helperContent = error || helperText
  const helperTextClass = error 
    ? 'text-xs font-medium text-error'
    : 'text-xs font-medium text-text-subtle'

  return (
    <div className={`flex flex-col ${gapClass} items-start ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className={`${labelTypographyClass} ${styles.label} ${isDisabled ? 'opacity-70' : ''}`}
        >
          {label}
        </label>
      )}
      
      <div className={`flex ${gapClass} items-center w-full`}>
        <div className={`
          flex-1
          ${borderWidthClass}
          ${styles.border}
          ${styles.field}
          ${fieldGapClass}
          ${fieldPaddingClass}
          ${borderRadiusClass}
          flex
          items-center
          ${isDisabled ? 'cursor-not-allowed' : ''}
        `}>
          {leadIcon && (
            <span className="shrink-0 w-5 h-5 flex items-center justify-center" aria-hidden="true">
              {leadIcon}
            </span>
          )}
          
          <input
            ref={ref}
            id={inputId}
            disabled={isDisabled}
            aria-invalid={hasError}
            aria-describedby={helperContent ? `${inputId}-helper` : undefined}
            className={`
              flex-1
              ${typographyClass}
              ${styles.text}
              bg-transparent
              border-0
              outline-none
              min-w-0
              ${isDisabled ? 'cursor-not-allowed' : ''}
            `}
            placeholder={props.placeholder}
            {...props}
          />
          
          {trailIcon && (
            <span className="shrink-0 w-5 h-5 flex items-center justify-center" aria-hidden="true">
              {trailIcon}
            </span>
          )}
        </div>
        
        {button && (
          <div className="flex items-center self-stretch">
            {button}
          </div>
        )}
      </div>
      
      {helperContent && (
        <p 
          id={`${inputId}-helper`} 
          className={helperTextClass}
          role={error ? 'alert' : undefined}
        >
          {helperContent}
        </p>
      )}
    </div>
  )
})

Input.displayName = 'Input'
