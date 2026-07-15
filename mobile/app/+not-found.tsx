import { Link, Stack } from 'expo-router'

import { Text, View } from '@/tw'

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View className="flex-1 items-center justify-center gap-4 bg-white px-6">
        <Text className="text-xl font-semibold text-gray-900">
          This screen does not exist.
        </Text>
        <Link href="/">
          <Text className="text-indigo-600">Go to home</Text>
        </Link>
      </View>
    </>
  )
}
