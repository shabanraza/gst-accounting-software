import * as React from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'clothbooks-theme'

function readStoredPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system'
  const value = window.localStorage.getItem(STORAGE_KEY)
  if (value === 'light' || value === 'dark' || value === 'system') {
    return value
  }
  return 'system'
}

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined') return true
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyResolvedTheme(isDark: boolean) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', isDark)
}

export function useTheme() {
  const [mounted, setMounted] = React.useState(false)
  const [preference, setPreference] = React.useState<ThemePreference>('system')
  const [systemDark, setSystemDark] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    setPreference(readStoredPreference())
    setSystemDark(systemPrefersDark())

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (event: MediaQueryListEvent) =>
      setSystemDark(event.matches)
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  const isDark = preference === 'system' ? systemDark : preference === 'dark'

  React.useEffect(() => {
    applyResolvedTheme(isDark)
  }, [isDark])

  const setTheme = React.useCallback((next: ThemePreference) => {
    window.localStorage.setItem(STORAGE_KEY, next)
    setPreference(next)
  }, [])

  const toggle = React.useCallback(() => {
    setTheme(isDark ? 'light' : 'dark')
  }, [isDark, setTheme])

  return { preference, isDark, setTheme, toggle, mounted }
}
