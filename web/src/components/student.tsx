import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Conn } from '../lib/live'
import { reducedMotion } from '../lib/student'

/** Cadre mobile unique : colonne centrée, zones de sécurité, aucune barre fixe. */
export function StudentShell({ children, center = false }: { children: ReactNode; center?: boolean }) {
  return (
    <main className={`mx-auto flex min-h-dvh w-full max-w-md flex-col overflow-x-hidden px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] ${center ? 'justify-center' : ''}`}>
      {children}
    </main>
  )
}

export const Check = ({ className = 'h-9 w-9' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M5 12.5l4.5 4.5L19 7.5" className="animate-draw" style={{ strokeDasharray: 24 }} />
  </svg>
)

export const Cross = ({ className = 'h-9 w-9' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" aria-hidden><path d="M7 7l10 10M17 7L7 17" /></svg>
)

/** Trois points qui respirent : animation d'attente sobre (sans faux chargement). */
export const Breathing = () => (
  <div className="flex items-center justify-center gap-2" aria-hidden>
    {[0, 1, 2].map((i) => <span key={i} className="h-3 w-3 rounded-full bg-brand animate-breathe" style={{ animationDelay: `${i * 220}ms` }} />)}
  </div>
)

/** Statut réseau en flux normal (jamais fixe) : reconnexion, puis « Connexion rétablie » brièvement. */
export function NetStatus({ conn }: { conn: Conn }) {
  const [restored, setRestored] = useState(false)
  const was = useRef<Conn>(conn)
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined
    if (conn === 'online' && was.current === 'offline') { setRestored(true); t = setTimeout(() => setRestored(false), 2500) }
    if (conn !== 'online') setRestored(false)
    was.current = conn
    return () => clearTimeout(t)
  }, [conn])
  if (conn === 'online' && !restored) return null
  const ok = conn === 'online'
  return (
    <div role="status" className={`mb-3 flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-center text-base font-semibold ${ok ? 'bg-ok/10 text-ok' : 'bg-ink text-white'}`}>
      {ok ? <Check className="h-4 w-4" /> : <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-brand" aria-hidden />}
      {ok ? 'Connexion rétablie' : conn === 'connecting' ? 'Connexion en cours…' : 'Reconnexion en cours…'}
    </div>
  )
}

/** Compte de 0 à `to` (désactivé si l'utilisateur réduit les animations). */
export function useCountUp(to: number, ms = 700) {
  const [v, setV] = useState(reducedMotion() ? to : 0)
  useEffect(() => {
    if (reducedMotion() || to <= 0) return setV(to)
    let raf = 0; const t0 = performance.now()
    const step = (t: number) => { const k = Math.min(1, (t - t0) / ms); setV(Math.round(to * (1 - (1 - k) ** 3))); if (k < 1) raf = requestAnimationFrame(step) }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [to, ms])
  return v
}
