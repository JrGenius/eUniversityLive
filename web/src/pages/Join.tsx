import { FormEvent, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import { ErrorBox, Logo, Spinner } from '../components/ui'
import { StudentShell } from '../components/student'
import { cleanCode, forgetStudent, loadProfile, saveProfile, tokenKey, type Profile } from '../lib/student'

type Field = keyof Profile
const EMPTY: Profile = { fullName: '', nickname: '' }

export default function Join() {
  const { code: param } = useParams()
  const nav = useNavigate()
  const code = cleanCode(param ?? '')
  const [quizTitle, setQuizTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [fatal, setFatal] = useState('')
  const [resume, setResume] = useState<Profile | null>(null)

  useEffect(() => {
    api(`/public/sessions/${code}`, { auth: false })
      .then((s) => {
        if (s.ended && !localStorage.getItem(tokenKey(code))) return setFatal('Cette session est terminée.')
        setQuizTitle(s.quizTitle)
        const p = loadProfile()
        if (p && localStorage.getItem(tokenKey(code))) setResume(p)
      })
      .catch((e: ApiError) => setFatal(e.message))
      .finally(() => setLoading(false))
  }, [param])

  return (
    <StudentShell center>
      <div className="flex flex-col items-center gap-2 pb-6 text-center animate-rise">
        <Logo className="h-10 opacity-90" />
        {quizTitle && <p className="max-w-full break-words text-base font-semibold text-ink-soft">{quizTitle}</p>}
      </div>
      {loading ? <Spinner label="Une seconde…" /> : fatal ? (
        <div className="card space-y-4 text-center animate-rise">
          <ErrorBox>{fatal}</ErrorBox>
          <button className="btn-ghost w-full" onClick={() => nav('/')}>Saisir un autre code</button>
        </div>
      ) : resume ? (
        <Resume profile={resume} onJoin={() => nav(`/play/${code}`, { replace: true })} onNotMe={() => { forgetStudent(code); setResume(null) }} />
      ) : <JoinForm code={code} />}
    </StudentShell>
  )
}

function Resume({ profile, onJoin, onNotMe }: { profile: Profile; onJoin: () => void; onNotMe: () => void }) {
  return (
    <div className="card space-y-5 text-center animate-rise">
      <h1 className="text-2xl font-extrabold">Content de te revoir, {profile.nickname} !</h1>
      <button className="btn-primary w-full text-lg" onClick={onJoin} autoFocus>Rejoindre</button>
      <button className="min-h-[44px] text-base font-semibold text-ink-soft underline" onClick={onNotMe}>Ce n’est pas moi</button>
    </div>
  )
}

function JoinForm({ code }: { code: string }) {
  const nav = useNavigate()
  const [v, setV] = useState<Profile>(() => loadProfile() ?? EMPTY)
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const refs = { fullName: useRef<HTMLInputElement>(null), nickname: useRef<HTMLInputElement>(null) }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    const local: Partial<Record<Field, string>> = {}
    if (!v.fullName.trim()) local.fullName = 'Indique ton nom complet.'
    if (!v.nickname.trim()) local.nickname = 'Choisis un pseudo.'
    setErrors(local); setError('')
    const first = (Object.keys(local) as Field[])[0]
    if (first) return refs[first].current?.focus()
    setBusy(true)
    try {
      const r = await api('/public/join', { auth: false, body: { code, ...v } })
      localStorage.setItem(tokenKey(r.code), r.token); localStorage.setItem('euniv:last', r.code); saveProfile(v)
      nav(`/play/${r.code}`, { replace: true })
    } catch (err) {
      const fields = (err as ApiError).fields ?? []
      const mapped: Partial<Record<Field, string>> = {}
      for (const f of fields) if (f.path in v) mapped[f.path as Field] ??= f.message.replace(/^[^:]+ : /, '')
      if (Object.keys(mapped).length) { setErrors(mapped); refs[Object.keys(mapped)[0] as Field].current?.focus() } else setError((err as Error).message)
    } finally { setBusy(false) }
  }

  const input = (id: Field, label: string, props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <input id={id} ref={refs[id]} className={`field min-h-[52px] ${errors[id] ? 'field-error' : ''}`} value={v[id]} maxLength={id === 'nickname' ? 30 : 100}
        onChange={(e) => { setV({ ...v, [id]: e.target.value }); if (errors[id]) setErrors({ ...errors, [id]: undefined }) }}
        aria-invalid={!!errors[id]} aria-describedby={errors[id] ? `${id}-err` : undefined} {...props} />
      {errors[id] && <p id={`${id}-err`} className="mt-1.5 text-base font-medium text-bad">{errors[id]}</p>}
    </div>
  )

  return (
    <form onSubmit={submit} className="card space-y-4 animate-rise" noValidate>
      <h1 className="text-2xl font-extrabold">Prêt à relever le défi ?</h1>
      {input('fullName', 'Nom complet', { autoComplete: 'name', enterKeyHint: 'next', autoCapitalize: 'words' })}
      {input('nickname', 'Pseudo affiché au classement', { autoComplete: 'nickname', enterKeyHint: 'go', autoCapitalize: 'off', autoCorrect: 'off', spellCheck: false })}
      {error && <ErrorBox>{error}</ErrorBox>}
      <button className="btn-primary w-full text-lg" disabled={busy}>{busy ? 'Connexion…' : 'C’est parti !'}</button>
    </form>
  )
}
