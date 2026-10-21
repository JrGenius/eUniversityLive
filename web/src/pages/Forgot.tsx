import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { ErrorBox, Logo, Screen } from '../components/ui'

export default function Forgot() {
  const [email, setEmail] = useState('')
  const [done, setDone] = useState<null | { mailSent: boolean }>(null)
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('')
    try { setDone(await api('/auth/forgot', { auth: false, body: { email } })) }
    catch (err) { setError((err as Error).message) } finally { setBusy(false) }
  }

  return (
    <Screen>
      <div className="mb-8 mt-6 flex flex-col items-center gap-2"><Link to="/"><Logo className="h-12" /></Link><h1 className="text-2xl font-extrabold">Mot de passe oublié</h1></div>
      {done ? (
        <div className="card space-y-4 text-center animate-rise" role="status">
          <p className="text-lg">Si un compte existe pour <b>{email}</b>, un lien de réinitialisation vient d’être envoyé. Il est valable 1 heure.</p>
          {done.mailSent === false && <ErrorBox>Le serveur ne peut pas envoyer d’e-mail pour le moment (service non configuré). Réessayez plus tard ou contactez l’administrateur.</ErrorBox>}
          <Link className="btn-ghost w-full" to="/enseignant/connexion">Retour à la connexion</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="card space-y-4 animate-rise" noValidate>
          <p className="text-ink-soft">Saisissez l’adresse e-mail de votre compte : nous vous enverrons un lien pour choisir un nouveau mot de passe.</p>
          <div>
            <label htmlFor="email" className="label">Adresse e-mail</label>
            <input id="email" type="email" className="field min-h-[52px]" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" required autoFocus />
          </div>
          {error && <ErrorBox>{error}</ErrorBox>}
          <button className="btn-primary w-full" disabled={busy || !email.trim()}>{busy ? 'Envoi…' : 'Envoyer le lien'}</button>
          <p className="text-center"><Link className="font-semibold text-ink-soft underline" to="/enseignant/connexion">Retour à la connexion</Link></p>
        </form>
      )}
    </Screen>
  )
}
