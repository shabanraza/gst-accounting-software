import { cloneElement, isValidElement, type ReactElement } from 'react'
import { Platform, type StyleProp, type ViewStyle } from 'react-native'

import { mergeLayoutFallbackStyles } from './layout-fallback-core'

type StyledElement = ReactElement<{
  style?: StyleProp<ViewStyle>
  contentContainerStyle?: StyleProp<ViewStyle>
}>

function patchStyle(
  element: StyledElement,
  className: string | undefined,
  styleKey: 'style' | 'contentContainerStyle',
): StyledElement {
  if (Platform.OS === 'web' || !className) {
    return element
  }

  const currentStyle = element.props[styleKey]
  const mergedStyle = mergeLayoutFallbackStyles(
    className,
    currentStyle as Record<string, unknown> | Record<string, unknown>[] | undefined,
  )

  if (mergedStyle === currentStyle) {
    return element
  }

  return cloneElement(element, {
    [styleKey]: mergedStyle as StyleProp<ViewStyle>,
  })
}

export function withPostCssLayoutFallback(
  element: React.ReactElement,
  className: string | undefined,
  contentContainerClassName?: string,
): React.ReactElement {
  if (!isValidElement(element)) {
    return element
  }

  let patched = patchStyle(element as StyledElement, className, 'style')

  if (contentContainerClassName) {
    patched = patchStyle(
      patched,
      contentContainerClassName,
      'contentContainerStyle',
    )
  }

  return patched
}
