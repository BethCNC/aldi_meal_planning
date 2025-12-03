import plugin from 'tailwindcss/plugin'
import { readFileSync } from 'fs'
import { join } from 'path'

const tokens = JSON.parse(readFileSync(join(process.cwd(), 'tokens.json'), 'utf-8'))

const FONT_WEIGHT_LOOKUP = {
  Light: '300',
  Regular: '400',
  Medium: '500',
  SemiBold: '600',
  Bold: '700',
  ExtraBold: '800'
}

const FONT_STACK = '"Plus Jakarta Sans", system-ui, sans-serif'

/**
 * Resolves a token value from the tokens object.
 * Handles references like "{stone.950}".
 */
function resolveTokenValue(raw) {
  if (raw == null) return null
  if (typeof raw === 'number') return raw
  if (typeof raw !== 'string') return raw

  const match = raw.match(/^\{(.+)\}$/)
  if (!match) {
    return raw
  }

  const path = match[1].split('.')
  // Search in both Theme and Primitives
  const root = path[0] in tokens.Theme ? tokens.Theme : tokens.Primitives

  // Navigate path
  let current = root
  for (const segment of path) {
    if (current && typeof current === 'object' && segment in current) {
      current = current[segment]
    } else {
      return raw // Return raw if path resolution fails
    }
  }

  // If result has a 'value' property, it might be another reference or final value
  if (current && typeof current === 'object' && 'value' in current) {
    return resolveTokenValue(current.value)
  }

  return current
}

function toRem(value) {
  if (value == null) return undefined
  if (typeof value === 'string') return value
  if (typeof value !== 'number') return undefined
  if (value === 0) return '0rem'
  const remValue = value / 16
  const trimmed = parseFloat(remValue.toFixed(4)).toString()
  return `${trimmed}rem`
}

function toLetterSpacing(value) {
  if (value == null) return undefined
  if (typeof value === 'number') return `${value}em`
  if (typeof value !== 'string') return undefined
  const percentMatch = value.match(/^(-?\d+(\.\d+)?)%$/)
  if (percentMatch) {
    const decimal = parseFloat(percentMatch[1]) / 100
    if (decimal === 0) return '0'
    const trimmed = parseFloat(decimal.toFixed(4)).toString()
    return `${trimmed}em`
  }
  return value
}

function mapFontWeight(value) {
  if (value == null) return undefined
  if (typeof value === 'number') return value.toString()
  if (typeof value === 'string') {
    const mapped = FONT_WEIGHT_LOOKUP[value] || value
    return mapped
  }
  return undefined
}

// --- Dynamic Theme Generation ---

const colors = {}
const spacing = {}
const borderRadius = {}
const borderWidth = {}
const boxShadow = {}

// 1. Process Primitives (Colors, Spacing, etc.)
for (const [key, group] of Object.entries(tokens.Primitives)) {
  // Colors (stone, neutral, apple, etc.)
  if (['stone', 'neutral', 'grape', 'strawberry', 'blueberry', 'apple', 'lemon', 'clementine', 'tomato', 'white', 'black', 'transparent'].includes(key)) {
    if (typeof group.value === 'string') {
      // Single color value (white, black)
      colors[key] = resolveTokenValue(group.value)
    } else {
      // Color scale
      colors[key] = {}
      for (const [shade, token] of Object.entries(group)) {
        colors[key][shade] = resolveTokenValue(token.value)
      }
    }
  }
  // Spacing
  else if (key === 'Spacing') {
    for (const [scale, token] of Object.entries(group)) {
      // Handle dots in keys (e.g. "0.5") if necessary, mostly they are "1", "2"...
      spacing[scale.replace('․', '.')] = resolveTokenValue(token.value)
    }
  }
  // Border Radius
  else if (key === 'Border Radius') {
    for (const [name, token] of Object.entries(group)) {
      // Map "rounded-lg" -> "lg", "rounded" -> "DEFAULT"
      const tailwindKey = name.replace('rounded-', '') || 'DEFAULT'
      borderRadius[tailwindKey === 'rounded' ? 'DEFAULT' : tailwindKey] = resolveTokenValue(token.value)
    }
  }
  // Border Width
  else if (key === 'Border Width') {
    for (const [name, token] of Object.entries(group)) {
      borderWidth[name] = resolveTokenValue(token.value)
    }
  }
}

// 2. Process Theme (Semantic Colors, Component Tokens)
for (const [key, group] of Object.entries(tokens.Theme)) {
  // Semantic Colors (text, border, surface, icon)
  if (['text', 'border', 'surface', 'icon'].includes(key)) {
    colors[key] = {}
    for (const [semanticName, token] of Object.entries(group)) {
      if (token.value && typeof token.value === 'string') {
        colors[key][semanticName] = resolveTokenValue(token.value)
      } else if (typeof token === 'object') {
        // Handle nested groups like surface.day.Monday
        colors[key][semanticName] = {}
        for (const [nestedName, nestedToken] of Object.entries(token)) {
          colors[key][semanticName][nestedName] = resolveTokenValue(nestedToken.value)
        }
      }
    }
  }
  // Shadows
  else if (key.startsWith('shadow')) {
    // e.g. shadow-sm, shadow-md
    const shadowName = key.replace('shadow-', '') || 'DEFAULT'
    // Complex shadow handling skipped for simplicity, assuming simple strings or relying on primitive mapping if structure matches Tailwind
    // Tailwind expects string values for box shadows usually.
    // tokens.json has objects. We might need a transformer for shadows if strictly needed.
    // For now, keeping legacy shadows or relying on hardcoded ones if extraction is too complex.
  }
  // Component Tokens (Button, Padding) -> Add to spacing/theme
  else if (key === 'button') {
    // Add button tokens to spacing or a custom theme key
    // e.g. spacing['button-gap']
    for (const [prop, token] of Object.entries(group)) {
      const resolved = resolveTokenValue(token.value)
      // Convert px values to rem for Tailwind spacing
      if (typeof resolved === 'string' && resolved.endsWith('px')) {
        const pxValue = parseFloat(resolved)
        spacing[`button-${prop}`] = toRem(pxValue)
      } else {
        spacing[`button-${prop}`] = resolved
      }
    }
  }
  else if (key === 'padding') {
    for (const [prop, token] of Object.entries(group)) {
      spacing[`padding-${prop}`] = resolveTokenValue(token.value)
    }
  }
}


const textStyleUtilities = {}

for (const [styleKey, styleValue] of Object.entries(tokens.Theme)) {
  if (!styleKey.startsWith('text-') || typeof styleValue !== 'object') continue

  for (const [weightKey, tokenValue] of Object.entries(styleValue)) {
    if (!tokenValue || typeof tokenValue !== 'object' || !tokenValue.value) continue

    const { fontFamily, fontWeight, lineHeight, fontSize, letterSpacing } = tokenValue.value

    const className = `.text-style-${styleKey}-${weightKey.replace('font-', '')}`
    const resolvedFontSize = toRem(resolveTokenValue(fontSize))
    const resolvedLineHeight = toRem(resolveTokenValue(lineHeight))
    const resolvedFontFamily = resolveTokenValue(fontFamily) || FONT_STACK
    const resolvedFontWeight = mapFontWeight(resolveTokenValue(fontWeight))
    const resolvedLetterSpacing = toLetterSpacing(resolveTokenValue(letterSpacing))

    const utility = {}

    if (resolvedFontFamily) {
      utility.fontFamily = Array.isArray(resolvedFontFamily)
        ? resolvedFontFamily.join(', ')
        : resolvedFontFamily === 'Plus Jakarta Sans'
          ? FONT_STACK
          : resolvedFontFamily
    }
    if (resolvedFontSize) {
      utility.fontSize = resolvedFontSize
    }
    if (resolvedLineHeight) {
      utility.lineHeight = resolvedLineHeight
    }
    if (resolvedFontWeight) {
      utility.fontWeight = resolvedFontWeight
    }
    if (resolvedLetterSpacing !== undefined) {
      utility.letterSpacing = resolvedLetterSpacing
    }

    textStyleUtilities[className] = utility
  }
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  safelist: [
    'bg-surface-day-Monday',
    'bg-surface-day-Tuesday',
    'bg-surface-day-Wednesday',
    'bg-surface-day-Thursday',
    'bg-surface-day-Friday',
    'bg-surface-day-Saturday',
    'bg-surface-day-Sunday',
  ],
  theme: {
    extend: {
      colors: colors,
      spacing: spacing,
      borderRadius: borderRadius,
      borderWidth: borderWidth,
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      // Hardcoding shadows for now as structure in tokens.json is object-based
      boxShadow: {
        sm: '0 1px 2px 0 rgba(22, 22, 18, 0.05)',
        DEFAULT: '0 1px 3px 0 rgba(22, 22, 18, 0.1), 0 1px 2px -1px rgba(22, 22, 18, 0.1)',
        md: '0 4px 6px -1px rgba(22, 22, 18, 0.1), 0 2px 4px -2px rgba(22, 22, 18, 0.1)',
        lg: '0 10px 15px -3px rgba(22, 22, 18, 0.1), 0 4px 6px -4px rgba(22, 22, 18, 0.1)',
        xl: '0 20px 25px -5px rgba(22, 22, 18, 0.1), 0 8px 10px -6px rgba(22, 22, 18, 0.1)',
        '2xl': '0 25px 50px -12px rgba(22, 22, 18, 0.25)',
        inner: 'inset 0 2px 4px 0 rgba(22, 22, 18, 0.1)',
      },
    },
  },
  plugins: [
    plugin(({ addUtilities }) => {
      addUtilities(textStyleUtilities, ['responsive'])
    })
  ],
}