import { describe, expect, it } from 'vitest'
import { pointsFor, rankBy, speedBonus } from '../src/scoring.js'

describe('barème', () => {
  it('bonus borné et arrondi', () => {
    expect(speedBonus(0, 20)).toBe(200)
    expect(speedBonus(10_000, 20)).toBe(100)
    expect(speedBonus(19_999, 20)).toBe(0)
    expect(speedBonus(1_000, 20)).toBe(190)
    expect(speedBonus(1_050, 20)).toBe(190) // 189.5 -> 190
    expect(speedBonus(30_000, 20)).toBe(0)
    expect(speedBonus(-500, 20)).toBe(200)
  })
  it('0 pour une mauvaise réponse, 800 + bonus sinon', () => {
    expect(pointsFor(false, 0, 20)).toBe(0)
    expect(pointsFor(true, 10_000, 20)).toBe(900)
    expect(pointsFor(true, 19_900, 20)).toBe(801)
  })
  it('rang partagé en cas d’égalité', () => {
    const r = rankBy([{ s: 900 }, { s: 1000 }, { s: 900 }, { s: 100 }], (x) => x.s).map((x) => x.rank)
    expect(r).toEqual([1, 2, 2, 4])
  })
})
