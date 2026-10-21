import { ANS } from './ui'
import type { Ranked } from '../lib/live'

export function Distribution({ options, dist, correct, big = false }: { options: string[]; dist: number[]; correct: number | null; big?: boolean }) {
  const max = Math.max(1, ...dist)
  return (
    <div className={big ? 'space-y-4' : 'space-y-2'}>
      {options.map((o, i) => (
        <div key={i} className={`flex items-center gap-3 ${big ? 'text-2xl' : 'text-sm'}`}>
          <span className={`flex shrink-0 items-center gap-2 font-bold ${big ? 'w-72' : 'w-40'} ${i === correct ? 'text-ok' : 'text-ink-soft'}`}>
            <span className={`grid shrink-0 place-items-center rounded-lg text-white ${ANS[i].bg} ${big ? 'h-11 w-11' : 'h-7 w-7 text-xs'}`} aria-hidden>{ANS[i].letter}</span>
            <span className="truncate">{o}</span>{i === correct && <span aria-label="bonne réponse">✓</span>}
          </span>
          <div className={`flex-1 overflow-hidden rounded-full bg-line ${big ? 'h-8' : 'h-4'}`}><div className={`h-full rounded-full transition-all duration-500 ${i === correct ? 'bg-ok' : 'bg-ink-soft/50'}`} style={{ width: `${(dist[i] / max) * 100}%` }} /></div>
          <span className="w-10 text-right font-bold tabular-nums">{dist[i]}</span>
        </div>
      ))}
    </div>
  )
}

export function TopList({ items, big = false }: { items: Ranked[]; big?: boolean }) {
  return (
    <ol className={big ? 'space-y-3' : 'space-y-1.5'}>
      {items.map((p, i) => (
        <li key={i} className={`flex items-center gap-3 rounded-xl bg-card px-4 border border-line animate-rise ${big ? 'py-3 text-3xl' : 'py-2'}`} style={{ animationDelay: `${i * 60}ms` }}>
          <span className={`grid place-items-center rounded-full bg-brand font-extrabold ${big ? 'h-12 w-12' : 'h-8 w-8 text-sm'}`}>{p.rank}</span>
          <span className="flex-1 truncate font-semibold">{p.name}</span>
          <span className="font-extrabold tabular-nums">{p.score}</span>
        </li>
      ))}
    </ol>
  )
}

export function Podium({ items, big = false }: { items: Ranked[]; big?: boolean }) {
  const byRank = (r: number) => items.filter((p) => p.rank === r)
  const cols = [2, 1, 3]
  const h: Record<number, string> = big ? { 1: 'h-64', 2: 'h-44', 3: 'h-32' } : { 1: 'h-36', 2: 'h-24', 3: 'h-16' }
  const medal: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }
  return (
    <div className="flex items-end justify-center gap-3">
      {cols.map((r) => (
        <div key={r} className="flex flex-1 flex-col items-center justify-end gap-2 text-center animate-rise" style={{ animationDelay: `${(4 - r) * 250}ms` }}>
          <div className={big ? 'text-3xl' : 'text-base'}>{byRank(r).map((p, i) => <div key={i} className="font-bold">{p.name}</div>)}{!byRank(r).length && <span className="text-ink-soft">—</span>}</div>
          <div className={big ? 'text-2xl font-extrabold' : 'font-extrabold'}>{byRank(r)[0]?.score ?? ''}</div>
          <div className={`flex w-full items-start justify-center rounded-t-2xl bg-brand pt-2 ${h[r]} ${big ? 'text-6xl' : 'text-3xl'}`} aria-label={`${r}${r === 1 ? 'er' : 'e'} rang`}>{medal[r]}</div>
        </div>
      ))}
    </div>
  )
}
