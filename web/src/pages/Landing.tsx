import { FormEvent, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, teacherToken } from '../lib/api'
import { cleanCode } from '../lib/student'
import { Logo } from '../components/ui'

export default function Landing() {
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => { document.title = 'eUniversité Quiz — Quiz interactifs en direct' }, [])
  useEffect(() => { if (open) input.current?.focus() }, [open])

  async function join(e: FormEvent) {
    e.preventDefault()
    const c = cleanCode(code)
    if (c.length < 4) return setError('Saisis le code affiché au tableau (4 caractères minimum).')
    setBusy(true); setError('')
    try {
      const s = await api(`/public/sessions/${c}`, { auth: false })
      if (s.ended) return setError('Cette session est terminée.')
      nav(`/j/${c}`)
    } catch (err) { setError((err as Error).message) } finally { setBusy(false) }
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden bg-paper px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-10 lg:px-16">
      {/* Ambiance : halo chaud + trame de points, purement décorative */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -right-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-brand/15 blur-3xl" />
        <div className="absolute -bottom-56 -left-40 h-[30rem] w-[30rem] rounded-full bg-brand/10 blur-3xl" />
        <div className="absolute inset-0 [background-image:radial-gradient(rgb(var(--ink)/.06)_1px,transparent_1px)] [background-size:26px_26px] [mask-image:linear-gradient(to_bottom_right,black,transparent_55%)]" />
      </div>

      <header className="relative flex items-center justify-between"><Logo className="h-10 sm:h-12" />
        <Link to="/enseignant/connexion" className="min-h-[44px] rounded-xl px-3 py-2 text-base font-semibold text-ink-soft hover:text-ink">Se connecter</Link>
      </header>

      <main className="relative mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 py-8 lg:grid-cols-[1.05fr_.95fr] lg:gap-16">
        <section className="animate-rise">
          <p className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand-soft px-4 py-1.5 text-sm font-bold text-ink shadow-sm">
            <span className="h-2 w-2 animate-breathe rounded-full bg-brand" aria-hidden />Quiz interactifs en direct
          </p>
          <h1 className="mt-5 text-5xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-6xl xl:text-7xl">
            Faites participer <span className="underline decoration-brand decoration-[.14em] underline-offset-[.12em]">toute la classe.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft sm:text-xl">
            Créez un quiz, partagez le code et laissez vos étudiants répondre en direct.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button type="button" className="btn-primary min-h-[56px] px-7 text-lg shadow-[0_10px_25px_-8px_rgb(var(--brand))] hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-8px_rgb(var(--brand))]" aria-expanded={open} aria-controls="join-form"
              onClick={() => (open ? input.current?.focus() : setOpen(true))}>Accéder à une session</button>
            <Link to={teacherToken() ? '/enseignant' : '/enseignant/inscription'}
              className="btn min-h-[56px] border-2 border-ink bg-card/60 px-7 text-lg text-ink backdrop-blur hover:-translate-y-0.5 hover:bg-ink hover:text-white hover:shadow-lg">Créer une session</Link>
          </div>

          {open && (
            <form id="join-form" onSubmit={join} noValidate className="mt-4 max-w-md rounded-3xl border border-line bg-card p-4 shadow-lg animate-rise"
              onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
              <label htmlFor="session-code" className="label">Code de session</label>
              <div className="flex gap-2">
                <input id="session-code" ref={input} className={`field min-h-[52px] flex-1 text-center text-2xl font-extrabold uppercase tracking-[.25em] ${error ? 'field-error' : ''}`}
                  value={code} maxLength={8} autoComplete="off" autoCapitalize="characters" autoCorrect="off" spellCheck={false} enterKeyHint="go" placeholder="ABC123"
                  aria-invalid={!!error} aria-describedby={error ? 'session-error' : undefined}
                  onChange={(e) => { setCode(cleanCode(e.target.value)); setError('') }} />
                <button className="btn-dark min-h-[52px] px-5" disabled={busy}>{busy ? 'Vérification…' : 'Rejoindre'}</button>
              </div>
              {error && <p id="session-error" role="alert" className="mt-2 text-base font-semibold text-bad">{error}</p>}
            </form>
          )}

          <p className="mt-6 text-lg font-bold text-ink">Un téléphone. Un code. C’est parti.</p>
        </section>

        <Preview />
      </main>

      <footer className="relative mx-auto w-full max-w-6xl border-t border-line pt-4 text-center text-sm leading-relaxed text-ink-soft lg:text-left">
        <p className="font-semibold text-ink">Une solution eUniversité — Votre Campus Connecté</p>
        <p>GENIUS GROUPS SAS · Section EduTech</p>
      </footer>
    </div>
  )
}

/** Illustration d'interface en HTML/CSS : purement décorative, signalée comme aperçu. */
function Preview() {
  const answers = [['A', 'Réponse A', true], ['B', 'Réponse B', false], ['C', 'Réponse C', false]] as const
  return (
    <div className="relative mx-auto hidden w-full max-w-md animate-rise lg:block" role="img" aria-label="Aperçu d’une question de quiz avec trois réponses et un classement">
      {/* Carte d'arrière-plan pour la profondeur */}
      <div aria-hidden className="absolute inset-0 -rotate-3 rounded-[2rem] border border-line bg-brand-soft/70" />
      <span className="absolute -top-3 right-2 z-20 rounded-full bg-ink px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow">Aperçu</span>

      <div className="relative rotate-2 space-y-4 rounded-[2rem] border border-line bg-card p-6 shadow-[0_24px_60px_-20px_rgba(38,38,43,.4)]" aria-hidden>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm font-semibold text-ink-soft"><span>Question 1</span><span>20 s</span></div>
          <div className="h-2.5 overflow-hidden rounded-full bg-line"><div className="h-full w-2/3 rounded-full bg-brand" /></div>
        </div>
        <div className="space-y-2"><div className="h-4 w-11/12 rounded-full bg-ink/80" /><div className="h-4 w-7/12 rounded-full bg-ink/80" /></div>
        <div className="space-y-2.5">
          {answers.map(([l, t, sel]) => (
            <div key={l} className={`flex items-center gap-3 rounded-2xl border-2 px-3 py-3 ${sel ? 'border-brand bg-brand-soft shadow-sm' : 'border-line bg-card'}`}>
              <span className={`grid h-9 w-9 place-items-center rounded-xl font-extrabold ${sel ? 'bg-brand text-ink' : 'bg-paper text-ink-soft'}`}>{l}</span>
              <span className="flex-1 font-semibold">{t}</span>
              {sel && <svg viewBox="0 0 24 24" className="h-6 w-6 text-ok" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>}
            </div>
          ))}
        </div>
        <div className="rounded-2xl bg-paper p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">Classement</p>
          {[['1', 'w-full'], ['2', 'w-4/5'], ['3', 'w-3/5']].map(([r, w]) => (
            <div key={r} className="flex items-center gap-2 py-1">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-brand text-xs font-extrabold">{r}</span>
              <div className="h-2.5 flex-1 rounded-full bg-line"><div className={`h-full rounded-full bg-ink/70 ${w}`} /></div>
            </div>
          ))}
        </div>
      </div>

      {/* Pastilles flottantes */}
      <div aria-hidden className="absolute -left-8 top-16 z-20 animate-float rounded-2xl border border-line bg-card px-4 py-2 font-extrabold text-ok shadow-lg">+920 pts</div>
      <div aria-hidden className="absolute -right-6 bottom-24 z-20 flex animate-float items-center gap-2 rounded-2xl border border-line bg-card px-4 py-2 font-bold shadow-lg [animation-delay:1.2s]">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-ok" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        Réponse enregistrée
      </div>
    </div>
  )
}
