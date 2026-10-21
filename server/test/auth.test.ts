import { describe, expect, it } from 'vitest'
import { prisma } from '../src/db.js'
import { issueActionToken } from '../src/http.js'
import { api, connect, joinStudent, makeTeacher, sampleQuiz, startApp, type App } from './helpers.js'

describe('comptes enseignant', () => {
  it('inscription → connexion automatique, doublon refusé', async () => {
    const app = await startApp()
    const email = `new${Date.now()}@x.fr`
    const r = await api(app, 'POST', '/auth/signup', { name: 'Prof Test', email, password: 'motdepasse1', acceptedTerms: true })
    expect(r.status).toBe(201)
    expect(r.json.token).toBeTruthy()
    const me = await api(app, 'GET', '/auth/me', undefined, r.json.token)
    expect(me.json.email).toBe(email)
    expect(me.json.emailVerifiedAt).toBeNull()
    const dup = await api(app, 'POST', '/auth/signup', { name: 'Prof Test', email, password: 'motdepasse1', acceptedTerms: true })
    expect(dup.status).toBe(409)
    const bad = await api(app, 'POST', '/auth/signup', { name: 'P', email: 'pasunmail', password: '123', acceptedTerms: false })
    expect(bad.status).toBe(400)
    app.http.close()
  })



  it('mot de passe oublié : réponse identique, reset à usage unique, ancien JWT invalidé', async () => {
    const app = await startApp()
    const token = await makeTeacher(app)
    const me = await api(app, 'GET', '/auth/me', undefined, token)
    const ghost = await api(app, 'POST', '/auth/forgot', { email: 'personne@x.fr' })
    expect(ghost.status).toBe(200)
    const rt = await issueActionToken(me.json.id, 'reset', 3600_000)
    const done = await api(app, 'POST', '/auth/reset', { token: rt, password: 'nouveaumotdepasse' })
    expect(done.status).toBe(200)
    const replay = await api(app, 'POST', '/auth/reset', { token: rt, password: 'autre' })
    expect(replay.status).toBe(400)
    const oldToken = await api(app, 'GET', '/auth/me', undefined, token)
    expect(oldToken.status).toBe(401) // JWT émis avant le changement invalidé
    const login = await api(app, 'POST', '/auth/login', { email: me.json.email, password: 'nouveaumotdepasse' })
    expect(login.status).toBe(200)
    app.http.close()
  })


  it('isolation : un enseignant ne voit ni ne pilote les données d’un autre', async () => {
    const app = await startApp()
    const ta = await makeTeacher(app, `ia${Date.now()}@x.fr`)
    const tb = await makeTeacher(app, `ib${Date.now()}@x.fr`)
    const qb = await api(app, 'POST', '/quizzes', sampleQuiz(2), tb)
    // lecture / écriture / suppression sur le quiz de B refusées pour A
    for (const [m, p, b] of [['GET', `/quizzes/${qb.json.id}`, undefined], ['PUT', `/quizzes/${qb.json.id}`, sampleQuiz(1)], ['DELETE', `/quizzes/${qb.json.id}`, undefined]] as const) {
      const r = await api(app, m, p, b, ta)
      expect([403, 404]).toContain(r.status)
    }
    const sB = await api(app, 'POST', '/sessions', { quizId: qb.json.id }, tb)
    expect(sB.status).toBe(201)
    // A ne peut ni créer de session sur le quiz de B, ni lire ses résultats, ni piloter la socket
    expect((await api(app, 'POST', '/sessions', { quizId: qb.json.id }, ta)).status).toBe(404)
    expect((await api(app, 'GET', `/sessions/${sB.json.id}/results`, undefined, ta)).status).toBe(404)
    await expect(connect(app, { role: 'teacher', token: ta, sessionId: sB.json.id })).rejects.toThrow()
    // mais un étudiant peut toujours rejoindre la session de B
    const st = await joinStudent(app, sB.json.code, 1)
    expect(st.status).toBe(201)
    app.http.close()
  })
})
