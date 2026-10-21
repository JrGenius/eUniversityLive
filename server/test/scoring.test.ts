import { describe, expect, it } from 'vitest'
import { pointsFor, rankBy, speedBonus } from '../src/scoring.js'

describe('barème', () => {
  it('bonus borné', () => {
    expect(speedBonus(0, 20)).toBe(5)
    expect(speedBonus(10_000, 20)).toBe(3) // 2.5 -> 3
    expect(speedBonus(19_999, 20)).toBe(0)
    expect(speedBonus(1_000, 20)).toBe(5)
    expect(speedBonus(30_000, 20)).toBe(0)
    expect(speedBonus(-500, 20)).toBe(5)
  })
  it('0 pour une mauvaise réponse, 5 à 10 selon la rapidité', () => {
    expect(pointsFor(false, 0, 20)).toBe(0)
    expect(pointsFor(true, 0, 20)).toBe(10)
    expect(pointsFor(true, 10_000, 20)).toBe(8)
    expect(pointsFor(true, 19_900, 20)).toBe(5)
  })
  it('rang partagé en cas d’égalité', () => {
    const r = rankBy([{ s: 9 }, { s: 10 }, { s: 9 }, { s: 1 }], (x) => x.s).map((x) => x.rank)
    expect(r).toEqual([1, 2, 2, 4])
  })
})
