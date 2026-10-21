import { FormEvent, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import { ErrorBox, Logo, Screen, Spinner } from '../components/ui'

export const tokenKey = (code: string) => `euniv:token:${code}`
const clean = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, '')

export default function Join() {
  const { code: param } = useParams()
  const nav = useNavigate()
  const [code, setCode] = useState(param ? clean(param) : '')
  const [checked, setChecked] = useState<{ quizTitle: string } | null>(null)
  const [fullName, setFullName] = useState(''); const [nickname, setNickname] = useState('')
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(!!param)

  useEffect(() => {
    if (!param) {
      const last = localStorage.getItem('euniv:last')
      if (last && localStorage.getItem(tokenKey(last))) nav(`/play/${last}`, { replace: true })
      return
    }
    const c = clean(param)
    if (localStorage.getItem(tokenKey(c))) return void nav(`/play/${c}`, { replace: true })
    api(`/public/sessions/${c}`, { auth: false })
      .then((s) => (s.ended ? setError('Cette session est terminée.') : setChecked(s)))
      .catch((e: ApiError) => setError(e.message))
      .finally(() => setLoading(false))
  }, [param])

  async function checkCode(e: FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')
    try { await api(`/public/sessions/${clean(code)}`, { auth: false }); nav(`/j/${clean(code)}`) }
    catch (err) { setError((err as Error).message) } finally { setBusy(false) }
  }

  async function join(e: FormEvent) {
    e.preventDefault()
    if (!fullName.trim() || nickname.trim().length < 2) return setError('Renseignez votre nom complet et un pseudo (2 caractères minimum).')
    setBusy(true); setError('')
    try {
      const r = await api('/public/join', { auth: false, body: { code: clean(code), fullName, nickname } })
      localStorage.setItem(tokenKey(r.code), r.token); localStorage.setItem('euniv:last', r.code)
      nav(`/play/${r.code}`, { replace: true })
    } catch (err) { setError((err as Error).message) } finally { setBusy(false) }
  }

  return (
    <Screen>
      <div className="mb-8 flex flex-col items-center gap-2 text-center animate-rise">
        <Logo className="h-14" />
        <h1 className="text-2xl font-extrabold">Quiz en direct</h1>
      </div>
      {loading ? <Spinner /> : !param ? (
        <form onSubmit={checkCode} className="card space-y-4 animate-rise">
          <div>
            <label htmlFor="code" className="label">Code de la session</label>
            <input id="code" className="field text-center text-3xl font-extrabold uppercase tracking-[.3em]" value={code} maxLength={8}
              onChange={(e) => setCode(clean(e.target.value))} autoComplete="off" autoCapitalize="characters" inputMode="text" placeholder="ABC123" autoFocus />
            <p className="mt-2 text-sm text-ink-soft">Scannez le QR code projeté ou saisissez le code affiché au tableau.</p>
          </div>
          {error && <ErrorBox>{error}</ErrorBox>}
          <button className="btn-primary w-full" disabled={busy || code.length < 4}>{busy ? 'Vérification…' : 'Continuer'}</button>
        </form>
      ) : checked ? (
        <form onSubmit={join} className="card space-y-4 animate-rise" noValidate>
          <div className="rounded-xl bg-brand-soft px-4 py-3 text-sm">
            <p className="font-bold">{checked.quizTitle}</p>
            <p className="text-ink-soft">Session <span className="font-mono font-bold">{clean(code)}</span></p>
          </div>
          <div>
            <label htmlFor="fn" className="label">Nom complet</label>
            <input id="fn" className="field" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" maxLength={100} />
            <p className="mt-1.5 text-sm text-ink-soft">Visible uniquement par le professeur.</p>
          </div>
          <div>
            <label htmlFor="nick" className="label">Pseudo</label>
            <input id="nick" className="field" value={nickname} onChange={(e) => setNickname(e.target.value)} autoComplete="nickname" maxLength={20} />
            <p className="mt-1.5 text-sm text-ink-soft">Ce pseudo sera affiché à tous, sur l’écran de la classe.</p>
          </div>
          <p className="rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white">Une pression valide votre réponse. Vous ne pourrez plus la modifier.</p>
          {error && <ErrorBox>{error}</ErrorBox>}
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Connexion…' : 'Rejoindre la classe'}</button>
        </form>
      ) : (
        <div className="card space-y-4 text-center animate-rise">
          <ErrorBox>{error}</ErrorBox>
          <button className="btn-ghost w-full" onClick={() => nav('/')}>Saisir un autre code</button>
        </div>
      )}
    </Screen>
  )
}
