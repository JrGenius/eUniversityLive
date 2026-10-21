import type { Server as HttpServer } from 'node:http'
import { Server, type Socket } from 'socket.io'
import { config } from './config.js'
import { engine, EngineError, type Hub, type Live } from './engine.js'
import { authenticateTeacher } from './http.js'
import { RateLimiter, normalizeCode } from './security.js'

const answerLimiter = new RateLimiter(30, 10_000)
const badAuth = new RateLimiter(60, 60_000)

type Ack = (r: unknown) => void
const fail = (e: unknown) => {
  if (e instanceof EngineError) return { ok: false, code: e.code, error: e.message }
  console.error(e)
  return { ok: false, code: 'INTERNAL', error: 'Une erreur est survenue. Réessayez.' }
}

export function attachSockets(http: HttpServer) {
  const io = new Server(http, {
    cors: config.corsOrigins.length ? { origin: config.corsOrigins } : undefined,
    pingInterval: 8000, pingTimeout: 8000, maxHttpBufferSize: 10_000,
  })
  const studentSockets = new Map<string, Set<Socket>>()
  const room = (id: string, kind: 'teacher' | 'aud') => `s:${id}:${kind}`

  const hub: Hub = {
    broadcastState(l) {
      const live = l as Live
      io.to(room(live.id, 'aud')).emit('state', engine.state(live, 'audience'))
      io.to(room(live.id, 'teacher')).emit('state', engine.state(live, 'teacher'))
    },
    sendMe(sid, pid) {
      const socks = studentSockets.get(pid)
      if (!socks?.size) return
      void engine.getLive(sid).then((l) => { if (l) { const me = engine.me(l, pid); for (const s of socks) s.emit('me', me) } })
    },
    broadcastCounts(sid, counts) { io.to(`s:${sid}:aud`).to(`s:${sid}:teacher`).emit('counts', counts) },
    kick(pid) { for (const s of studentSockets.get(pid) ?? []) { s.emit('kicked'); s.disconnect(true) } },
  }
  engine.hub = hub

  io.use(async (socket, next) => {
    const a = socket.handshake.auth ?? {}
    const ip = socket.handshake.address
    const deny = (m: string) => { badAuth.hit(ip); next(new Error(m)) }
    if (!badAuth.hit(ip + ':probe') && badAuth.count(ip) > 50) return next(new Error('RATE_LIMIT'))
    try {
      if (a.role === 'teacher') {
        const t = await authenticateTeacher(a.token)
        if (!t) return deny('UNAUTHORIZED')
        const l = await engine.getLive(String(a.sessionId ?? ''))
        if (!l || l.teacherId !== t.id) return deny('FORBIDDEN')
        Object.assign(socket.data, { role: 'teacher', teacherId: t.id, live: l })
      } else if (a.role === 'student') {
        const au = typeof a.token === 'string' ? await engine.authenticate(a.token) : null
        if (!au) return deny('UNAUTHORIZED')
        Object.assign(socket.data, { role: 'student', live: au.live, participantId: au.participantId })
      } else if (a.role === 'screen') {
        const l = await engine.getLive(normalizeCode(String(a.code ?? '')))
        if (!l) return deny('NO_SESSION')
        Object.assign(socket.data, { role: 'screen', live: l })
      } else return deny('UNAUTHORIZED')
      next()
    } catch (e) { console.error(e); next(new Error('INTERNAL')) }
  })

  io.on('connection', (socket) => {
    const { role, live } = socket.data as { role: string; live: Live; participantId?: string; teacherId?: string }
    if (role === 'teacher') {
      const tid = socket.data.teacherId as string
      void socket.join(room(live.id, 'teacher'))
      socket.emit('state', engine.state(live, 'teacher'))
      const cmd = (name: string, fn: () => Promise<unknown>) => socket.on(name, async (_p: unknown, ack?: Ack) => {
        const cb = typeof _p === 'function' ? (_p as Ack) : ack
        try { await fn(); cb?.({ ok: true }) } catch (e) { cb?.(fail(e)) }
      })
      cmd('teacher:prepare', () => engine.prepareNext(live.id, tid))
      cmd('teacher:open', () => engine.openQuestion(live.id, tid))
      cmd('teacher:end', () => engine.endSession(live.id, tid))
      socket.on('teacher:reset', async (p: { participantId?: string }, ack?: Ack) => {
        try { await engine.resetParticipant(live.id, tid, String(p?.participantId)); ack?.({ ok: true }) } catch (e) { ack?.(fail(e)) }
      })
      return
    }
    void socket.join(room(live.id, 'aud'))
    socket.emit('state', engine.state(live, 'audience'))
    if (role !== 'student') return

    const pid = socket.data.participantId as string
    let set = studentSockets.get(pid)
    if (!set) studentSockets.set(pid, (set = new Set()))
    set.add(socket)
    engine.attach(live, pid)
    socket.emit('me', engine.me(live, pid))
    socket.on('disconnect', () => {
      set!.delete(socket)
      if (!set!.size) studentSockets.delete(pid)
      engine.detach(live, pid)
    })
    socket.on('answer', async (p: { questionId?: string; choiceIndex?: number }, ack?: Ack) => {
      if (typeof ack !== 'function') return
      if (!answerLimiter.hit(pid)) return ack({ ok: false, code: 'RATE_LIMIT', error: 'Trop de tentatives, patientez un instant.' })
      try {
        const r = await engine.submit(live, pid, String(p?.questionId), Number(p?.choiceIndex))
        ack({ ok: true, ...r })
      } catch (e) { ack(fail(e)) }
    })
  })

  return io
}
