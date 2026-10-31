/** Keeps private and auth-only routes out of search results. */
export function noindexHead() {
  return { meta: [{ name: 'robots', content: 'noindex, nofollow' }] }
}
