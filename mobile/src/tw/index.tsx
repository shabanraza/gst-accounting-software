import {
  useCssElement,
  useNativeVariable as useFunctionalVariable,
} from 'react-native-css'
import { Link as RouterLink } from 'expo-router'
import React from 'react'
import {
  View as RNView,
  Text as RNText,
  Pressable as RNPressable,
  ScrollView as RNScrollView,
  TextInput as RNTextInput,
  KeyboardAvoidingView as RNKeyboardAvoidingView,
} from 'react-native'

import { withPostCssLayoutFallback } from './layout-fallback'

export const Link = (
  props: React.ComponentProps<typeof RouterLink> & { className?: string },
) => useCssElement(RouterLink, props, { className: 'style' })

export const useCSSVariable =
  process.env.EXPO_OS !== 'web'
    ? useFunctionalVariable
    : (variable: string) => `var(${variable})`

export function View(
  props: React.ComponentProps<typeof RNView> & { className?: string },
) {
  const { className } = props
  const element = useCssElement(RNView, props, { className: 'style' })
  return withPostCssLayoutFallback(element, className)
}

export function Text(
  props: React.ComponentProps<typeof RNText> & { className?: string },
) {
  const { className } = props
  const element = useCssElement(RNText, props, { className: 'style' })
  return withPostCssLayoutFallback(element, className)
}

export function ScrollView(
  props: React.ComponentProps<typeof RNScrollView> & {
    className?: string
    contentContainerClassName?: string
  },
) {
  const { className, contentContainerClassName } = props
  // @ts-expect-error react-native-css typing
  const element = useCssElement(RNScrollView, props, {
    className: 'style',
    contentContainerClassName: 'contentContainerStyle',
  })
  return withPostCssLayoutFallback(element, className, contentContainerClassName)
}

export function Pressable(
  props: React.ComponentProps<typeof RNPressable> & { className?: string },
) {
  const { className } = props
  const element = useCssElement(RNPressable, props, { className: 'style' })
  return withPostCssLayoutFallback(element, className)
}

export function TextInput(
  props: React.ComponentProps<typeof RNTextInput> & { className?: string },
) {
  return useCssElement(RNTextInput, props, { className: 'style' })
}

export function KeyboardAvoidingView(
  props: React.ComponentProps<typeof RNKeyboardAvoidingView> & { className?: string },
) {
  const { className } = props
  const element = useCssElement(RNKeyboardAvoidingView, props, { className: 'style' })
  return withPostCssLayoutFallback(element, className)
}
