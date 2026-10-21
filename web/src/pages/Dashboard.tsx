import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, setTeacherToken } from '../lib/api'
import { ErrorBox, fmtDate, Spinner, TeacherNav } from '../components/ui'

interface QuizItem { id: string; title: string; description: string | null; isDemo: boolean; questionCount: number; updatedAt: string }
interface SessionItem { id: string; code: string; quizTitle: string; status: string; createdAt: string; participants: number; questions: number }
const STATUS: Record<string, string> = { WAITING: 'Salle d’attente', READY: 'En cours', OPEN: 'En cours', CORRECTION: 'En cours', ENDED: 'Terminée' }

export default function Dashboard() {
  const nav = useNavigate()
  const [quizzes, setQuizzes] = useState<QuizItem[] | null>(null)
  const [sessions, setSessions] = useState<SessionItem[] | null>(null)
  const [error, setError] = useState(''); const [busy, setBusy] = useState('')
  const load = () => Promise.all([api('/quizzes'), api('/sessions')]).then(([q, s]) => { setQuizzes(q); setSessions(s) }).catch((e) => setError(e.message))
  useEffect(() => { load() }, [])

  const act = async (id: string, fn: () => Promise<unknown>) => { setBusy(id); setError(''); try { await fn() } catch (e) { setError((e as Error).message) } finally { setBusy('') } }
  const start = (q: QuizItem) => act(q.id, async () => { const s = await api('/sessions', { body: { quizId: q.id } }); nav(`/enseignant/session/${s.id}`) })
  const dup = (q: QuizItem) => act(q.id, async () => { await api(`/quizzes/${q.id}/duplicate`, { method: 'POST', body: {} }); await load() })
  const del = (q: QuizItem) => confirm(`Supprimer « ${q.title} » ? Les résultats des sessions passées sont conservés.`) && act(q.id, async () => { await api(`/quizzes/${q.id}`, { method: 'DELETE' }); await load() })

  return (
    <>
      <TeacherNav right={<button className="btn-ghost btn-sm" onClick={() => { setTeacherToken(null); nav('/enseignant/connexion') }}>Déconnexion</button>} />
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-6">
        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-extrabold">Mes quiz</h1>
            <Link to="/enseignant/quiz/nouveau" className="btn-primary">+ Créer un quiz</Link>
          </div>
          {error && <ErrorBox>{error}</ErrorBox>}
          {!quizzes ? <Spinner /> : quizzes.length === 0 ? (
            <div className="card text-center text-ink-soft">Aucun quiz pour l’instant. Créez votre premier quiz pour animer votre cours.</div>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {quizzes.map((q) => (
                <li key={q.id} className="card flex flex-col gap-3">
                  <div>
                    <h2 className="text-lg font-bold">{q.title} {q.isDemo && <span className="ml-1 rounded-full bg-brand-soft px-2 py-0.5 align-middle text-xs font-bold text-brand-dark">DÉMO</span>}</h2>
                    <p className="text-sm text-ink-soft">{q.questionCount} question{q.questionCount > 1 ? 's' : ''} · modifié le {fmtDate(q.updatedAt)}</p>
                    {q.description && <p className="mt-1 text-sm">{q.description}</p>}
                  </div>
                  <div className="mt-auto flex flex-wrap gap-2">
                    <button className="btn-primary btn-sm" disabled={busy === q.id || !q.questionCount} onClick={() => start(q)}>Ouvrir une session</button>
                    <Link className="btn-ghost btn-sm" to={`/enseignant/quiz/${q.id}`}>Modifier</Link>
                    <button className="btn-ghost btn-sm" disabled={busy === q.id} onClick={() => dup(q)}>Dupliquer</button>
                    <button className="btn-danger btn-sm" disabled={busy === q.id} onClick={() => del(q)}>Supprimer</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <h2 className="mb-4 text-2xl font-extrabold">Sessions récentes</h2>
          {!sessions ? null : sessions.length === 0 ? <p className="text-ink-soft">Aucune session pour l’instant.</p> : (
            <ul className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-card">
              {sessions.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div><p className="font-bold">{s.quizTitle}</p><p className="text-sm text-ink-soft">{fmtDate(s.createdAt)} · {s.participants} participant{s.participants > 1 ? 's' : ''} · code {s.code}</p></div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${s.status === 'ENDED' ? 'bg-line' : 'bg-brand-soft text-brand-dark'}`}>{STATUS[s.status]}</span>
                    {s.status === 'ENDED'
                      ? <Link className="btn-ghost btn-sm" to={`/enseignant/resultats/${s.id}`}>Résultats</Link>
                      : <Link className="btn-primary btn-sm" to={`/enseignant/session/${s.id}`}>Reprendre</Link>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  )
}
