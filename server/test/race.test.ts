import { describe, it, expect } from 'vitest'
import { startApp, setupSession, connect, emit, waitFor, joinStudent } from './helpers.js'
import { engine } from '../src/engine.js'

describe('getLive concurrence', () => {
  it('retourne une seule instance sous accès concurrents', async () => {
    const app = await startApp()
    const { code } = await setupSession(app)
    const results = await Promise.all(Array.from({ length: 30 }, () => engine.getLive(code)))
    expect(new Set(results).size).toBe(1)
    app.close()
  })

  it('recharge une session ouverte en une seule instance et accepte les réponses', async () => {
    const app = await startApp()
    const { tt, sessionId, code } = await setupSession(app)
    const teacher = await connect(app, { role: 'teacher', token: tt, sessionId })
    await emit(teacher, 'teacher:prepare', { sessionId, index: 0 })
    await emit(teacher, 'teacher:open', { sessionId })

    // Simule un redémarrage : le cache mémoire est vide, la session reste OPEN en base.
    const e = engine as any
    e.lives.clear(); e.byCode.clear(); e.loading.clear()

    const results = await Promise.all(Array.from({ length: 30 }, () => engine.getLive(code)))
    expect(new Set(results).size).toBe(1)

    const join = await joinStudent(app, code, 1)
    const student = await connect(app, { role: 'student', token: join.json.token })
    await waitFor(student, 'state', (s: any) => s.status === 'OPEN')
    const ack = await emit<any>(student, 'answer', { questionId: results[0]!.questions[0].id, choiceIndex: 1 })
    expect(ack.ok).toBe(true)
    student.close(); teacher.close(); app.close()
  })
})
