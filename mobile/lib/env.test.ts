import { afterEach, describe, expect, it, vi } from 'vitest'

describe('mobile env', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('defaults to local web API for development', async () => {
    const { resolveApiBaseUrl, resolveTrpcUrl } = await import('./env.ts')

    expect(resolveApiBaseUrl()).toBe('http://localhost:3000')
    expect(resolveTrpcUrl()).toBe('http://localhost:3000/api/trpc')
  })

  it('uses localhost on Expo web even when EXPO_PUBLIC_API_URL is set', async () => {
    vi.stubEnv('EXPO_OS', 'web')
    vi.stubEnv('EXPO_PUBLIC_API_URL', 'http://192.168.1.100:3000')

    const { resolveApiBaseUrl, getApiReachabilityHint } = await import('./env.ts')

    expect(resolveApiBaseUrl()).toBe('http://localhost:3000')
    expect(getApiReachabilityHint()).toContain('bun run dev')
    expect(getApiReachabilityHint()).not.toContain('dev:lan')
  })

  it('uses EXPO_PUBLIC_API_URL on native', async () => {
    vi.stubEnv('EXPO_OS', 'ios')
    vi.stubEnv('EXPO_IS_DEVICE', '1')
    vi.stubEnv('EXPO_PUBLIC_API_URL', 'http://192.168.1.100:3000')

    const { resolveApiBaseUrl, getApiReachabilityHint } = await import('./env.ts')

    expect(resolveApiBaseUrl()).toBe('http://192.168.1.100:3000')
    expect(getApiReachabilityHint()).toContain('dev:lan')
    expect(getApiReachabilityHint()).toContain('EXPO_PUBLIC_API_URL')
  })

  it('defaults to 10.0.2.2 on Android emulator when EXPO_PUBLIC_API_URL is unset', async () => {
    vi.stubEnv('EXPO_OS', 'android')
    vi.stubEnv('EXPO_IS_DEVICE', '0')

    const { resolveApiBaseUrl, getApiReachabilityHint } = await import('./env.ts')

    expect(resolveApiBaseUrl()).toBe('http://10.0.2.2:3000')
    expect(getApiReachabilityHint()).toContain('10.0.2.2')
  })

  it('rewrites localhost to 10.0.2.2 on Android emulator', async () => {
    vi.stubEnv('EXPO_OS', 'android')
    vi.stubEnv('EXPO_IS_DEVICE', '0')
    vi.stubEnv('EXPO_PUBLIC_API_URL', 'http://localhost:3000')

    const { resolveApiBaseUrl } = await import('./env.ts')

    expect(resolveApiBaseUrl()).toBe('http://10.0.2.2:3000')
  })
})
