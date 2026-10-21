import { BASE_POINTS, MAX_BONUS } from './config.js'

export function speedBonus(elapsedMs: number, durationSec: number): number {
  // Arrondi à la dizaine : des scores ronds (+930) plutôt qu'arbitraires (+928).
  const raw = Math.round((MAX_BONUS * (1 - elapsedMs / (durationSec * 1000))) / 10) * 10
  return Math.min(MAX_BONUS, Math.max(0, raw))
}

export function pointsFor(correct: boolean, elapsedMs: number, durationSec: number): number {
  return correct ? BASE_POINTS + speedBonus(elapsedMs, durationSec) : 0
}

export interface Ranked<T> { rank: number; item: T }

/** Rang de compétition : 1, 1, 3… (égalités partagées). */
export function rankBy<T>(items: T[], score: (t: T) => number): Ranked<T>[] {
  const sorted = [...items].sort((a, b) => score(b) - score(a))
  let rank = 0
  return sorted.map((item, i) => {
    if (i === 0 || score(item) !== score(sorted[i - 1])) rank = i + 1
    return { rank, item }
  })
}
