import { forwardRef } from 'react'

/**
 * Button Component
 * 
 * Design system button component built from Figma specifications.
 * Uses design tokens for sizing, spacing, typography, and colors.
 * 
 * @param {string} variant - Button style: 'filled' | 'secondary' | 'outline' | 'ghost'
 * @param {string} size - Button size: 'small' | 'medium' | 'large'
 * @param {string} state - Button state: 'default' | 'hover' | 'focus' | 'active' | 'disabled'
 * @param {string} iconPosition - Icon position: 'none' | 'leading' | 'trailing' | 'both' | 'alone'
 * @param {ReactNode} iconLeading - Icon to display before text
 * @param {ReactNode} iconTrailing - Icon to display after text
 * @param {ReactNode} children - Button label text
 * @param {string} className - Additional CSS classes
 */
export const Button = forwardRef(({
  variant = 'filled',
  size = 'medium',
  state = 'default',
  iconPosition = 'none',
  iconLeading,
  iconTrailing,
  children,
  className = '',
  disabled,
  ...props
}, ref) => {
  // Determine if button should be disabled
  const isDisabled = disabled || state === 'disabled'

  // Size-based typography tokens
  const typographyClasses = {
    small: 'text-xs font-medium', // text-xs/font-medium: 12px, medium weight
    medium: 'text-base font-medium', // text-base/font-medium: 16px, medium weight
    large: 'text-xl font-medium', // text-xl/font-medium: 20px, medium weight
  }

  // Size-based padding (matching Figma specifications)
  // Small: 12px x, 8px y (from Figma)
  // Medium/Large: 12px x (button/x-padding), 8px y (button/y-padding) - matches tokens.json button tokens
  const paddingClasses = {
    small: 'px-3 py-2', // 12px x, 8px y (small buttons from Figma)
    medium: 'px-button-x-padding py-button-y-padding', // Uses spacing tokens (12px x, 8px y)
    large: 'px-button-x-padding py-button-y-padding', // Uses spacing tokens (12px x, 8px y)
  }

  // Icon size based on button size
  const iconSizes = {
    small: 'w-4 h-4', // 16px
    medium: 'w-5 h-5', // 20px
    large: 'w-6 h-6', // 24px
  }

  // Base classes using design tokens
  // Gap: 4px for all sizes (button/gap token) - matches Figma
  // button/border-radius: 0.25rem (4px) - using borderRadius token
  const gapClasses = {
    small: 'gap-button-gap', // 4px - uses spacing token
    medium: 'gap-button-gap', // 4px - uses spacing token
    large: 'gap-button-gap', // 4px - uses spacing token
  }

  const baseClasses = [
    'inline-flex',
    'items-center',
    'justify-center',
    gapClasses[size],
    'rounded', // 0.25rem (4px) from Border Radius/rounded token
    'font-sans', // Plus Jakarta Sans
    'transition-colors',
    'focus:outline-none',
    typographyClasses[size],
    paddingClasses[size],
  ].join(' ')

  // Variant styles using semantic color tokens
  const variantClasses = {
    filled: {
      default: 'bg-surface-inverse text-text-inverse',
      hover: 'bg-surface-inverse-hover text-text-inverse',
      focus: 'bg-surface-inverse text-text-inverse ring-2 ring-border-focus ring-offset-2',
      active: 'bg-surface-inverse-hover text-text-inverse',
      disabled: 'bg-surface-disabled text-text-disabled cursor-not-allowed opacity-50',
    },
    secondary: {
      default: 'bg-surface-secondary text-text-inverse',
      hover: 'bg-surface-secondary-hover text-text-inverse',
      focus: 'bg-surface-secondary text-text-inverse ring-2 ring-border-focus ring-offset-2',
      active: 'bg-surface-secondary-active text-text-inverse',
      disabled: 'bg-surface-disabled text-text-disabled cursor-not-allowed opacity-50',
    },
    outline: {
      default: 'bg-transparent text-text-body border border-border-subtle',
      hover: 'bg-surface-card text-text-body border-border-subtle',
      focus: 'bg-transparent text-text-body border-2 border-border-focus ring-2 ring-border-focus ring-offset-2',
      active: 'bg-surface-card text-text-body border-border-subtle',
      disabled: 'bg-transparent text-text-disabled border-border-disabled cursor-not-allowed opacity-50',
    },
    ghost: {
      default: 'bg-transparent text-text-body',
      hover: 'bg-surface-card text-text-body',
      focus: 'bg-transparent text-text-body ring-2 ring-border-focus ring-offset-2',
      active: 'bg-surface-card text-text-body',
      disabled: 'bg-transparent text-text-disabled cursor-not-allowed opacity-50',
    },
  }

  // Get current state classes
  const stateClasses = variantClasses[variant]?.[state] || variantClasses[variant]?.default

  // Determine which icons to show
  const showLeadingIcon = (iconPosition === 'leading' || iconPosition === 'both') && iconLeading
  const showTrailingIcon = (iconPosition === 'trailing' || iconPosition === 'both') && iconTrailing
  const showIconAlone = iconPosition === 'alone' && (iconLeading || iconTrailing)
  const showText = !showIconAlone && children

  // Icon wrapper classes
  const iconClass = iconSizes[size]

  // Combine all classes
  const combinedClasses = `${baseClasses} ${stateClasses} ${className}`.trim()

  return (
    <button
      ref={ref}
      className={combinedClasses}
      disabled={isDisabled}
      {...props}
    >
      {showLeadingIcon && (
        <span className={iconClass} aria-hidden="true">
          {iconLeading}
        </span>
      )}
      {showText && <span>{children}</span>}
      {showTrailingIcon && (
        <span className={iconClass} aria-hidden="true">
          {iconTrailing}
        </span>
      )}
      {showIconAlone && (
        <span className={iconClass} aria-hidden="true">
          {iconLeading || iconTrailing}
        </span>
      )}
    </button>
  )
})

Button.displayName = 'Button'
