import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Conn } from '../lib/live'

export const Logo = ({ className = 'h-9' }: { className?: string }) => <img src="/logo.png" alt="eUniversité" className={`${className} w-auto object-contain`} />

export const Spinner = ({ label = 'Chargement…' }: { label?: string }) => (
  <div role="status" className="flex flex-col items-center gap-3 py-16 text-ink-soft">
    <div className="h-9 w-9 animate-spin rounded-full border-4 border-line border-t-brand" />
    <span>{label}</span>
  </div>
)

export const ErrorBox = ({ children }: { children: ReactNode }) => (
  <div role="alert" className="rounded-xl border border-bad/30 bg-bad/10 px-4 py-3 text-sm font-medium text-bad">{children}</div>
)

export function ConnectionBanner({ conn }: { conn: Conn }) {
  if (conn === 'online') return null
  const text = conn === 'connecting' ? 'Connexion en cours…' : 'Connexion perdue. Reconnexion automatique…'
  return (
    <div role="status" className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-ink px-4 py-2 text-center text-sm font-semibold text-white">
      <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-brand" /> {text}
    </div>
  )
}

export function Screen({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return <main className={`mx-auto min-h-screen w-full ${wide ? 'max-w-6xl' : 'max-w-md'} px-4 pb-10 pt-6`}>{children}</main>
}

export const ANS = [
  { letter: 'A', symbol: '▲', bg: 'bg-ans-a', name: 'rouge' },
  { letter: 'B', symbol: '◆', bg: 'bg-ans-b', name: 'bleu' },
  { letter: 'C', symbol: '●', bg: 'bg-ans-c', name: 'vert' },
  { letter: 'D', symbol: '■', bg: 'bg-ans-d', name: 'violet' },
]

export function TeacherNav({ title, right }: { title?: ReactNode; right?: ReactNode }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2">
        <Link to="/enseignant" className="flex items-center gap-3"><Logo />{title && <span className="hidden font-bold sm:inline">{title}</span>}</Link>
        <div className="flex items-center gap-2">{right}</div>
      </div>
    </header>
  )
}

export const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.ceil(s % 60) % 60).padStart(2, '0')}`
export const fmtDate = (d: string) => new Date(d).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
