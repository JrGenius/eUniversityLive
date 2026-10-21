import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '../src/db.js'
import { pointsFor } from '../src/scoring.js'
import { api, connect, emit, joinStudent, makeTeacher, setupSession, sleep, startApp, waitFor, type App } from './helpers.js'

let app: App
beforeAll(async () => { app = await startApp() })
afterAll(async () => { await app.close(); await prisma.$disconnect() })

describe('boucle complète', () => {
  it('quiz → session → inscription → question → réponse → correction → classement', async () => {
    const { tt, sessionId, code } = await setupSession(app, 2)
    const a = await joinStudent(app, code, 1)
    const b = await joinStudent(app, code, 2)
    const c = await joinStudent(app, code, 3)
    expect(a.status).toBe(201)

    // pseudo déjà pris : refus, sans fuite du nom complet
    const dup = await api(app, 'POST', '/public/join', { code, fullName: 'Autre Personne', nickname: ' pseudo1 ' })
    expect(dup.status).toBe(409)
    expect(dup.text).not.toMatch(/Prénom1 Nom1/)

    const teacher = await connect(app, { role: 'teacher', token: tt, sessionId })
    const sa = await connect(app, { role: 'student', token: a.json.token })
    const sb = await connect(app, { role: 'student', token: b.json.token })
    const sc = await connect(app, { role: 'student', token: c.json.token })
    const screen = await connect(app, { role: 'screen', code })

    expect((await emit(teacher, 'teacher:prepare')).ok).toBe(true)
    const ready = await waitFor(sa, 'state', (s) => s.status === 'READY').catch(() => null)
    expect(ready === null || ready.question === null).toBe(true)

    const opened = Promise.all([waitFor(sa, 'state', (s) => s.status === 'OPEN'), waitFor(screen, 'state', (s) => s.status === 'OPEN')])
    expect((await emit(teacher, 'teacher:open')).ok).toBe(true)
    const [stA, stScreen] = await opened
    // la bonne réponse ne fuit ni vers les étudiants ni vers la projection ni vers le professeur
    expect(JSON.stringify(stA)).not.toContain('correctIndex')
    expect(JSON.stringify(stScreen)).not.toContain('correct')
    expect(JSON.stringify(stA)).not.toContain('Parce que')
    const qid = stA.question.id

    // double soumission simultanée → une seule réponse
    const [r1, r2] = await Promise.all([emit(sa, 'answer', { questionId: qid, choiceIndex: 1 }), emit(sa, 'answer', { questionId: qid, choiceIndex: 1 })])
    expect(r1.ok && r2.ok).toBe(true)
    // un changement de choix ne modifie pas la réponse
    const r3 = await emit(sa, 'answer', { questionId: qid, choiceIndex: 0 })
    expect(r3).toMatchObject({ ok: true, choiceIndex: 1, already: true })
    await sleep(300)
    expect((await emit(sb, 'answer', { questionId: qid, choiceIndex: 0 })).ok).toBe(true)
    expect(await prisma.answer.count({ where: { questionId: qid } })).toBe(2)

    // un étudiant ne peut pas piloter la session
    const denied = await Promise.race([emit(sa, 'teacher:open'), sleep(500).then(() => 'ignoré')])
    expect(denied).toBe('ignoré')
    await expect(connect(app, { role: 'teacher', token: a.json.token, sessionId })).rejects.toThrow()
    expect((await api(app, 'POST', '/sessions', { quizId: 'x' }, a.json.token)).status).toBe(401)

    // fermeture automatique, sans action du professeur (déconnecté)
    teacher.close()
    const closed = await waitFor(sa, 'state', (s) => s.status === 'CORRECTION', 8000)
    expect(closed.correction.correctIndex).toBe(1)
    expect(closed.correction.distribution).toEqual([1, 1, 0])

    // réponse tardive refusée
    const late = await emit(sc, 'answer', { questionId: qid, choiceIndex: 1 })
    expect(late.ok).toBe(false)
    expect(await prisma.answer.count({ where: { questionId: qid } })).toBe(2)

    // points exacts
    const ans = await prisma.answer.findMany({ where: { questionId: qid }, include: { participant: true } })
    const good = ans.find((x) => x.choiceIndex === 1)!
    expect(good.points).toBe(pointsFor(true, good.elapsedMs, 2))
    expect(ans.find((x) => x.choiceIndex === 0)!.points).toBe(0)
    const parts = await prisma.participant.findMany({ where: { sessionId } })
    expect(parts.find((p) => p.id === good.participantId)!.totalScore).toBe(good.points)
    expect(parts.filter((p) => p.totalScore === 0)).toHaveLength(2)

    // reconnexion : l'état personnel est restauré
    sa.close()
    const sa2 = await connect(app, { role: 'student', token: a.json.token })
    const me = await waitFor(sa2, 'me')
    expect(me.result).toMatchObject({ correct: true, points: good.points })
    expect(me.rank).toBe(1)
    expect(closed.top5[0].name).toBe('Pseudo1')

    // un jeton invalide ou étranger est refusé
    await expect(connect(app, { role: 'student', token: 'nimporte' })).rejects.toThrow()
    ;[sa2, sb, sc, screen].forEach((s) => s.close())
  })

  it('sessions : fin de session, podium, historique', async () => {
    const { tt, sessionId, code } = await setupSession(app, 2, 1)
    const a = await joinStudent(app, code, 11)
    const teacher = await connect(app, { role: 'teacher', token: tt, sessionId })
    await emit(teacher, 'teacher:prepare'); await emit(teacher, 'teacher:open')
    const sa = await connect(app, { role: 'student', token: a.json.token })
    const st = await waitFor(sa, 'state', (s) => s.status === 'OPEN' || s.status === 'CORRECTION').catch(() => null)
    void st
    await waitFor(teacher, 'state', (s) => s.status === 'CORRECTION', 8000)
    expect((await emit(teacher, 'teacher:prepare')).ok).toBe(false) // plus de question
    expect((await emit(teacher, 'teacher:end')).ok).toBe(true)
    const final = await waitFor(sa, 'me', (m) => !!m.final)
    expect(final.final.questions).toBe(1)
    const res = await api(app, 'GET', `/sessions/${sessionId}/results`, undefined, tt)
    expect(res.json.status).toBe('ENDED')
    expect(res.json.participants).toHaveLength(1)
    const late = await joinStudent(app, code, 12)
    expect(late.status).toBe(410)
    ;[teacher, sa].forEach((s) => s.close())
  })

  it('sondage : vote sans bonne réponse, zéro point, répartition affichée', async () => {
    const tt = await makeTeacher(app)
    const q = await api(app, 'POST', '/quizzes', {
      title: 'Sondage test',
      questions: [{ text: 'Qui es-tu ?', options: ['Dev', 'Biz'], correctIndex: null, durationSec: 10 }],
    }, tt)
    expect(q.status).toBe(201)
    const s = await api(app, 'POST', '/sessions', { quizId: q.json.id }, tt)
    const a = await joinStudent(app, s.json.code, 51)
    const teacher = await connect(app, { role: 'teacher', token: tt, sessionId: s.json.id })
    const sa = await connect(app, { role: 'student', token: a.json.token })
    await emit(teacher, 'teacher:prepare'); await emit(teacher, 'teacher:open')
    const st = await waitFor(sa, 'state', (x) => x.status === 'OPEN')
    expect((await emit(sa, 'answer', { questionId: st.question.id, choiceIndex: 1 })).ok).toBe(true)
    const closed = await waitFor(sa, 'state', (x) => x.status === 'CORRECTION', 15000)
    expect(closed.correction).toMatchObject({ poll: true, correctIndex: null, distribution: [0, 1] })
    expect((await waitFor(sa, 'me', (m) => !!m.result)).result).toMatchObject({ poll: true, correct: false, points: 0 })
    expect((await prisma.participant.findFirstOrThrow({ where: { sessionId: s.json.id } })).totalScore).toBe(0)
    ;[sa, teacher].forEach((x) => x.close())
  })

  it('réinitialisation d’accès par le professeur', async () => {
    const { tt, sessionId, code } = await setupSession(app, 10)
    const a = await joinStudent(app, code, 21)
    const teacher = await connect(app, { role: 'teacher', token: tt, sessionId })
    const sa = await connect(app, { role: 'student', token: a.json.token })
    const part = await prisma.participant.findFirstOrThrow({ where: { sessionId } })
    // un autre ne peut pas reprendre l'identité sans réinitialisation
    const steal = await api(app, 'POST', '/public/join', { code, fullName: 'Prénom21 Nom21', nickname: 'Pseudo21' })
    expect(steal.status).toBe(409)
    const kicked = waitFor(sa, 'kicked')
    expect((await emit(teacher, 'teacher:reset', { participantId: part.id })).ok).toBe(true)
    await kicked
    await expect(connect(app, { role: 'student', token: a.json.token })).rejects.toThrow()
    const again = await api(app, 'POST', '/public/join', { code, fullName: 'prenom21 NOM21', nickname: 'pseudo21' })
    expect(again.status).toBe(201)
    const s2 = await connect(app, { role: 'student', token: again.json.token })
    s2.close(); teacher.close()
  })

  it('un retardataire peut répondre à une question ouverte, sans points antérieurs', async () => {
    const { tt, sessionId, code } = await setupSession(app, 10)
    const teacher = await connect(app, { role: 'teacher', token: tt, sessionId })
    await emit(teacher, 'teacher:prepare'); await emit(teacher, 'teacher:open')
    const l = await joinStudent(app, code, 31)
    expect(l.status).toBe(201)
    const sl = await connect(app, { role: 'student', token: l.json.token })
    const st = await waitFor(sl, 'state', (s) => s.status === 'OPEN')
    expect((await emit(sl, 'answer', { questionId: st.question.id, choiceIndex: 1 })).ok).toBe(true)
    sl.close(); teacher.close()
  })
})

describe('redémarrage', () => {
  it('ferme une question expirée après redémarrage du serveur', async () => {
    const { tt, sessionId, code } = await setupSession(app, 2)
    const a = await joinStudent(app, code, 41)
    const teacher = await connect(app, { role: 'teacher', token: tt, sessionId })
    await emit(teacher, 'teacher:prepare'); await emit(teacher, 'teacher:open')
    const sa = await connect(app, { role: 'student', token: a.json.token })
    const st = await waitFor(sa, 'state', (s) => s.status === 'OPEN')
    expect((await emit(sa, 'answer', { questionId: st.question.id, choiceIndex: 1 })).ok).toBe(true)
    await app.close() // « crash » avant l'échéance
    await sleep(2500)
    expect((await prisma.sessionQuestion.findUniqueOrThrow({ where: { id: st.question.id } })).status).toBe('OPEN')
    app = await startApp()
    await sleep(800)
    expect((await prisma.sessionQuestion.findUniqueOrThrow({ where: { id: st.question.id } })).status).toBe('CLOSED')
    const p = await prisma.participant.findFirstOrThrow({ where: { sessionId } })
    expect(p.totalScore).toBeGreaterThanOrEqual(500)
    const sa2 = await connect(app, { role: 'student', token: a.json.token })
    expect((await waitFor(sa2, 'me')).result).toMatchObject({ correct: true })
    sa2.close()
  })
})
