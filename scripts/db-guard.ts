/**
 * Stops schema and data scripts from changing a hosted database by accident,
 * for example when `.env` still points at production. A hosted database is
 * changed only when its host is named for that one run in DB_CONFIRM_HOST.
 */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

export function schemaChangeRefusal(input: {
  databaseUrl?: string
  confirmedHost?: string
}): string | null {
  let host = ''
  try {
    host = new URL(input.databaseUrl ?? '').hostname
  } catch {
    // Reported below without repeating the value, which holds a password.
  }
  if (!host) return 'DATABASE_URL is missing or is not a database address.'
  if (LOCAL_HOSTS.has(host) || input.confirmedHost === host) return null

  return [
    `Refusing to change the database at ${host}.`,
    'If this is really the database you mean, name its host for this run:',
    `  bash:       DB_CONFIRM_HOST=${host} bun run <script>`,
    `  PowerShell: $env:DB_CONFIRM_HOST="${host}"; bun run <script>; Remove-Item Env:DB_CONFIRM_HOST`,
    'Do not put DB_CONFIRM_HOST in an .env file.',
  ].join('\n')
}

/** Exits before any connection is opened when the target is not confirmed. */
export function assertSchemaChangeAllowed() {
  const refusal = schemaChangeRefusal({
    databaseUrl: process.env.DATABASE_URL,
    confirmedHost: process.env.DB_CONFIRM_HOST,
  })
  if (refusal) {
    console.error(refusal)
    process.exit(1)
  }
}
