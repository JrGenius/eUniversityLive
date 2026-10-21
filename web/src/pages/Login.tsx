import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, setTeacherToken } from '../lib/api'
import { ErrorBox, Logo, Screen } from '../components/ui'

export default function Login() {
  const nav = useNavigate()
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('')
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('')
    try {
      const r = await api('/auth/login', { auth: false, body: { email, password } })
      setTeacherToken(r.token); nav('/enseignant', { replace: true })
    } catch (err) { setError((err as Error).message) } finally { setBusy(false) }
  }
  return (
    <Screen>
      <div className="mb-8 mt-6 flex flex-col items-center gap-2"><Logo className="h-14" /><h1 className="text-2xl font-extrabold">Espace professeur</h1></div>
      <form onSubmit={submit} className="card space-y-4">
        <div><label htmlFor="email" className="label">Adresse e-mail</label><input id="email" type="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required /></div>
        <div><label htmlFor="pw" className="label">Mot de passe</label><input id="pw" type="password" className="field" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></div>
        {error && <ErrorBox>{error}</ErrorBox>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Connexion…' : 'Se connecter'}</button>
      </form>
    </Screen>
  )
}
