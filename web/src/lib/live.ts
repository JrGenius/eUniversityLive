import { useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

export interface Question { id: string; index: number; text: string; options: string[]; durationSec: number; openedAt: number | null; deadlineAt: number | null }
export interface Ranked { rank: number; name: string; score: number }
export interface TParticipant { id: string; fullName: string; nickname: string; studentId: string | null; score: number; connected: boolean; answered: boolean; claimable: boolean }
export interface LiveState {
  code: string; status: 'WAITING' | 'READY' | 'OPEN' | 'CORRECTION' | 'ENDED'; quizTitle: string; serverNow: number
  totalQuestions: number; currentIndex: number; registered: number; connected: number; answered: number
  question: Question | null; nextDurationSec: number | null
  correction?: { correctIndex: number | null; poll?: boolean; explanation: string | null; distribution: number[] }
  top5?: Ranked[]; isLast?: boolean; podium?: Ranked[]; top10?: Ranked[]; participants?: TParticipant[]
}
export interface Me {
  nickname: string; fullName: string; total: number; rank: number | null; participants: number
  answered: { questionId: string; choiceIndex: number } | null
  result?: { questionId: string; choiceIndex: number | null; correct: boolean; points: number; poll?: boolean }
  final?: { correctCount: number; questions: number }
}
export type Conn = 'connecting' | 'online' | 'offline' | 'denied'

export function useLive(auth: Record<string, unknown> | null) {
  const [state, setState] = useState<LiveState | null>(null)
  const [me, setMe] = useState<Me | null>(null)
  const [conn, setConn] = useState<Conn>('connecting')
  const offset = useRef(0)
  const sock = useRef<Socket | null>(null)
  const key = JSON.stringify(auth)

  useEffect(() => {
    if (!auth) return
    setConn('connecting')
    const s = io({ auth, transports: ['websocket', 'polling'], reconnectionDelayMax: 3000 })
    sock.current = s
    s.on('connect', () => setConn('online'))
    s.on('disconnect', (reason) => setConn(reason === 'io server disconnect' ? 'denied' : 'offline'))
    s.on('connect_error', (e) => {
      if (['UNAUTHORIZED', 'FORBIDDEN', 'NO_SESSION'].includes(e.message)) { setConn('denied'); s.disconnect() } else setConn('offline')
    })
    s.on('kicked', () => { setConn('denied'); s.disconnect() })
    s.on('state', (st: LiveState) => { offset.current = st.serverNow - Date.now(); setState(st) })
    s.on('counts', (c) => setState((st) => (st ? { ...st, ...c } : st)))
    s.on('me', setMe)
    return () => { s.close(); sock.current = null }
  }, [key])

  const call = <T = any>(ev: string, payload?: unknown, timeout = 6000) =>
    new Promise<T>((resolve, reject) => {
      const s = sock.current
      if (!s) return reject(new Error('Connexion perdue.'))
      s.timeout(timeout).emit(ev, payload, (err: Error | null, res: T) => (err ? reject(new Error('Pas de réponse du serveur.')) : resolve(res)))
    })
  /** Heure serveur estimée (ms). */
  const serverNow = () => Date.now() + offset.current
  return { state, me, setMe, conn, call, serverNow }
}

/** Temps restant (secondes, décimal) jusqu'à l'échéance, rafraîchi 10×/s. */
export function useRemaining(deadlineAt: number | null | undefined, serverNow: () => number) {
  const [, tick] = useState(0)
  useEffect(() => {
    if (!deadlineAt) return
    const t = setInterval(() => tick((n) => n + 1), 100)
    return () => clearInterval(t)
  }, [deadlineAt])
  return deadlineAt ? Math.max(0, (deadlineAt - serverNow()) / 1000) : 0
}
