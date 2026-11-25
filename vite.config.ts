import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import { sentryTanstackStart } from '@sentry/tanstackstart-react/vite'
import neon from './neon-vite-plugin.ts'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    neon,
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    babel({ presets: [reactCompilerPreset()] }),
    // Sentry must be the last plugin. Source map upload only happens when
    // SENTRY_AUTH_TOKEN + SENTRY_ORG + SENTRY_PROJECT are all set (or in a
    // .env.sentry-build-plugin file); error capture works without them.
    sentryTanstackStart({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
})

export default config
