import '../src/global.css'

import { IBMPlexSans_400Regular, IBMPlexSans_600SemiBold, useFonts } from '@expo-google-fonts/ibm-plex-sans'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect, useState } from 'react'
import 'react-native-gesture-handler'
import 'react-native-reanimated'

import { ApiHealthGate } from '@/components/api-health-gate'
import { AppProviders } from '@/lib/providers'

const FONT_LOAD_TIMEOUT_MS = 8_000
const SPLASH_HIDE_TIMEOUT_MS = 10_000

SplashScreen.preventAutoHideAsync().catch(() => {
  /* splash may already be hidden in dev reloads */
})

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    IBMPlexSans_400Regular,
    IBMPlexSans_600SemiBold,
  })
  const [fontTimedOut, setFontTimedOut] = useState(false)

  const fontsReady = fontsLoaded || Boolean(fontError) || fontTimedOut

  useEffect(() => {
    const timer = setTimeout(() => setFontTimedOut(true), FONT_LOAD_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      void SplashScreen.hideAsync().catch(() => {
        /* force-hide splash if font loading stalls on Android */
      })
    }, SPLASH_HIDE_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (fontsReady) {
      void SplashScreen.hideAsync().catch(() => {
        /* ignore if splash is already hidden */
      })
    }
  }, [fontsReady])

  if (!fontsReady) return null

  return (
    <AppProviders>
      <ApiHealthGate>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(app)" />
        </Stack>
      </ApiHealthGate>
    </AppProviders>
  )
}
