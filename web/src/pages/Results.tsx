import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, teacherToken } from '../lib/api'
import { ANS, ErrorBox, fmtDate, Spinner, TeacherNav } from '../components/ui'

export default function Results() {
  const { id } = useParams()
  const [d, setD] = useState<any>(null); const [error, setError] = useState('')
  useEffect(() => { api(`/sessions/${id}/results`).then(setD).catch((e) => setError(e.message)) }, [id])

  async function csv() {
    const r = await fetch(`/api/sessions/${id}/results.csv`, { headers: { authorization: `Bearer ${teacherToken()}` } })
    const url = URL.createObjectURL(await r.blob())
    Object.assign(document.createElement('a'), { href: url, download: `resultats-${d.code}.csv` }).click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <TeacherNav right={<Link className="btn-ghost btn-sm" to="/enseignant">← Tableau de bord</Link>} />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        {error && <ErrorBox>{error}</ErrorBox>}
        {!d ? !error && <Spinner /> : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div><h1 className="text-2xl font-extrabold">{d.quizTitle}</h1><p className="text-ink-soft">{fmtDate(d.createdAt)} · code {d.code} · {d.participants.length} participant{d.participants.length > 1 ? 's' : ''}</p></div>
              <button className="btn-ghost btn-sm" onClick={csv}>Exporter en CSV</button>
            </div>
            <section className="card overflow-x-auto p-0">
              <table className="w-full text-left text-sm">
                <thead className="bg-brand-soft"><tr><th className="px-4 py-3">Rang</th><th className="px-4 py-3">Pseudo</th><th className="px-4 py-3">Nom complet</th><th className="px-4 py-3 text-right">Bonnes réponses</th><th className="px-4 py-3 text-right">Points</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {d.participants.map((p: any) => <tr key={p.id}><td className="px-4 py-2.5 font-bold">{p.rank}</td><td className="px-4 py-2.5">{p.nickname}</td><td className="px-4 py-2.5">{p.fullName}</td><td className="px-4 py-2.5 text-right tabular-nums">{p.correct}/{d.questions.length}</td><td className="px-4 py-2.5 text-right font-bold tabular-nums">{p.score}</td></tr>)}
                  {!d.participants.length && <tr><td colSpan={5} className="px-4 py-6 text-center text-ink-soft">Aucun participant.</td></tr>}
                </tbody>
              </table>
            </section>
            <section className="space-y-3">
              <h2 className="text-xl font-extrabold">Par question</h2>
              {d.questions.map((q: any) => {
                const max = Math.max(1, ...q.distribution)
                return (
                  <div key={q.position} className="card space-y-2">
                    <p className="font-bold">{q.position + 1}. {q.text}</p>
                    <p className="text-sm text-ink-soft">{q.answered} réponse{q.answered > 1 ? 's' : ''} · {q.answered ? Math.round((q.correct / q.answered) * 100) : 0} % de réussite</p>
                    {q.options.map((o: string, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className={`w-28 shrink-0 truncate font-semibold ${q.correctIndex === i ? 'text-ok' : ''}`}>{ANS[i].letter}. {o}{q.correctIndex === i && ' ✓'}</span>
                        <div className="h-4 flex-1 rounded-full bg-line"><div className={`h-full rounded-full ${q.correctIndex === i ? 'bg-ok' : 'bg-ink-soft/50'}`} style={{ width: `${(q.distribution[i] / max) * 100}%` }} /></div>
                        <span className="w-8 text-right tabular-nums">{q.distribution[i]}</span>
                      </div>
                    ))}
                  </div>
                )
              })}
            </section>
          </>
        )}
      </main>
    </>
  )
}
