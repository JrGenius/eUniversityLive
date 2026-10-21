import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { teacherToken } from '../lib/api'
import { useLive, useRemaining, type LiveState } from '../lib/live'
import { ANS, ConnectionBanner, ErrorBox, fmtTime, Spinner, TeacherNav } from '../components/ui'
import { JoinQr } from '../components/Qr'
import { Distribution, Podium, TopList } from '../components/Parts'

export default function Console() {
  const { id } = useParams()
  const nav = useNavigate()
  const auth = { role: 'teacher', token: teacherToken(), sessionId: id }
  const { state, conn, call, serverNow } = useLive(auth)
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false)

  async function run(ev: string, payload?: unknown) {
    setBusy(true); setError('')
    try { const r = await call(ev, payload); if (!r.ok) setError(r.error) } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  if (conn === 'denied') return <main className="mx-auto max-w-md p-6"><ErrorBox>Session introuvable ou accès refusé.</ErrorBox><Link to="/enseignant" className="btn-ghost mt-4 w-full">Retour au tableau de bord</Link></main>
  if (!state) return <><ConnectionBanner conn={conn} /><Spinner label="Connexion à la session…" /></>
  const s = state

  return (
    <>
      <ConnectionBanner conn={conn} />
      <TeacherNav title={s.quizTitle} right={<>
        <a className="btn-ghost btn-sm" href={`/projection/${s.code}`} target="_blank" rel="noreferrer">Écran de projection ↗</a>
        {s.status !== 'ENDED' && <button className="btn-danger btn-sm" disabled={busy} onClick={() => confirm('Terminer la session pour tous les participants ?') && run('teacher:end')}>Terminer la session</button>}
      </>} />
      <main className="mx-auto grid max-w-6xl gap-5 px-4 py-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          {error && <ErrorBox>{error}</ErrorBox>}
          <Stage s={s} serverNow={serverNow} busy={busy} run={run} done={() => nav(`/enseignant/resultats/${id}`)} />
        </div>
        <aside className="space-y-5">
          {s.status !== 'ENDED' && (
            <div className="card flex flex-col items-center gap-3 text-center">
              <p className="text-sm font-semibold text-ink-soft">Code de la session</p>
              <p className="font-mono text-5xl font-extrabold tracking-[.2em]">{s.code}</p>
              <JoinQr code={s.code} size={160} />
            </div>
          )}
          <Participants s={s} run={run} />
        </aside>
      </main>
    </>
  )
}

function Stage({ s, serverNow, busy, run, done }: { s: LiveState; serverNow: () => number; busy: boolean; run: (ev: string) => void; done: () => void }) {
  const q = s.question
  const remaining = useRemaining(s.status === 'OPEN' ? q?.deadlineAt : null, serverNow)
  const progress = s.currentIndex >= 0 ? `Question ${s.currentIndex + 1} sur ${s.totalQuestions}` : `${s.totalQuestions} question${s.totalQuestions > 1 ? 's' : ''}`

  if (s.status === 'WAITING') return (
    <div className="card space-y-4 text-center">
      <h1 className="text-2xl font-extrabold">Salle d’attente</h1>
      <p className="text-lg"><span className="text-4xl font-extrabold">{s.registered}</span> inscrit{s.registered > 1 ? 's' : ''} · {s.connected} connecté{s.connected > 1 ? 's' : ''}</p>
      <p className="text-ink-soft">Projetez l’écran de projection pour afficher le QR code, puis démarrez quand la classe est prête.</p>
      <button className="btn-primary w-full text-lg" disabled={busy} onClick={() => run('teacher:prepare')}>Préparer la question 1</button>
    </div>
  )
  if (s.status === 'READY' && q) return (
    <div className="card space-y-4">
      <p className="text-sm font-bold text-brand-dark">{progress} · prête · {q.durationSec} s</p>
      <h1 className="text-2xl font-extrabold">{q.text}</h1>
      <ul className="grid gap-2 sm:grid-cols-2">{q.options.map((o, i) => <li key={i} className={`flex items-center gap-2 rounded-xl px-3 py-3 font-bold text-white ${ANS[i].bg}`}><span aria-hidden>{ANS[i].symbol}</span>{ANS[i].letter}. {o}</li>)}</ul>
      <p className="text-sm text-ink-soft">{s.connected} étudiant{s.connected > 1 ? 's' : ''} connecté{s.connected > 1 ? 's' : ''}. Les étudiants ne voient pas encore la question.</p>
      <button className="btn-primary w-full text-lg" disabled={busy} onClick={() => run('teacher:open')}>Lancer la question</button>
    </div>
  )
  if (s.status === 'OPEN' && q) return (
    <div className="card space-y-5">
      <div className="flex items-center justify-between"><p className="text-sm font-bold text-brand-dark">{progress} · en cours</p><p className={`text-5xl font-extrabold tabular-nums ${remaining <= 5 ? 'text-bad' : ''}`} role="timer">{fmtTime(remaining)}</p></div>
      <h1 className="text-2xl font-extrabold">{q.text}</h1>
      <div className="h-3 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-brand" style={{ width: `${(remaining / q.durationSec) * 100}%`, transition: 'width .12s linear' }} /></div>
      <p className="text-xl"><span className="text-4xl font-extrabold">{s.answered}</span> / {s.registered} réponses</p>
      <p className="text-sm text-ink-soft">La question se ferme automatiquement à la fin du chronomètre.</p>
    </div>
  )
  if (s.status === 'CORRECTION' && q && s.correction) return (
    <div className="space-y-5">
      <div className="card space-y-4">
        <p className="text-sm font-bold text-brand-dark">{progress} · correction</p>
        <h1 className="text-2xl font-extrabold">{q.text}</h1>
        <Distribution options={q.options} dist={s.correction.distribution} correct={s.correction.correctIndex} />
        {s.correction.explanation && <p className="rounded-xl bg-brand-soft px-4 py-3">{s.correction.explanation}</p>}
      </div>
      <div className="card space-y-3"><h2 className="font-extrabold">Classement</h2><TopList items={s.top5 ?? []} /></div>
      {s.isLast
        ? <button className="btn-primary w-full text-lg" disabled={busy} onClick={() => run('teacher:end')}>Terminer la session</button>
        : <button className="btn-primary w-full text-lg" disabled={busy} onClick={() => run('teacher:prepare')}>Question suivante</button>}
    </div>
  )
  return (
    <div className="card space-y-5 text-center">
      <h1 className="text-2xl font-extrabold">Session terminée</h1>
      <Podium items={s.podium ?? []} />
      <button className="btn-primary w-full" onClick={done}>Voir les résultats détaillés</button>
    </div>
  )
}

function Participants({ s, run }: { s: LiveState; run: (ev: string, p?: unknown) => void }) {
  const [filter, setFilter] = useState('')
  const list = (s.participants ?? []).filter((p) => `${p.nickname} ${p.fullName}`.toLowerCase().includes(filter.toLowerCase()))
  return (
    <div className="card space-y-3">
      <div className="flex items-baseline justify-between"><h2 className="font-extrabold">Participants</h2><span className="text-sm font-semibold text-ink-soft">{s.connected} connecté{s.connected > 1 ? 's' : ''} · {s.registered} inscrit{s.registered > 1 ? 's' : ''}</span></div>
      <input className="field !py-2" placeholder="Rechercher…" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Rechercher un participant" />
      <ul className="max-h-[420px] divide-y divide-line overflow-y-auto">
        {list.map((p) => (
          <li key={p.id} className="flex items-center gap-2 py-2 text-sm">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${p.connected ? 'bg-ok' : 'bg-line'}`} title={p.connected ? 'Connecté' : 'Déconnecté'} />
            <span className="flex-1 truncate"><b>{p.nickname}</b> <span className="text-ink-soft">{p.fullName}</span></span>
            {s.status === 'OPEN' && p.answered && <span className="font-bold text-ok" title="A répondu">✓</span>}
            {p.claimable
              ? <span className="text-xs font-semibold text-brand-dark">accès réinitialisé</span>
              : <button className="text-xs font-semibold text-ink-soft underline" onClick={() => confirm(`Réinitialiser l’accès de ${p.nickname} (${p.fullName}) ? Il pourra se réinscrire avec le même pseudo et le même nom complet.`) && run('teacher:reset', { participantId: p.id })}>Réinitialiser</button>}
          </li>
        ))}
        {!list.length && <li className="py-4 text-center text-ink-soft">Aucun participant.</li>}
      </ul>
    </div>
  )
}
