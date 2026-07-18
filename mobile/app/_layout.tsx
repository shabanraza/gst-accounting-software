import '../src/global.css'

import { useEffect, useState } from 'react'
import { ActivityIndicator } from 'react-native'
import { IBMPlexSans_400Regular, IBMPlexSans_600SemiBold, useFonts } from '@expo-google-fonts/ibm-plex-sans'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import 'react-native-gesture-handler'
import 'react-native-reanimated'

import { ApiHealthGate } from '@/components/api-health-gate'
import { AppProviders } from '@/lib/providers'
import { themeColors } from '@/lib/theme'
import { View } from '@/tw'

const FONT_LOAD_TIMEOUT_MS = 2_000

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
    void SplashScreen.hideAsync().catch(() => {
      /* hide splash as soon as root layout mounts */
    })
  }, [])

  if (!fontsReady) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    )
  }

  return (
    <AppProviders>
      <ApiHealthGate>
        <View className="flex-1">
          <Stack screenOptions={{ headerShown: false, contentStyle: { flex: 1 } }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="(app)" />
          </Stack>
        </View>
      </ApiHealthGate>
    </AppProviders>
  )
}
