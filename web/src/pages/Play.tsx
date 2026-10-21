import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLive, useRemaining, type LiveState, type Me } from '../lib/live'
import { Logo } from '../components/ui'
import { Distribution } from '../components/Parts'
import { Breathing, Check, Cross, NetStatus, StudentShell, useCountUp } from '../components/student'
import { firstNameOf, ordinal, tokenKey } from '../lib/student'

const LETTERS = ['A', 'B', 'C', 'D']
type Call = ReturnType<typeof useLive>['call']
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export default function Play() {
  const { code = '' } = useParams()
  const nav = useNavigate()
  const token = localStorage.getItem(tokenKey(code))
  const auth = useMemo(() => (token ? { role: 'student', token } : null), [token])
  const { state, me, conn, call, serverNow } = useLive(auth)

  useEffect(() => { if (!token) nav(`/j/${code}`, { replace: true }) }, [token])
  if (!token) return null

  if (conn === 'denied') {
    return (
      <StudentShell center>
        <div className="card space-y-4 text-center animate-pop">
          <h1 className="text-2xl font-extrabold">Ton accès n’est plus valide</h1>
          <p className="text-lg text-ink-soft">La session est introuvable, ou le professeur a réinitialisé ton accès. Tu peux te réinscrire en quelques secondes.</p>
          <button className="btn-primary w-full text-lg" onClick={() => { localStorage.removeItem(tokenKey(code)); localStorage.removeItem('euniv:last'); nav(`/j/${code}`, { replace: true }) }}>Me réinscrire</button>
        </div>
      </StudentShell>
    )
  }
  if (!state || !me) {
    return (
      <StudentShell center>
        <NetStatus conn={conn} />
        <div className="space-y-4 text-center"><Breathing /><p className="text-lg text-ink-soft">Connexion à la session…</p></div>
      </StudentShell>
    )
  }

  return (
    <StudentShell>
      <NetStatus conn={conn} />
      <Body state={state} me={me} call={call} serverNow={serverNow} online={conn === 'online'} />
    </StudentShell>
  )
}

function Body({ state, me, call, serverNow, online }: { state: LiveState; me: Me; call: Call; serverNow: () => number; online: boolean }) {
  const q = state.question
  if (state.status === 'WAITING') return <Waiting state={state} me={me} />
  if (state.status === 'READY') return <Ready state={state} me={me} />
  if (state.status === 'OPEN' && q) return <Question key={q.id} state={state} me={me} call={call} serverNow={serverNow} online={online} />
  if (state.status === 'CORRECTION' && q) return <Result key={q.id} state={state} me={me} />
  return <Final state={state} me={me} />
}

const Counter = ({ n }: { n: number }) => <p className="text-base text-ink-soft">{n} participant{n > 1 ? 's' : ''}</p>

const Consigne = () => (
  <p className="rounded-2xl bg-ink px-5 py-4 text-center text-lg font-semibold leading-snug text-white">
    Touche une réponse pour la valider. Attention, ton choix est définitif&nbsp;!
  </p>
)

function Centered({ children }: { children: ReactNode }) {
  return <div className="flex flex-1 flex-col items-center justify-center gap-6 py-8 text-center animate-rise">{children}</div>
}

function Waiting({ state, me }: { state: LiveState; me: Me }) {
  return (
    <Centered>
      <Logo className="h-9 opacity-80" />
      <h1 className="text-3xl font-extrabold leading-tight">Tu es dans la partie, {firstNameOf(me.nickname)}&nbsp;<span aria-hidden>👋</span></h1>
      <Breathing />
      <p className="text-xl text-ink-soft">Le professeur lance bientôt la question.</p>
      <Counter n={state.registered} />
      <Consigne />
    </Centered>
  )
}

function Ready({ state, me }: { state: LiveState; me: Me }) {
  const first = state.currentIndex <= 0
  return (
    <Centered>
      <h1 className="text-3xl font-extrabold leading-tight">{first ? `Prêt, ${firstNameOf(me.nickname)} ?` : 'Prêt pour la prochaine ?'}</h1>
      <Breathing />
      <p className="text-xl text-ink-soft">Question {state.currentIndex + 1} / {state.totalQuestions}</p>
      {first && <Consigne />}
    </Centered>
  )
}

function Timer({ remaining, total }: { remaining: number; total: number }) {
  const urgent = remaining <= 5
  return (
    <div className="space-y-2" role="timer" aria-live="off">
      <div className="flex items-baseline justify-end">
        <span className={`font-extrabold tabular-nums transition-all ${urgent ? 'text-4xl text-bad' : 'text-3xl'}`}>{Math.ceil(remaining)}<span className="ml-0.5 text-lg font-bold">s</span></span>
      </div>
      <div className={`overflow-hidden rounded-full bg-line transition-all ${urgent ? 'h-4' : 'h-3'}`}>
        <div className={`h-full rounded-full ${urgent ? 'bg-bad' : 'bg-brand'}`} style={{ width: `${Math.min(100, (remaining / total) * 100)}%`, transition: 'width .12s linear' }} />
      </div>
    </div>
  )
}

type Phase = { k: 'idle' } | { k: 'sending'; choice: number; shaky: boolean } | { k: 'failed'; choice: number } | { k: 'late' }

function Question({ state, me, call, serverNow, online }: { state: LiveState; me: Me; call: Call; serverNow: () => number; online: boolean }) {
  const q = state.question!
  const remaining = useRemaining(q.deadlineAt, serverNow)
  const [phase, setPhase] = useState<Phase>({ k: 'idle' })
  const [confirmed, setConfirmed] = useState<number | null>(null)
  const saved = me.answered?.questionId === q.id ? me.answered.choiceIndex : confirmed
  const live = useRef({ online, saved })
  live.current = { online, saved }
  const alive = useRef(true)
  const busy = useRef(false)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])

  /** Envoi idempotent : en cas de statut incertain on revérifie avec le MÊME choix, après retour de la connexion. */
  async function send(choice: number) {
    if (busy.current || live.current.saved !== null) return
    busy.current = true
    setPhase({ k: 'sending', choice, shaky: false })
    try {
      while (alive.current && live.current.saved === null) {
        try {
          const r = await call('answer', { questionId: q.id, choiceIndex: choice }, 5000)
          if (!alive.current) return
          if (r.ok) { setConfirmed(r.choiceIndex); return }
          setPhase(['LATE', 'CLOSED', 'NO_QUESTION'].includes(r.code) ? { k: 'late' } : { k: 'failed', choice })
          return
        } catch {
          if (!alive.current) return
          if (serverNow() > (q.deadlineAt ?? 0) + 20_000) return setPhase({ k: 'failed', choice })
          setPhase({ k: 'sending', choice, shaky: true })
          for (let i = 0; i < 10 && !live.current.online; i++) await sleep(400)
          await sleep(300)
        }
      }
    } finally { busy.current = false }
  }

  const locked = saved !== null || phase.k !== 'idle' || remaining <= 0
  const chosen = saved ?? (phase.k === 'sending' || phase.k === 'failed' ? phase.choice : null)
  const sending = saved === null && phase.k === 'sending'

  return (
    <div className="flex flex-1 flex-col gap-5 animate-rise">
      <div className="space-y-2">
        <p className="text-base font-semibold text-ink-soft">Question {q.index + 1} / {state.totalQuestions}</p>
        <Timer remaining={remaining} total={q.durationSec} />
      </div>
      <h1 className="whitespace-pre-line break-words text-2xl font-bold leading-snug">{q.text}</h1>
      <div className="flex flex-col gap-3" role="group" aria-label="Propositions">
        {q.options.map((opt, i) => {
          const mine = chosen === i
          return (
            <button key={i} type="button" onClick={() => void send(i)} disabled={locked && !mine} aria-pressed={mine} aria-disabled={locked}
              className={`flex min-h-[64px] w-full touch-manipulation items-center gap-4 rounded-2xl border-2 px-4 py-3 text-left text-lg font-semibold leading-snug shadow-sm transition active:scale-[.985] ${
                mine ? 'border-brand bg-brand-soft' : 'border-line bg-card'} ${locked && !mine ? 'opacity-50' : ''} ${locked ? 'pointer-events-none' : ''}`}>
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg font-extrabold ${mine ? 'bg-brand text-ink' : 'bg-paper text-ink-soft'}`} aria-hidden>{LETTERS[i]}</span>
              <span className="min-w-0 flex-1 break-words"><span className="sr-only">Réponse {LETTERS[i]} : </span>{opt}</span>
              {mine && saved !== null && <Check className="h-7 w-7 shrink-0 text-ok" />}
              {mine && sending && <span className="shrink-0 text-base font-bold text-ink-soft">Envoi…</span>}
            </button>
          )
        })}
      </div>
      <div className="min-h-[3.5rem] text-center" aria-live="polite">
        {saved !== null ? (
          <div className="space-y-1 animate-pop"><p className="flex items-center justify-center gap-2 text-xl font-extrabold text-ok"><Check className="h-6 w-6" />Réponse enregistrée</p><p className="text-lg text-ink-soft">On attend les autres…</p></div>
        ) : phase.k === 'sending' && phase.shaky ? (
          <p className="text-lg font-semibold text-ink-soft">Connexion instable : on vérifie que ta réponse est bien arrivée…</p>
        ) : phase.k === 'failed' ? (
          <div className="space-y-3"><p role="alert" className="text-lg font-bold text-bad">Réponse non envoyée. Réessaie.</p>
            <button className="btn-primary w-full text-lg" onClick={() => void send(phase.choice)}>Réessayer avec la réponse {LETTERS[phase.choice]}</button></div>
        ) : phase.k === 'late' ? (
          <p role="alert" className="text-lg font-bold text-bad">Trop tard : le temps est écoulé.</p>
        ) : null}
      </div>
    </div>
  )
}

const Tile = ({ label, children, sub }: { label: string; children: ReactNode; sub: string }) => (
  <div className="rounded-2xl border border-line bg-card p-4 text-center shadow-sm">
    <p className="text-base font-semibold text-ink-soft">{label}</p>
    <p className="text-3xl font-extrabold tabular-nums">{children}</p>
    <p className="text-base text-ink-soft">{sub}</p>
  </div>
)

function Result({ state, me }: { state: LiveState; me: Me }) {
  const q = state.question!
  const c = state.correction!
  const r = me.result?.questionId === q.id ? me.result : null
  const gained = useCountUp(r?.correct ? r.points : 0)
  if (!r) return <Centered><Breathing /><p className="text-xl text-ink-soft">Correction en cours…</p></Centered>
  const answered = r.choiceIndex !== null
  const kind = r.poll ? (answered ? 'poll' : 'timeout') : r.correct ? 'ok' : answered ? 'wrong' : 'timeout'
  const tone = { ok: 'bg-ok text-white', wrong: 'bg-bad/10 text-bad', timeout: 'bg-ink/10 text-ink', poll: 'bg-brand/20 text-brand-dark' }[kind]
  const title = { ok: 'Bien joué !', wrong: 'Pas cette fois !', timeout: 'Temps écoulé', poll: 'Vote enregistré !' }[kind]
  return (
    <div className="flex flex-1 flex-col gap-5 animate-rise">
      <div className="space-y-3 text-center" role="status">
        <div className={`mx-auto grid h-20 w-20 place-items-center rounded-full animate-pop ${tone}`}>
          {kind === 'ok' || kind === 'poll' ? <Check className="h-11 w-11" /> : kind === 'wrong' ? <Cross className="h-10 w-10" /> : <Clock />}
        </div>
        <h1 className="text-3xl font-extrabold">{title}</h1>
        {kind === 'ok' && <p className="text-4xl font-extrabold tabular-nums text-ok">+{gained.toLocaleString('fr-FR')} point{r.points > 1 ? 's' : ''}</p>}
      </div>
      {kind === 'poll' && (
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="mb-3 text-base font-bold">Répartition des votes</p>
          <Distribution options={q.options} dist={c.distribution} correct={null} />
        </div>
      )}
      {kind !== 'ok' && kind !== 'poll' && (
        <div className="rounded-2xl border-2 border-ok bg-ok/10 p-4">
          <p className="mb-1 flex items-center gap-2 text-base font-bold text-ok"><Check className="h-5 w-5" />Bonne réponse</p>
          <p className="break-words text-xl font-bold"><span className="mr-2 text-ink-soft">{LETTERS[c.correctIndex!]}.</span>{q.options[c.correctIndex!]}</p>
          {kind === 'wrong' && <p className="mt-2 break-words text-base text-ink-soft">Ton choix : {LETTERS[r.choiceIndex!]}. {q.options[r.choiceIndex!]}</p>}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Tile label="Total" sub={me.total > 1 ? 'points' : 'point'}>{me.total.toLocaleString('fr-FR')}</Tile>
        <Tile label="Classement" sub={me.rank ? `sur ${me.participants}` : ' '}>{me.rank ? ordinal(me.rank) : '–'}</Tile>
      </div>
      {c.explanation && (
        <div className="rounded-2xl bg-brand-soft p-4">
          <p className="mb-1 text-base font-bold">Explication</p>
          <p className="whitespace-pre-line break-words text-lg leading-snug">{c.explanation}</p>
        </div>
      )}
      <p className="pb-2 text-center text-lg text-ink-soft">La suite arrive…</p>
    </div>
  )
}

const Clock = () => (
  <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
)

function Final({ state, me }: { state: LiveState; me: Me }) {
  const top = me.rank !== null && me.rank <= 3
  const podium = (state.podium ?? []).slice(0, 5)
  const medal = (rank: number) => (['🥇', '🥈', '🥉'][rank - 1] ?? '')
  return (
    <div className="flex flex-1 flex-col gap-6 py-4 animate-rise">
      <h1 className="text-center text-3xl font-extrabold leading-tight">Bravo {firstNameOf(me.nickname)}, session terminée&nbsp;!</h1>
      <div className="relative text-center">
        {top && <div className="absolute inset-x-6 -inset-y-2 -z-0 rounded-[2.5rem] bg-brand-soft animate-pop" aria-hidden />}
        <div className="relative py-5">
          {top && <p className="text-4xl animate-pop" aria-hidden>{medal(me.rank!)}</p>}
          <p className="text-7xl font-extrabold tabular-nums text-brand-dark">{me.rank ? ordinal(me.rank) : '–'}</p>
          <p className="text-xl font-semibold text-ink-soft">{me.rank ? `sur ${me.participants}` : ''}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Tile label="Score" sub="points au total">{me.total.toLocaleString('fr-FR')}</Tile>
        {me.final ? <Tile label="Réussite" sub="bonnes réponses">{me.final.correctCount} / {me.final.questions}</Tile> : <div />}
      </div>
      {podium.length > 0 && (
        <section aria-label="Podium" className="space-y-2">
          <h2 className="text-center text-base font-bold text-ink-soft">Podium</h2>
          <ol className="space-y-2">
            {podium.map((p, i) => {
              const you = p.rank === me.rank && p.name === me.nickname
              return (
                <li key={i} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-lg animate-rise ${you ? 'border-brand bg-brand-soft' : 'border-line bg-card'}`} style={{ animationDelay: `${(i + 1) * 180}ms` }}>
                  <span className="w-8 text-2xl" aria-label={`${ordinal(p.rank)}`}>{medal(p.rank)}</span>
                  <span className="min-w-0 flex-1 truncate font-bold">{p.name}{you && <span className="ml-2 text-base font-semibold text-ink-soft">(toi)</span>}</span>
                  <span className="font-extrabold tabular-nums">{p.score.toLocaleString('fr-FR')}</span>
                </li>
              )
            })}
          </ol>
        </section>
      )}
    </div>
  )
}
