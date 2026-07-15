import { Link, Stack } from 'expo-router'

import { Text, View } from '@/tw'

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View className="flex-1 items-center justify-center gap-4 bg-background px-page-x">
        <Text className="text-xl font-semibold text-foreground">
          This screen does not exist.
        </Text>
        <Link href="/">
          <Text className="text-primary">Go to home</Text>
        </Link>
      </View>
    </>
  )
}
