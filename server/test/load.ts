/* Scénario de charge : N étudiants, pic de réponses dans les dernières secondes.
   Usage : npm run load  (serveur déjà démarré ; variables : BASE_URL, STUDENTS, TEACHER_EMAIL/PASSWORD) */
import { io, type Socket } from 'socket.io-client'

const BASE = process.env.BASE_URL || 'http://localhost:3100'
const N = Number(process.env.STUDENTS || 200)
const QUESTIONS = Number(process.env.QUESTIONS || 3)
const DURATION = 10

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const pct = (a: number[], p: number) => (a.length ? [...a].sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor((p / 100) * a.length))] : 0)
async function api(method: string, path: string, body?: unknown, token?: string) {
  const r = await fetch(`${BASE}/api${path}`, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined })
  return { status: r.status, json: await r.json().catch(() => ({})) }
}
const connect = (auth: object) => new Promise<Socket>((res, rej) => {
  const s = io(BASE, { auth, transports: ['websocket'], reconnection: false })
  s.on('connect', () => res(s)); s.on('connect_error', rej)
})
const emit = (s: Socket, ev: string, p?: unknown) => new Promise<any>((res) => s.timeout(10000).emit(ev, p, (e: any, r: any) => res(e ? { ok: false, code: 'TIMEOUT' } : r)))

const login = await api('POST', '/auth/login', { email: process.env.TEACHER_EMAIL || 'prof@euniversite.local', password: process.env.TEACHER_PASSWORD || 'ChangeMoi!2024' })
const tt = login.json.token
const quiz = await api('POST', '/quizzes', { title: `[CHARGE] ${new Date().toISOString()}`, questions: Array.from({ length: QUESTIONS }, (_, i) => ({ text: `Q${i + 1}`, options: ['A', 'B', 'C', 'D'], correctIndex: i % 4, durationSec: DURATION })) }, tt)
const sess = await api('POST', '/sessions', { quizId: quiz.json.id }, tt)
const { id: sessionId, code } = sess.json

let t0 = Date.now()
const joins = await Promise.all(Array.from({ length: N }, (_, i) => api('POST', '/public/join', { code, fullName: `Load Test ${i}`, nickname: `Load${i}` })))
console.log(`Inscriptions : ${joins.filter((j) => j.status === 201).length}/${N} en ${Date.now() - t0} ms`)
const students = await Promise.all(joins.map((j) => connect({ role: 'student', token: j.json.token })))
console.log(`Connexions WebSocket : ${students.length}`)
const teacher = await connect({ role: 'teacher', token: tt, sessionId })
const projection = await connect({ role: 'screen', code })

let currentState: any
teacher.on('state', (s) => (currentState = s))
const stateAt = (status: string) => new Promise<any>((res) => { if (currentState?.status === status) return res(currentState); const h = (s: any) => { if (s.status === status) { teacher.off('state', h); res(s) } }; teacher.on('state', h) })

const report: any[] = []
for (let qn = 0; qn < QUESTIONS; qn++) {
  await emit(teacher, 'teacher:prepare')
  const ack: number[] = []; const results = { accepted: 0, late: 0, other: 0, dupOk: 0 }
  const opened = new Promise<any>((res) => students[0].once('state', (s) => s.status === 'OPEN' && res(s)))
  const openAt = Date.now()
  await emit(teacher, 'teacher:open')
  const st = await Promise.race([opened, sleep(3000).then(() => null)]) ?? currentState
  const qid = st.question.id
  const deadline = st.question.deadlineAt
  const closedP = stateAt('CORRECTION')
  currentState = { status: 'OPEN' }
  const closedAt = new Promise<number>((res) => projection.on('state', (s) => s.status === 'CORRECTION' && res(Date.now())))

  await Promise.all(students.map(async (s, i) => {
    // 60 % des réponses dans les 3 dernières secondes, le reste réparti avant ; ~5 % arrivent juste APRÈS l'échéance
    const r = Math.random()
    const at = r < 0.05 ? deadline + 20 + Math.random() * 300 : r < 0.65 ? deadline - 3000 + Math.random() * 2950 : openAt + 300 + Math.random() * (DURATION * 1000 - 3500)
    await sleep(Math.max(0, at - Date.now()))
    const choice = Math.floor(Math.random() * 4)
    const t = Date.now()
    const calls = [emit(s, 'answer', { questionId: qid, choiceIndex: choice })]
    if (i % 10 === 0) calls.push(emit(s, 'answer', { questionId: qid, choiceIndex: choice })) // double-clic
    const rs = await Promise.all(calls)
    ack.push(Date.now() - t)
    const r0 = rs[0]
    if (r0.ok) results.accepted++; else if (r0.code === 'LATE' || r0.code === 'CLOSED') results.late++; else results.other++
  }))
  const closed = await closedP
  const closeLatency = (await closedAt) - deadline
  const { default: pg } = await import('@prisma/client').then((m) => ({ default: new m.PrismaClient() }))
  const rows = await pg.answer.count({ where: { questionId: qid } })
  const dups = await pg.$queryRaw<{ n: bigint }[]>`SELECT count(*) n FROM (SELECT 1 FROM "Answer" WHERE "questionId"=${qid} GROUP BY "participantId" HAVING count(*)>1) x`
  const sumAns = await pg.$queryRaw<{ s: bigint | null }[]>`SELECT sum(points) s FROM "Answer" WHERE "questionId" IN (SELECT id FROM "SessionQuestion" WHERE "sessionId"=${sessionId})`
  const sumTot = await pg.$queryRaw<{ s: bigint | null }[]>`SELECT sum("totalScore") s FROM "Participant" WHERE "sessionId"=${sessionId}`
  await pg.$disconnect()
  report.push({ q: qn + 1, ...results, answersInDb: rows, duplicateRows: Number(dups[0].n), ackP50: pct(ack, 50), ackP95: pct(ack, 95), ackMax: Math.max(...ack), closeLatencyMs: closeLatency, pointsAnswersEqTotals: String(sumAns[0].s) === String(sumTot[0].s), distributionSum: closed.correction.distribution.reduce((a: number, b: number) => a + b, 0) })
  await sleep(500)
}
await emit(teacher, 'teacher:end')
console.table(report)
console.log('Mémoire serveur/clients non mesurée ici. Les latences incluent le client de test local (même machine).')
students.forEach((s) => s.close()); teacher.close(); projection.close()
process.exit(0)
