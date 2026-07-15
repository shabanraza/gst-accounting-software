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
} from 'react-native'

export const Link = (
  props: React.ComponentProps<typeof RouterLink> & { className?: string },
) => {
  // @ts-expect-error react-native-css typing
  return useCssElement(RouterLink, props, { className: 'style' })
}

export const useCSSVariable =
  process.env.EXPO_OS !== 'web'
    ? useFunctionalVariable
    : (variable: string) => `var(${variable})`

export const View = (
  props: React.ComponentProps<typeof RNView> & { className?: string },
) => useCssElement(RNView, props, { className: 'style' })

export const Text = (
  props: React.ComponentProps<typeof RNText> & { className?: string },
) => useCssElement(RNText, props, { className: 'style' })

export const ScrollView = (
  props: React.ComponentProps<typeof RNScrollView> & {
    className?: string
    contentContainerClassName?: string
  },
) => {
  // @ts-expect-error react-native-css typing
  return useCssElement(RNScrollView, props, {
    className: 'style',
    contentContainerClassName: 'contentContainerStyle',
  })
}

export const Pressable = (
  props: React.ComponentProps<typeof RNPressable> & { className?: string },
) => useCssElement(RNPressable, props, { className: 'style' })

export const TextInput = (
  props: React.ComponentProps<typeof RNTextInput> & { className?: string },
) => useCssElement(RNTextInput, props, { className: 'style' })
