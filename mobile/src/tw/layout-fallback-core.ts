type NativeStyle = Record<string, unknown>

const FLEX_1_STYLE: NativeStyle = { flex: 1 }
const FLEX_GROW_STYLE: NativeStyle = { flexGrow: 1 }
const FLEX_SHRINK_0_STYLE: NativeStyle = { flexShrink: 0 }
const MIN_H_0_STYLE: NativeStyle = { minHeight: 0 }
const MIN_W_0_STYLE: NativeStyle = { minWidth: 0 }
const FLEX_ROW_STYLE: NativeStyle = { flexDirection: 'row' }
const FLEX_WRAP_STYLE: NativeStyle = { flexWrap: 'wrap' }
const ITEMS_CENTER_STYLE: NativeStyle = { alignItems: 'center' }
const ITEMS_START_STYLE: NativeStyle = { alignItems: 'flex-start' }
const ITEMS_END_STYLE: NativeStyle = { alignItems: 'flex-end' }
const ITEMS_STRETCH_STYLE: NativeStyle = { alignItems: 'stretch' }
const JUSTIFY_CENTER_STYLE: NativeStyle = { justifyContent: 'center' }
const JUSTIFY_BETWEEN_STYLE: NativeStyle = { justifyContent: 'space-between' }
const JUSTIFY_START_STYLE: NativeStyle = { justifyContent: 'flex-start' }
const JUSTIFY_END_STYLE: NativeStyle = { justifyContent: 'flex-end' }

const GAP_STYLES: Record<string, NativeStyle> = {
  'gap-0.5': { gap: 2 },
  'gap-1': { gap: 4 },
  'gap-2': { gap: 8 },
  'gap-3': { gap: 12 },
  'gap-4': { gap: 16 },
  'gap-section-header': { gap: 12 },
}

const NATIVE_LAYOUT_CLASS_FALLBACKS: Array<{
  pattern: RegExp
  style: NativeStyle
}> = [
  { pattern: /\bflex-1\b/, style: FLEX_1_STYLE },
  { pattern: /\bflex-grow\b/, style: FLEX_GROW_STYLE },
  { pattern: /\bflex-shrink-0\b/, style: FLEX_SHRINK_0_STYLE },
  { pattern: /\bmin-h-0\b/, style: MIN_H_0_STYLE },
  { pattern: /\bmin-w-0\b/, style: MIN_W_0_STYLE },
  { pattern: /\bflex-row\b/, style: FLEX_ROW_STYLE },
  { pattern: /\bflex-wrap\b/, style: FLEX_WRAP_STYLE },
  { pattern: /\bitems-center\b/, style: ITEMS_CENTER_STYLE },
  { pattern: /\bitems-start\b/, style: ITEMS_START_STYLE },
  { pattern: /\bitems-end\b/, style: ITEMS_END_STYLE },
  { pattern: /\bitems-stretch\b/, style: ITEMS_STRETCH_STYLE },
  { pattern: /\bjustify-center\b/, style: JUSTIFY_CENTER_STYLE },
  { pattern: /\bjustify-between\b/, style: JUSTIFY_BETWEEN_STYLE },
  { pattern: /\bjustify-start\b/, style: JUSTIFY_START_STYLE },
  { pattern: /\bjustify-end\b/, style: JUSTIFY_END_STYLE },
  ...Object.entries(GAP_STYLES).map(([token, style]) => ({
    pattern: new RegExp(`\\b${token.replace('.', '\\.')}\\b`),
    style,
  })),
]

const mergedStyleCache = new Map<string, NativeStyle | NativeStyle[]>()

function cacheKey(
  className: string,
  style: NativeStyle | NativeStyle[] | undefined,
): string {
  if (!style) return className
  if (Array.isArray(style)) {
    return `${className}::array::${style.map((entry) => JSON.stringify(entry)).join('|')}`
  }
  return `${className}::${JSON.stringify(style)}`
}

function combineFallbackStyles(fallbackStyles: NativeStyle[]): NativeStyle {
  return Object.assign({}, ...fallbackStyles)
}

export function mergeLayoutFallbackStyles(
  className: string | undefined,
  style: NativeStyle | NativeStyle[] | undefined,
): NativeStyle | NativeStyle[] | undefined {
  if (!className) {
    return style
  }

  const fallbackStyles = NATIVE_LAYOUT_CLASS_FALLBACKS.filter(({ pattern }) =>
    pattern.test(className),
  ).map(({ style: fallbackStyle }) => fallbackStyle)

  if (fallbackStyles.length === 0) {
    return style
  }

  const key = cacheKey(className, style)
  const cached = mergedStyleCache.get(key)
  if (cached) {
    return cached
  }

  const combinedFallback = combineFallbackStyles(fallbackStyles)

  let merged: NativeStyle | NativeStyle[]
  if (!style) {
    merged = combinedFallback
  } else if (Array.isArray(style)) {
    merged = [combinedFallback, ...style]
  } else {
    merged = [combinedFallback, style]
  }

  mergedStyleCache.set(key, merged)
  return merged
}
