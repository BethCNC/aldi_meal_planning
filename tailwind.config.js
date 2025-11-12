import plugin from 'tailwindcss/plugin'
import tokens from './tokens.json' assert { type: 'json' }

const FONT_WEIGHT_LOOKUP = {
  Light: '300',
  Regular: '400',
  Medium: '500',
  SemiBold: '600',
  Bold: '700',
  ExtraBold: '800'
}

const FONT_STACK = '"Plus Jakarta Sans", system-ui, sans-serif'

function resolveTokenPath(root, segments) {
  return segments.reduce((acc, segment) => {
    if (acc == null) return undefined
    return acc[segment]
  }, root)
}

function resolveTokenValue(raw) {
  if (raw == null) return null
  if (typeof raw === 'number') return raw
  if (typeof raw !== 'string') return raw

  const match = raw.match(/^\{(.+)\}$/)
  if (!match) {
    return raw
  }

  const path = match[1].split('.')
  const candidates = [tokens.Theme, tokens.Primitives]

  for (const candidate of candidates) {
    const result = resolveTokenPath(candidate, path)
    if (result !== undefined) {
      if (result && typeof result === 'object' && 'value' in result) {
        return result.value
      }
      return result
    }
  }

  return null
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
    'bg-day-monday',
    'bg-day-tuesday',
    'bg-day-wednesday',
    'bg-day-thursday',
    'bg-day-friday',
    'bg-day-saturday',
    'bg-day-sunday',
  ],
  theme: {
    extend: {
      colors: {
        // Color Primitives
        stone: {
          50: '#fafaf9',
          100: '#f5f5f4',
          200: '#e7e5e4',
          300: '#d6d3d1',
          400: '#a6a09b',
          500: '#79716b',
          600: '#57534d',
          700: '#44403b',
          800: '#292524',
          900: '#1c1917',
          950: '#0c0a09',
        },
        neutral: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5dc',
          400: '#99a1af',
          500: '#6a7282',
          600: '#4a5565',
          700: '#364153',
          800: '#1e2939',
          900: '#101828',
          950: '#030712',
        },
        grape: {
          50: '#eeeafc',
          100: '#e2dcfb',
          200: '#d4caf8',
          300: '#c6b9f6',
          400: '#b7a7f4',
          500: '#a996f2',
          600: '#8d7dca',
          700: '#7164a1',
          800: '#554b79',
          900: '#383251',
          950: '#221e30',
        },
        strawberry: {
          50: '#fcedee',
          100: '#fbe1e2',
          200: '#f8d2d3',
          300: '#f6c4c5',
          400: '#f4b5b6',
          500: '#f2a6a8',
          600: '#ca8a8c',
          700: '#a16f70',
          800: '#795354',
          900: '#513738',
          950: '#302122',
        },
        blueberry: {
          50: '#def0fd',
          100: '#c9e6fb',
          200: '#add9f9',
          300: '#92cdf7',
          400: '#77c0f5',
          500: '#5cb4f3',
          600: '#4d96ca',
          700: '#3d78a2',
          800: '#2e5a7a',
          900: '#1f3c51',
          950: '#122431',
        },
        apple: {
          50: '#e9f4e0',
          100: '#daeccc',
          200: '#c7e3b2',
          300: '#b4da99',
          400: '#a2d080',
          500: '#8fc766',
          600: '#77a655',
          700: '#5f8544',
          800: '#486433',
          900: '#304222',
          950: '#1d2814',
        },
        lemon: {
          50: '#fff9d1',
          100: '#fff5b2',
          200: '#ffef8c',
          300: '#ffea66',
          400: '#ffe53f',
          500: '#ffe019',
          600: '#d4bb15',
          700: '#aa9511',
          800: '#80700d',
          900: '#554b08',
          950: '#332d05',
        },
        clementine: {
          50: '#ffebda',
          100: '#ffddc2',
          200: '#ffcca3',
          300: '#ffbb84',
          400: '#ffaa66',
          500: '#ff9947',
          600: '#d4803b',
          700: '#aa662f',
          800: '#804d24',
          900: '#553318',
          950: '#331f0e',
        },
        tomato: {
          50: '#f9e1d7',
          100: '#f4cebd',
          200: '#efb59b',
          300: '#ea9c7a',
          400: '#e48459',
          500: '#df6b38',
          600: '#ba592f',
          700: '#954725',
          800: '#70361c',
          900: '#4a2413',
          950: '#2d150b',
        },
        // Theme Colors
        text: {
          display: '#0c0a09',
          body: '#292524',
          disabled: '#99a1af',
          subtle: '#79716b',
          primary: '#77a655',
          inverse: '#fafbfc',
          focus: '#5cb4f3',
          'primary-hover': '#a2d080',
        },
        border: {
          default: '#1c1917',
          disabled: '#99a1af',
          focus: '#5cb4f3',
          subtle: '#79716b',
          primary: '#77a655',
          body: '#292524',
        },
        surface: {
          page: '#fafbfc',
          card: '#fafaf9',
          elevated: '#d1d5dc',
          disabled: '#e5e7eb',
          primary: '#8fc766',
          'primary-hover': '#a2d080',
          secondary: '#ffe019',
          'secondary-hover': '#aa9511',
          inverse: '#1c1917',
          'inverse-hover': '#79716b',
          focus: '#5cb4f3',
          'focus-subtle': '#5cb4f34d',
        },
        icon: {
          display: '#1c1917',
          subtle: '#79716b',
          disabled: '#99a1af',
          focus: '#5cb4f3',
          inverse: '#fafbfc',
          primary: '#77a655',
          body: '#292524',
        },
        // Day Colors
        day: {
          monday: '#df6b38',
          tuesday: '#ff9947',
          wednesday: '#ffe019',
          thursday: '#8fc766',
          friday: '#5cb4f3',
          saturday: '#f2a6a8',
          sunday: '#a996f2',
        },
        // Legacy support
        primary: {
          50: '#e9f4e0',
          100: '#daeccc',
          200: '#c7e3b2',
          300: '#b4da99',
          400: '#a2d080',
          500: '#8fc766',
          600: '#77a655',
          700: '#5f8544',
        },
        success: '#8fc766',
        warning: '#ffe019',
        error: '#f2a6a8',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(22, 22, 18, 0.05)',
        DEFAULT: '0 1px 3px 0 rgba(22, 22, 18, 0.1), 0 1px 2px -1px rgba(22, 22, 18, 0.1)',
        md: '0 4px 6px -1px rgba(22, 22, 18, 0.1), 0 2px 4px -2px rgba(22, 22, 18, 0.1)',
        lg: '0 10px 15px -3px rgba(22, 22, 18, 0.1), 0 4px 6px -4px rgba(22, 22, 18, 0.1)',
        xl: '0 20px 25px -5px rgba(22, 22, 18, 0.1), 0 8px 10px -6px rgba(22, 22, 18, 0.1)',
        '2xl': '0 25px 50px -12px rgba(22, 22, 18, 0.25)',
        inner: 'inset 0 2px 4px 0 rgba(22, 22, 18, 0.1)',
      },
      borderRadius: {
        sm: '0.125rem',
        DEFAULT: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        full: '624.938rem',
      },
    },
  },
  plugins: [
    plugin(({ addUtilities }) => {
      addUtilities(textStyleUtilities, ['responsive'])
    })
  ],
}
