import { useParams } from 'react-router-dom'
import { useLive, useRemaining } from '../lib/live'
import { ANS, ConnectionBanner, Logo, Spinner } from '../components/ui'
import { JoinQr } from '../components/Qr'
import { Distribution, Podium, TopList } from '../components/Parts'

export default function Projection() {
  const { code = '' } = useParams()
  const { state: s, conn, serverNow } = useLive({ role: 'screen', code })
  const q = s?.question
  const remaining = useRemaining(s?.status === 'OPEN' ? q?.deadlineAt : null, serverNow)

  if (conn === 'denied') return <div className="grid min-h-screen place-items-center text-4xl font-bold">Session introuvable</div>
  if (!s) return <><ConnectionBanner conn={conn} /><Spinner label="Connexion…" /></>

  return (
    <div className="flex min-h-screen flex-col bg-paper p-8 text-ink">
      <ConnectionBanner conn={conn} />
      <header className="mb-6 flex items-center justify-between">
        <Logo className="h-16" />
        <p className="text-3xl font-bold">{s.quizTitle}</p>
        <p className="text-3xl font-bold text-ink-soft">{s.currentIndex >= 0 && s.status !== 'ENDED' ? `Question ${s.currentIndex + 1} / ${s.totalQuestions}` : ''}</p>
      </header>
      <main className="flex flex-1 flex-col justify-center">
        {(s.status === 'WAITING') && (
          <div className="flex items-center justify-center gap-24 animate-rise">
            <JoinQr code={s.code} size={380} />
            <div className="space-y-6">
              <p className="text-4xl font-semibold text-ink-soft">Rejoignez la classe</p>
              <p className="text-3xl">Scannez le QR code ou saisissez le code :</p>
              <p className="font-mono text-[9rem] font-extrabold leading-none tracking-[.15em] text-brand-dark">{s.code}</p>
              <p className="text-5xl font-bold">{s.registered} participant{s.registered > 1 ? 's' : ''}</p>
            </div>
          </div>
        )}
        {s.status === 'READY' && (
          <div className="space-y-6 text-center animate-pop">
            <p className="text-7xl font-extrabold">Question {s.currentIndex + 1}</p>
            <p className="text-4xl text-ink-soft">Préparez-vous…</p>
            <p className="text-3xl">Code <span className="font-mono font-extrabold">{s.code}</span> · {s.registered} participants</p>
          </div>
        )}
        {s.status === 'OPEN' && q && (
          <div className="space-y-8 animate-rise">
            <div className="flex items-start justify-between gap-8">
              <h1 className="text-6xl font-extrabold leading-tight">{q.text}</h1>
              <div className={`grid h-44 w-44 shrink-0 place-items-center rounded-full border-[12px] text-7xl font-extrabold tabular-nums ${remaining <= 5 ? 'border-bad text-bad' : 'border-brand'}`} role="timer">{Math.ceil(remaining)}</div>
            </div>
            <ul className="grid grid-cols-2 gap-5">{q.options.map((o, i) => <li key={i} className={`flex items-center gap-5 rounded-3xl px-8 py-7 text-4xl font-bold text-white ${ANS[i].bg}`}><span className="text-5xl" aria-hidden>{ANS[i].symbol}</span><span>{ANS[i].letter}. {o}</span></li>)}</ul>
            <p className="text-center text-4xl font-semibold text-ink-soft">{s.answered} / {s.registered} réponses</p>
          </div>
        )}
        {s.status === 'CORRECTION' && q && s.correction && (
          <div className="grid grid-cols-[1.4fr_1fr] gap-12 animate-rise">
            <div className="space-y-6">
              <h1 className="text-5xl font-extrabold leading-tight">{q.text}</h1>
              {s.correction.poll
                ? <p className="flex items-center gap-4 rounded-3xl bg-ink px-8 py-6 text-4xl font-bold text-white">Sondage — répartition des votes</p>
                : <p className={`flex items-center gap-4 rounded-3xl px-8 py-6 text-4xl font-bold text-white ${ANS[s.correction.correctIndex!].bg}`}><span aria-hidden>✓</span>{ANS[s.correction.correctIndex!].letter}. {q.options[s.correction.correctIndex!]}</p>}
              <Distribution big options={q.options} dist={s.correction.distribution} correct={s.correction.correctIndex} />
              {s.correction.explanation && <p className="rounded-2xl bg-brand-soft px-6 py-4 text-2xl">{s.correction.explanation}</p>}
            </div>
            <div><h2 className="mb-4 text-4xl font-extrabold">Top 5</h2><TopList big items={s.top5 ?? []} /></div>
          </div>
        )}
        {s.status === 'ENDED' && (
          <div className="mx-auto w-full max-w-4xl space-y-10 text-center">
            <h1 className="text-7xl font-extrabold">Podium final</h1>
            <Podium big items={s.podium ?? []} />
          </div>
        )}
      </main>
    </div>
  )
}
