import crypto from 'node:crypto'
import { config } from './config.js'

export const newToken = () => crypto.randomBytes(32).toString('base64url')
export const hashToken = (t: string) => crypto.createHash('sha256').update(t).digest('hex')

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export function newSessionCode(len = 6) {
  let s = ''
  for (const b of crypto.randomBytes(len)) s += ALPHABET[b % ALPHABET.length]
  return s
}
export const normalizeCode = (c: string) => c.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
export const normalizeNickname = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ')

/** Limiteur à fenêtre glissante, en mémoire (processus unique). */
export class RateLimiter {
  private hits = new Map<string, number[]>()
  constructor(private max: number, private windowMs: number) {
    setInterval(() => this.gc(), 60_000).unref()
  }
  /** Retourne false si la limite est dépassée. */
  hit(key: string): boolean {
    if (config.disableRateLimit) return true
    const now = Date.now()
    const arr = (this.hits.get(key) || []).filter((t) => now - t < this.windowMs)
    arr.push(now)
    this.hits.set(key, arr)
    return arr.length <= this.max
  }
  count(key: string) {
    const now = Date.now()
    return (this.hits.get(key) || []).filter((t) => now - t < this.windowMs).length
  }
  private gc() {
    const now = Date.now()
    for (const [k, v] of this.hits) if (!v.some((t) => now - t < this.windowMs)) this.hits.delete(k)
  }
}
