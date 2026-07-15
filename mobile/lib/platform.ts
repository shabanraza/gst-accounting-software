export function isExpoWeb() {
  return process.env.EXPO_OS === 'web'
}

export function isAndroidEmulator() {
  if (process.env.EXPO_OS === 'android' && process.env.EXPO_IS_DEVICE === '0') {
    return true
  }

  if (process.env.EXPO_OS !== 'android') {
    return false
  }

  try {
    const { Platform } = require('react-native') as typeof import('react-native')
    const Constants = require('expo-constants').default as {
      isDevice: boolean
    }
    return Platform.OS === 'android' && !Constants.isDevice
  } catch {
    return false
  }
}
