import { getSetCookie, hasBetterAuthCookies } from '@better-auth/expo/client'
import { Platform } from 'react-native'

import {
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_PREFIX,
  authCookieStorage,
} from './auth-storage.ts'

export function createMobileAuthCookiePlugin() {
  return {
    id: 'mobile-auth-cookie',
    fetchPlugins: [
      {
        id: 'mobile-auth-cookie',
        name: 'MobileAuthCookie',
        hooks: {
          async onSuccess(context: { response: Response }) {
            if (Platform.OS !== 'web') return

            const setCookie = context.response.headers.get('set-cookie')
            if (!setCookie) return
            if (!hasBetterAuthCookies(setCookie, AUTH_COOKIE_PREFIX)) return

            const prev = authCookieStorage.getItem(AUTH_COOKIE_NAME) ?? '{}'
            const next = getSetCookie(setCookie, prev)
            await authCookieStorage.setItem(AUTH_COOKIE_NAME, next)
          },
        },
      },
    ],
  }
}
