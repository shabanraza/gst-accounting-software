import {
  sentryGlobalFunctionMiddleware,
  sentryGlobalRequestMiddleware,
} from '@sentry/tanstackstart-react'
import { createCsrfMiddleware, createStart } from '@tanstack/react-start'

// Assign the middleware to a variable. Sentry's Vite plugin
// doesn't instrument a middleware array that contains a function call.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === 'serverFn',
})

export const startInstance = createStart(() => {
  return {
    requestMiddleware: [sentryGlobalRequestMiddleware, csrfMiddleware],
    functionMiddleware: [sentryGlobalFunctionMiddleware],
  }
})
