import express, { type NextFunction, type Request, type Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { ZodError } from 'zod'
import { config } from './config.js'
import { prisma } from './db.js'
import { engine, EngineError } from './engine.js'
import { RateLimiter, normalizeCode } from './security.js'
import { joinSchema, loginSchema, quizSchema } from './validation.js'
import { rankBy } from './scoring.js'

declare module 'express-serve-static-core' { interface Request { teacherId?: string } }

export const signTeacher = (id: string) => jwt.sign({ sub: id }, config.jwtSecret, { expiresIn: '12h' })
export function verifyTeacher(token: string | undefined): string | null {
  if (!token) return null
  try { return (jwt.verify(token, config.jwtSecret) as { sub: string }).sub } catch { return null }
}

const loginByIp = new RateLimiter(20, 15 * 60_000)
const loginByEmail = new RateLimiter(8, 15 * 60_000)
const codeFailures = new RateLimiter(30, 10 * 60_000)
const joinAttempts = new RateLimiter(600, 60_000)
const DUMMY_HASH = bcrypt.hashSync('dummy-password', 10)

const ah = (fn: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => fn(req, res).catch(next)

function requireTeacher(req: Request, res: Response, next: NextFunction) {
  const id = verifyTeacher(req.headers.authorization?.replace(/^Bearer /, ''))
  if (!id) return res.status(401).json({ error: 'Connexion requise.' })
  req.teacherId = id
  next()
}

export function buildRouter() {
  const r = express.Router()

  r.get('/health', ah(async (_req, res) => { await prisma.$queryRaw`SELECT 1`; res.json({ ok: true }) }))
  r.get('/config', (_req, res) => res.json({ publicUrl: config.publicUrl }))

  // ---- authentification professeur ----
  r.post('/auth/login', ah(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body)
    const e = email.toLowerCase()
    if (!loginByIp.hit(req.ip || '?') || !loginByEmail.hit(e)) return res.status(429).json({ error: 'Trop de tentatives. Réessayez dans quelques minutes.' })
    const t = await prisma.teacher.findUnique({ where: { email: e } })
    const ok = await bcrypt.compare(password, t?.passwordHash ?? DUMMY_HASH)
    if (!t || !ok) return res.status(401).json({ error: 'E-mail ou mot de passe incorrect.' })
    res.json({ token: signTeacher(t.id), teacher: { id: t.id, name: t.name, email: t.email } })
  }))
  r.get('/auth/me', requireTeacher, ah(async (req, res) => {
    const t = await prisma.teacher.findUnique({ where: { id: req.teacherId } })
    if (!t) return res.status(401).json({ error: 'Connexion requise.' })
    res.json({ id: t.id, name: t.name, email: t.email })
  }))

  // ---- quiz ----
  const quizOut = (q: any) => ({
    id: q.id, title: q.title, description: q.description, isDemo: q.isDemo, updatedAt: q.updatedAt,
    questionCount: q._count?.questions, questions: q.questions?.map((x: any) => ({ id: x.id, text: x.text, options: x.options, correctIndex: x.correctIndex, durationSec: x.durationSec, explanation: x.explanation })),
  })
  const own = (req: Request) => ({ id: String(req.params.id), teacherId: req.teacherId! })

  r.get('/quizzes', requireTeacher, ah(async (req, res) => {
    const list = await prisma.quiz.findMany({ where: { teacherId: req.teacherId }, orderBy: { updatedAt: 'desc' }, include: { _count: { select: { questions: true } } } })
    res.json(list.map(quizOut))
  }))
  r.get('/quizzes/:id', requireTeacher, ah(async (req, res) => {
    const q = await prisma.quiz.findFirst({ where: own(req), include: { questions: { orderBy: { position: 'asc' } } } })
    q ? res.json(quizOut(q)) : res.status(404).json({ error: 'Quiz introuvable.' })
  }))
  const toCreate = (d: ReturnType<typeof quizSchema.parse>) => d.questions.map((q, i) => ({ position: i, text: q.text, options: q.options, correctIndex: q.correctIndex, durationSec: q.durationSec, explanation: q.explanation || null }))
  r.post('/quizzes', requireTeacher, ah(async (req, res) => {
    const d = quizSchema.parse(req.body)
    const q = await prisma.quiz.create({ data: { teacherId: req.teacherId!, title: d.title, description: d.description || null, questions: { create: toCreate(d) } } })
    res.status(201).json({ id: q.id })
  }))
  r.put('/quizzes/:id', requireTeacher, ah(async (req, res) => {
    const d = quizSchema.parse(req.body)
    const ex = await prisma.quiz.findFirst({ where: own(req), select: { id: true } })
    if (!ex) return res.status(404).json({ error: 'Quiz introuvable.' })
    await prisma.$transaction([
      prisma.quizQuestion.deleteMany({ where: { quizId: ex.id } }),
      prisma.quiz.update({ where: { id: ex.id }, data: { title: d.title, description: d.description || null, questions: { create: toCreate(d) } } }),
    ])
    res.json({ id: ex.id })
  }))
  r.post('/quizzes/:id/duplicate', requireTeacher, ah(async (req, res) => {
    const q = await prisma.quiz.findFirst({ where: own(req), include: { questions: { orderBy: { position: 'asc' } } } })
    if (!q) return res.status(404).json({ error: 'Quiz introuvable.' })
    const c = await prisma.quiz.create({ data: { teacherId: q.teacherId, title: `${q.title} (copie)`, description: q.description, questions: { create: q.questions.map((x, i) => ({ position: i, text: x.text, options: x.options as string[], correctIndex: x.correctIndex, durationSec: x.durationSec, explanation: x.explanation })) } } })
    res.status(201).json({ id: c.id })
  }))
  r.delete('/quizzes/:id', requireTeacher, ah(async (req, res) => {
    const n = await prisma.quiz.deleteMany({ where: own(req) })
    n.count ? res.json({ ok: true }) : res.status(404).json({ error: 'Quiz introuvable.' })
  }))

  // ---- sessions ----
  r.get('/sessions', requireTeacher, ah(async (req, res) => {
    const list = await prisma.session.findMany({ where: { teacherId: req.teacherId }, orderBy: { createdAt: 'desc' }, take: 20, include: { _count: { select: { participants: true, questions: true } } } })
    res.json(list.map((s) => ({ id: s.id, code: s.code, quizTitle: s.quizTitle, status: s.status, createdAt: s.createdAt, endedAt: s.endedAt, participants: s._count.participants, questions: s._count.questions })))
  }))
  r.post('/sessions', requireTeacher, ah(async (req, res) => {
    const s = await engine.createSession(req.teacherId!, String(req.body?.quizId ?? ''))
    res.status(201).json({ id: s.id, code: s.code })
  }))
  r.get('/sessions/:id', requireTeacher, ah(async (req, res) => {
    const s = await prisma.session.findFirst({ where: { id: String(req.params.id), teacherId: req.teacherId } })
    s ? res.json({ id: s.id, code: s.code, quizTitle: s.quizTitle, status: s.status }) : res.status(404).json({ error: 'Session introuvable.' })
  }))

  async function results(req: Request) {
    const s = await prisma.session.findFirst({
      where: { id: String(req.params.id), teacherId: req.teacherId },
      include: { questions: { orderBy: { position: 'asc' }, include: { answers: { select: { participantId: true, choiceIndex: true, correct: true, points: true } } } }, participants: true },
    })
    if (!s) return null
    const correctBy = new Map<string, number>()
    for (const q of s.questions) for (const a of q.answers) if (a.correct) correctBy.set(a.participantId, (correctBy.get(a.participantId) ?? 0) + 1)
    const ranking = rankBy(s.participants, (p) => p.totalScore).map(({ rank, item: p }) => ({ rank, id: p.id, fullName: p.fullName, nickname: p.nickname, score: p.totalScore, correct: correctBy.get(p.id) ?? 0 }))
    const questions = s.questions.map((q) => {
      const opts = q.options as string[]
      const closed = q.status === 'CLOSED'
      return {
        position: q.position, text: q.text, options: opts, status: q.status,
        correctIndex: closed ? q.correctIndex : null,
        distribution: opts.map((_, i) => q.answers.filter((a) => a.choiceIndex === i).length),
        answered: q.answers.length, correct: q.answers.filter((a) => a.correct).length,
      }
    })
    return { id: s.id, code: s.code, quizTitle: s.quizTitle, status: s.status, createdAt: s.createdAt, endedAt: s.endedAt, participants: ranking, questions }
  }
  r.get('/sessions/:id/results', requireTeacher, ah(async (req, res) => {
    const d = await results(req)
    d ? res.json(d) : res.status(404).json({ error: 'Session introuvable.' })
  }))
  r.get('/sessions/:id/results.csv', requireTeacher, ah(async (req, res) => {
    const d = await results(req)
    if (!d) return res.status(404).json({ error: 'Session introuvable.' })
    const esc = (v: string | number) => { let s = String(v); if (/^[=+\-@]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"` }
    const lines = ['Rang;Pseudo;Nom complet;Points;Bonnes réponses', ...d.participants.map((p) => [p.rank, esc(p.nickname), esc(p.fullName), p.score, p.correct].join(';'))]
    res.type('text/csv; charset=utf-8').set('Content-Disposition', `attachment; filename="resultats-${d.code}.csv"`).send('\ufeff' + lines.join('\n'))
  }))
  r.post('/sessions/:id/participants/:pid/reset', requireTeacher, ah(async (req, res) => {
    await engine.resetParticipant(String(req.params.id), req.teacherId!, String(req.params.pid))
    res.json({ ok: true })
  }))

  // ---- public étudiant ----
  r.get('/public/sessions/:code', ah(async (req, res) => {
    const ip = req.ip || '?'
    if (codeFailures.count(ip) >= 30) return res.status(429).json({ error: 'Trop d’essais. Patientez quelques minutes.' })
    const s = await engine.lookupCode(normalizeCode(String(req.params.code)))
    if (!s) { codeFailures.hit(ip); return res.status(404).json({ error: 'Code inconnu. Vérifiez-le et réessayez.' }) }
    res.json({ code: s.code, quizTitle: s.quizTitle, ended: s.status === 'ENDED' })
  }))
  r.post('/public/join', ah(async (req, res) => {
    const ip = req.ip || '?'
    if (codeFailures.count(ip) >= 30 || !joinAttempts.hit(ip)) return res.status(429).json({ error: 'Trop d’essais. Patientez quelques minutes.' })
    const d = joinSchema.parse(req.body)
    try {
      res.status(201).json(await engine.join(normalizeCode(d.code), d.fullName, d.nickname))
    } catch (e) {
      if (e instanceof EngineError && e.code === 'NO_SESSION') codeFailures.hit(ip)
      throw e
    }
  }))

  return r
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    const fields = err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
    return res.status(400).json({ error: fields[0]?.message ?? 'Données invalides.', fields })
  }
  if (err instanceof EngineError) return res.status(err.http).json({ error: err.message, code: err.code })
  if ((err as any)?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Requête invalide.' })
  console.error(err)
  res.status(500).json({ error: 'Une erreur est survenue. Réessayez.' })
}
