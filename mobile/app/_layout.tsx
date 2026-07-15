import '../src/global.css'

import { IBMPlexSans_400Regular, IBMPlexSans_600SemiBold, useFonts } from '@expo-google-fonts/ibm-plex-sans'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import 'react-native-gesture-handler'
import 'react-native-reanimated'

import { AppProviders } from '@/lib/providers'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [loaded, error] = useFonts({
    IBMPlexSans_400Regular,
    IBMPlexSans_600SemiBold,
  })

  useEffect(() => {
    if (error) throw error
  }, [error])

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync()
  }, [loaded])

  if (!loaded) return null

  return (
    <AppProviders>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(app)" />
      </Stack>
    </AppProviders>
  )
}
