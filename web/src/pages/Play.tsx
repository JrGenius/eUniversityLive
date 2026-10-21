import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLive, useRemaining, type LiveState, type Me } from '../lib/live'
import { ANS, ConnectionBanner, Logo, Screen, Spinner } from '../components/ui'
import { tokenKey } from './Join'

export default function Play() {
  const { code = '' } = useParams()
  const nav = useNavigate()
  const token = localStorage.getItem(tokenKey(code))
  const auth = useMemo(() => (token ? { role: 'student', token } : null), [token])
  const { state, me, setMe, conn, call, serverNow } = useLive(auth)

  useEffect(() => { if (!token) nav(`/j/${code}`, { replace: true }) }, [token])
  if (!token) return null

  if (conn === 'denied') {
    return (
      <Screen>
        <div className="card mt-10 space-y-4 text-center animate-pop">
          <div className="text-5xl" aria-hidden>🔒</div>
          <h1 className="text-xl font-extrabold">Votre accès n’est plus valide</h1>
          <p className="text-ink-soft">La session est introuvable ou le professeur a réinitialisé votre accès. Vous pouvez vous inscrire de nouveau.</p>
          <button className="btn-primary w-full" onClick={() => { localStorage.removeItem(tokenKey(code)); localStorage.removeItem('euniv:last'); nav(`/j/${code}`, { replace: true }) }}>S’inscrire de nouveau</button>
        </div>
      </Screen>
    )
  }
  if (!state || !me) return <><ConnectionBanner conn={conn} /><Screen><Spinner label="Connexion à la classe…" /></Screen></>

  return (
    <>
      <ConnectionBanner conn={conn} />
      <Screen>
        <header className="mb-5 flex items-center justify-between">
          <Logo className="h-8" />
          <span className="max-w-[55%] truncate rounded-full bg-card px-3 py-1 text-sm font-semibold border border-line">{me.nickname}</span>
        </header>
        <Body state={state} me={me} setMe={setMe} call={call} serverNow={serverNow} online={conn === 'online'} />
      </Screen>
    </>
  )
}

type Call = ReturnType<typeof useLive>['call']
function Body({ state, me, setMe, call, serverNow, online }: { state: LiveState; me: Me; setMe: (m: Me) => void; call: Call; serverNow: () => number; online: boolean }) {
  const q = state.question
  if (state.status === 'WAITING' || state.status === 'READY') return <Waiting state={state} ready={state.status === 'READY'} />
  if (state.status === 'OPEN' && q) return <Open key={q.id} state={state} me={me} setMe={setMe} call={call} serverNow={serverNow} online={online} />
  if (state.status === 'CORRECTION' && q) return <Correction state={state} me={me} />
  return <Final state={state} me={me} />
}

function Waiting({ state, ready }: { state: LiveState; ready: boolean }) {
  return (
    <div className="space-y-4 animate-rise">
      <div className="card space-y-3 text-center">
        <div className="mx-auto h-14 w-14 animate-pulse rounded-full bg-brand-soft grid place-items-center text-3xl" aria-hidden>{ready ? '⏳' : '👋'}</div>
        <h1 className="text-2xl font-extrabold">{ready ? 'La prochaine question arrive' : 'Vous êtes dans la salle'}</h1>
        <p className="text-ink-soft">{ready ? `Question ${state.currentIndex + 1} sur ${state.totalQuestions}. Restez prêt.` : 'Le professeur va lancer la première question.'}</p>
        <p className="font-bold">{state.registered} participant{state.registered > 1 ? 's' : ''} connecté{state.registered > 1 ? 's' : ''}</p>
      </div>
      <div className="rounded-2xl bg-ink p-4 text-center text-white">
        <p className="font-bold">Une pression valide votre réponse.</p>
        <p className="text-white/80">Vous ne pourrez plus la modifier.</p>
      </div>
      <p className="text-center text-sm text-ink-soft">{state.quizTitle}</p>
    </div>
  )
}

function TimerBar({ remaining, total }: { remaining: number; total: number }) {
  const urgent = remaining <= 5
  return (
    <div className="space-y-1.5" role="timer" aria-live="off">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold text-ink-soft">Temps restant</span>
        <span className={`text-3xl font-extrabold tabular-nums ${urgent ? 'text-bad' : ''}`}>{Math.ceil(remaining)} s</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-line"><div className={`h-full rounded-full ${urgent ? 'bg-bad' : 'bg-brand'}`} style={{ width: `${Math.min(100, (remaining / total) * 100)}%`, transition: 'width .12s linear' }} /></div>
    </div>
  )
}

function Open({ state, me, setMe, call, serverNow, online }: { state: LiveState; me: Me; setMe: (m: Me) => void; call: Call; serverNow: () => number; online: boolean }) {
  const q = state.question!
  const remaining = useRemaining(q.deadlineAt, serverNow)
  const saved = me.answered?.questionId === q.id ? me.answered.choiceIndex : null
  const [pending, setPending] = useState<number | null>(null)
  const [error, setError] = useState('')
  const running = useRef(false)

  async function pick(i: number) {
    if (saved !== null || running.current) return
    running.current = true; setPending(i); setError('')
    try {
      // Nouvelles tentatives idempotentes jusqu'à confirmation ou fin de la question.
      for (let attempt = 0; attempt < 30; attempt++) {
        try {
          const r = await call('answer', { questionId: q.id, choiceIndex: i }, 4000)
          if (r.ok) { setMe({ ...me, answered: { questionId: q.id, choiceIndex: r.choiceIndex } }); return }
          setError(r.code === 'LATE' || r.code === 'CLOSED' ? 'Trop tard : le temps est écoulé, votre réponse n’a pas été prise en compte.' : r.error)
          setPending(null); return
        } catch {
          if (serverNow() >= (q.deadlineAt ?? 0)) { setError('Trop tard : le temps est écoulé.'); setPending(null); return }
          await new Promise((r) => setTimeout(r, 800))
        }
      }
    } finally { running.current = false }
  }

  if (saved !== null) {
    const a = ANS[saved]
    return (
      <div className="space-y-5 animate-pop">
        <TimerBar remaining={remaining} total={q.durationSec} />
        <div className="card space-y-3 text-center" role="status">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-ok text-4xl text-white" aria-hidden>✓</div>
          <h1 className="text-2xl font-extrabold">Réponse enregistrée</h1>
          <p className="text-ink-soft">Vous avez choisi <span className={`mx-1 inline-flex items-center gap-1 rounded-lg px-2 py-0.5 font-bold text-white ${a.bg}`}>{a.symbol} {a.letter}</span></p>
          <p className="text-sm text-ink-soft">Patientez : la correction s’affichera à la fin du temps.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-rise">
      <TimerBar remaining={remaining} total={q.durationSec} />
      <div>
        <p className="mb-1 text-sm font-semibold text-ink-soft">Question {q.index + 1} sur {state.totalQuestions}</p>
        <h1 className="text-xl font-extrabold leading-snug">{q.text}</h1>
      </div>
      <div className="grid gap-3" role="group" aria-label="Propositions">
        {q.options.map((opt, i) => {
          const a = ANS[i]
          const sending = pending === i
          return (
            <button key={i} onClick={() => pick(i)} disabled={pending !== null || remaining <= 0}
              className={`flex min-h-[72px] w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-lg font-bold text-white shadow-sm transition active:scale-[.98] ${a.bg} ${pending !== null && !sending ? 'opacity-40' : ''}`}>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/25 text-lg" aria-hidden>{a.symbol}</span>
              <span className="flex-1 break-words"><span className="sr-only">Réponse {a.letter} ({a.name}) : </span><span aria-hidden>{a.letter}. </span>{opt}</span>
              {sending && <span className="text-sm font-semibold" role="status">Envoi en cours…</span>}
            </button>
          )
        })}
      </div>
      {!online && pending !== null && <p className="text-center text-sm font-semibold text-ink-soft">Connexion instable : nouvelle tentative automatique…</p>}
      {error && <div role="alert" className="rounded-xl border border-bad/30 bg-bad/10 px-4 py-3 font-semibold text-bad">{error}</div>}
    </div>
  )
}

function Correction({ state, me }: { state: LiveState; me: Me }) {
  const q = state.question!
  const c = state.correction!
  const r = me.result
  const ok = !!r?.correct
  const a = ANS[c.correctIndex]
  const mine = r?.choiceIndex != null ? ANS[r.choiceIndex] : null
  return (
    <div className="space-y-4 animate-pop">
      <div className={`card space-y-2 text-center ${ok ? 'border-ok' : 'border-bad/50'}`} role="status">
        <div className={`mx-auto grid h-16 w-16 place-items-center rounded-full text-4xl text-white ${ok ? 'bg-ok' : mine ? 'bg-bad' : 'bg-ink-soft'}`} aria-hidden>{ok ? '✓' : mine ? '✕' : '–'}</div>
        <h1 className="text-2xl font-extrabold">{ok ? 'Bonne réponse !' : mine ? 'Réponse incorrecte' : 'Pas de réponse'}</h1>
        <p className={`text-4xl font-extrabold tabular-nums ${ok ? 'text-ok' : 'text-ink-soft'}`}>+{r?.points ?? 0} pts</p>
        {me.rank && <p className="font-semibold">Vous êtes <span className="text-xl font-extrabold">{me.rank}{me.rank === 1 ? 'er' : 'e'}</span> sur {me.participants} · {me.total} pts</p>}
      </div>
      <div className="card space-y-2">
        <p className="text-sm font-semibold text-ink-soft">Question {q.index + 1} · {q.text}</p>
        <p className={`flex items-center gap-2 rounded-xl px-3 py-2.5 font-bold text-white ${a.bg}`}><span aria-hidden>{a.symbol}</span> Bonne réponse : {a.letter}. {q.options[c.correctIndex]}</p>
        {mine && !ok && <p className="text-sm text-ink-soft">Votre choix : {mine.letter}. {q.options[r!.choiceIndex!]}</p>}
        {c.explanation && <p className="rounded-xl bg-brand-soft px-3 py-2.5 text-sm">{c.explanation}</p>}
      </div>
      <p className="text-center text-sm text-ink-soft">Restez connecté : la suite arrive automatiquement.</p>
    </div>
  )
}

function Final({ state, me }: { state: LiveState; me: Me }) {
  const medal = me.rank === 1 ? '🥇' : me.rank === 2 ? '🥈' : me.rank === 3 ? '🥉' : '🎓'
  return (
    <div className="space-y-4 animate-pop">
      <div className="card space-y-2 text-center">
        <div className="text-6xl" aria-hidden>{medal}</div>
        <h1 className="text-2xl font-extrabold">Session terminée</h1>
        <p className="text-ink-soft">Merci {me.nickname} !</p>
        <p className="text-5xl font-extrabold tabular-nums text-brand-dark">{me.total} <span className="text-xl">pts</span></p>
        {me.rank && <p className="text-lg font-bold">{me.rank}{me.rank === 1 ? 'er' : 'e'} sur {me.participants}</p>}
        {me.final && <p className="text-ink-soft">{me.final.correctCount} bonne{me.final.correctCount > 1 ? 's' : ''} réponse{me.final.correctCount > 1 ? 's' : ''} sur {me.final.questions}</p>}
      </div>
      {state.podium && (
        <div className="card">
          <h2 className="mb-2 font-bold">Podium</h2>
          <ol className="space-y-1.5">{state.podium.map((p, i) => <li key={i} className="flex justify-between"><span>{p.rank}. {p.name}</span><span className="font-bold tabular-nums">{p.score}</span></li>)}</ol>
        </div>
      )}
    </div>
  )
}
