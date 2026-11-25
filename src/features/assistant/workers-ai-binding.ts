import type { AiBinding } from '#/features/assistant/assistant-service.ts'

/**
 * Reads the Workers AI binding (`ai.binding = "AI"` in wrangler.jsonc).
 * Imported lazily so tests and non-Worker runtimes never load
 * `cloudflare:workers`; returns undefined where the binding is missing.
 */
export async function getWorkersAi(): Promise<AiBinding | undefined> {
  try {
    const { env } = await import('cloudflare:workers')
    return (env as { AI?: AiBinding }).AI
  } catch {
    return undefined
  }
}
