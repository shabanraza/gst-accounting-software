import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { expo } from '@better-auth/expo'
import { bearer } from 'better-auth/plugins'
import { tanstackStartCookies } from 'better-auth/tanstack-start'

import { getDb } from '#/db/client.ts'
import * as schema from '#/db/schema.ts'
import {
  getMobileAuthScheme,
  getMobileTrustedOrigins,
  mergeTrustedOrigins,
} from '#/lib/auth-mobile-config.ts'
import { sendPasswordResetEmail, sendVerificationEmail } from '#/lib/email.ts'

const database = getDb()

const googleClientId = process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET

const configuredTrustedOrigins = process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: mergeTrustedOrigins(
    configuredTrustedOrigins ?? [],
    getMobileTrustedOrigins(),
  ),
  ...(database
    ? {
        database: drizzleAdapter(database, {
          provider: 'pg',
          schema: {
            user: schema.user,
            session: schema.session,
            account: schema.account,
            verification: schema.verification,
          },
        }),
      }
    : {}),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({ to: user.email, url })
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail({ to: user.email, url })
    },
  },
  socialProviders:
    googleClientId && googleClientSecret
      ? {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          },
        }
      : {},
  plugins: [
    expo({
      scheme: getMobileAuthScheme(),
    }),
    bearer(),
    tanstackStartCookies(),
  ],
})
