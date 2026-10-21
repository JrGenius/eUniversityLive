import { describe, expect, it } from 'vitest'
import { pointsFor, rankBy, speedBonus } from '../src/scoring.js'

describe('barème', () => {
  it('bonus borné et arrondi à la dizaine', () => {
    expect(speedBonus(0, 20)).toBe(500)
    expect(speedBonus(10_000, 20)).toBe(250)
    expect(speedBonus(19_999, 20)).toBe(0)
    expect(speedBonus(1_000, 20)).toBe(480) // 473.75 -> 480 arrondi à 10
    expect(speedBonus(30_000, 20)).toBe(0)
    expect(speedBonus(-500, 20)).toBe(500)
  })
  it('0 pour une mauvaise réponse, 500 à 1000 selon la rapidité', () => {
    expect(pointsFor(false, 0, 20)).toBe(0)
    expect(pointsFor(true, 0, 20)).toBe(1000)
    expect(pointsFor(true, 10_000, 20)).toBe(750)
    expect(pointsFor(true, 19_900, 20)).toBe(500)
  })
  it('rang partagé en cas d’égalité', () => {
    const r = rankBy([{ s: 900 }, { s: 1000 }, { s: 900 }, { s: 100 }], (x) => x.s).map((x) => x.rank)
    expect(r).toEqual([1, 2, 2, 4])
  })
})
