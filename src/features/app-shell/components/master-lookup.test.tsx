// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest'

import { MasterLookup } from '#/features/app-shell/components/master-lookup.tsx'

const options = [
  { value: 'p1', label: 'Asha Traders' },
  { value: 'p2', label: 'Bharat Stores' },
]

beforeAll(() => {
  // cmdk and Radix need these browser APIs, which jsdom lacks.
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Element.prototype.scrollIntoView = () => {}
})

afterEach(() => cleanup())

async function pick(label: string) {
  fireEvent.click(screen.getByRole('button', { name: /select/i }))
  const option = await screen.findByText(label)
  await act(async () => {
    fireEvent.click(option)
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
  })
}

describe('MasterLookup', () => {
  test('hands focus to the next field after a pick', async () => {
    const onValueChange = vi.fn()
    const onPicked = vi.fn()
    render(
      <MasterLookup
        onPicked={onPicked}
        onValueChange={onValueChange}
        options={options}
        placeholder="Select party"
        value=""
      />,
    )

    await pick('Bharat Stores')

    expect(onValueChange).toHaveBeenCalledWith('p2')
    expect(onPicked).toHaveBeenCalledTimes(1)
  })

  test('keeps focus on the lookup instead of losing it when nothing is next', async () => {
    render(
      <MasterLookup
        onValueChange={() => {}}
        options={options}
        placeholder="Select party"
        value=""
      />,
    )

    await pick('Asha Traders')

    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: /select party/i }),
    )
  })
})
