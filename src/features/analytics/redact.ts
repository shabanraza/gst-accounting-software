/**
 * Removes secrets and personal data from anything sent to an outside
 * monitoring or analytics service: bearer tokens carried in links, sign-in
 * codes, email addresses and database query values.
 */
const RULES: Array<[RegExp, string]> = [
  // Public invoice links are bearer links.
  [/\/i\/(?!\[token\])[^/?#\s"'&]+/g, '/i/[token]'],
  [/(\/api\/auth\/reset-password\/)(?!\[token\])[^/?#\s"']+/g, '$1[token]'],
  // Also matches the same parameters inside an encoded `next=` address.
  [
    /((?:[?&]|%3F|%26)(?:token|code|state)(?:=|%3D))(?!\[redacted\])(?:[^&#\s"'%]|%(?!26|23)[0-9a-f]{2})+/gi,
    '$1[redacted]',
  ],
  [/[a-z0-9._+-]+(?:@|%40)[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}/gi, '[email]'],
  // Drizzle appends the bound values to its error messages.
  [/(\nparams: )[\s\S]*$/, '$1[redacted]'],
]

export function redactText(text: string) {
  return RULES.reduce(
    (result, [pattern, replacement]) => result.replace(pattern, replacement),
    text,
  )
}

function isPlainObject(value: object) {
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

/** A copy of `value` with every string in it passed through `redactText`. */
export function redactDeep<T>(value: T): T {
  const copies = new Map<object, unknown>()

  function walk(node: unknown): unknown {
    if (typeof node === 'string') return redactText(node)
    if (typeof node !== 'object' || node === null) return node
    if (!Array.isArray(node) && !isPlainObject(node)) return node

    const done = copies.get(node)
    if (done) return done

    if (Array.isArray(node)) {
      const list: Array<unknown> = []
      copies.set(node, list)
      for (const item of node) list.push(walk(item))
      return list
    }

    const copy: Record<string, unknown> = {}
    copies.set(node, copy)
    for (const [key, item] of Object.entries(node)) copy[key] = walk(item)
    return copy
  }

  return walk(value) as T
}
