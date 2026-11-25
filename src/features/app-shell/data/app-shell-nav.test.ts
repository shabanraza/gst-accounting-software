import { describe, expect, test } from 'vitest'

import { appNav, filterAppNav } from '#/features/app-shell/data/app-shell-nav.ts'
import type { AppNavSection } from '#/features/app-shell/data/app-shell-nav.ts'

/** Every icon in the sidebar, labelled by where it is rendered. */
function iconUsages(sections: Array<AppNavSection>) {
  return sections.flatMap((section) =>
    section.kind === 'link'
      ? [{ icon: section.icon, label: section.label }]
      : [
          { icon: section.icon, label: `${section.label} (group)` },
          ...section.items.map((item) => ({
            icon: item.icon,
            label: `${section.label} › ${item.label}`,
          })),
        ],
  )
}

describe('appNav icons', () => {
  test('no icon is reused anywhere in the sidebar', () => {
    const seen = new Map<unknown, string>()
    const duplicates: Array<string> = []

    for (const usage of iconUsages(appNav)) {
      const previous = seen.get(usage.icon)
      if (previous) {
        duplicates.push(`${usage.label} reuses the icon from ${previous}`)
        continue
      }
      seen.set(usage.icon, usage.label)
    }

    expect(duplicates).toEqual([])
  })

  test('a group never reuses the icon of one of its own children', () => {
    const collisions = appNav
      .filter((section) => section.kind === 'group')
      .flatMap((section) =>
        section.items
          .filter((item) => item.icon === section.icon)
          .map((item) => `${section.label} › ${item.label}`),
      )

    expect(collisions).toEqual([])
  })
})

describe('Ask AI entry', () => {
  test('sits at the top of the sidebar for members who can view reports', () => {
    expect(filterAppNav(appNav, ['view_reports'])[0]).toMatchObject({
      label: 'Ask AI',
      path: '/app/assistant',
    })
    expect(
      filterAppNav(appNav, ['post_sales']).some(
        (section) => section.kind === 'link' && section.path === '/app/assistant',
      ),
    ).toBe(false)
  })
})
