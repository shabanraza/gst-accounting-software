// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'

import {
  AskAiDemo,
  askAiDemoFinal,
  askAiDemoStart,
  nextAskAiDemoState,
} from '#/features/marketing/components/ask-ai-demo.tsx'
import { ASK_AI_DEMO } from '#/features/marketing/landing-content.ts'

import type { AskAiDemoState } from '#/features/marketing/components/ask-ai-demo.tsx'

afterEach(() => {
  cleanup()
})

/** Plays the replay from `state` until `stop` returns true. */
function playUntil(
  state: AskAiDemoState,
  stop: (state: AskAiDemoState) => boolean,
) {
  const frames = [state]
  let current = state
  for (let guard = 0; guard < 500 && !stop(current); guard += 1) {
    current = nextAskAiDemoState(current).state
    frames.push(current)
  }
  return frames
}

describe('AskAiDemo', () => {
  test('types the question, works, then reveals every figure and the link', () => {
    const [first] = ASK_AI_DEMO.scenarios
    const frames = playUntil(askAiDemoStart(), (state) => state.scenario === 1)

    const typing = frames.filter(
      (frame) => frame.phase === 'typing' && frame.scenario === 0,
    )
    expect(typing.at(-1)?.typed).toBe(first.question.length)

    const phases = [...new Set(frames.map((frame) => frame.phase))]
    expect(phases).toEqual(['typing', 'working', 'answer'])

    const answers = frames.filter((frame) => frame.phase === 'answer')
    expect(answers.at(-1)?.shown).toBe(first.figures.length + 1)
    expect(answers.at(-1)).toEqual(askAiDemoFinal)
  })

  test('moves to the next question after holding the answer, then loops', () => {
    const next = nextAskAiDemoState(askAiDemoFinal)
    expect(next.delay).toBeGreaterThanOrEqual(3000)
    expect(next.state).toEqual(askAiDemoStart(1))

    const frames = playUntil(askAiDemoStart(1), (state) => state.scenario === 0)
    expect(frames.at(-1)).toEqual(askAiDemoStart(0))
  })

  test('renders the finished first answer before playback', () => {
    render(<AskAiDemo />)
    const [first] = ASK_AI_DEMO.scenarios

    const demo = screen.getByRole('img', { name: ASK_AI_DEMO.label })
    expect(demo.textContent).toContain(first.question)
    expect(demo.textContent).toContain(first.answer)
    for (const figure of first.figures) {
      expect(demo.textContent).toContain(figure.label)
      expect(demo.textContent).toContain(figure.amount)
    }
    expect(demo.textContent).toContain(first.link)
  })
})
