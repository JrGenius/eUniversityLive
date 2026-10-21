import { FormEvent, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { ErrorBox, Logo, Screen } from '../components/ui'
import { PwToggle } from './Signup'

export default function Reset() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState(''); const [show, setShow] = useState(false)
  const [done, setDone] = useState(false); const [error, setError] = useState(''); const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('')
    try { await api('/auth/reset', { auth: false, body: { token, password } }); setDone(true) }
    catch (err) { setError((err as Error).message) } finally { setBusy(false) }
  }

  return (
    <Screen>
      <div className="mb-8 mt-6 flex flex-col items-center gap-2"><Link to="/"><Logo className="h-12" /></Link><h1 className="text-2xl font-extrabold">Nouveau mot de passe</h1></div>
      {!token ? (
        <div className="card space-y-4 text-center"><ErrorBox>Lien incomplet : utilisez le lien reçu par e-mail.</ErrorBox><Link className="btn-ghost w-full" to="/enseignant/mot-de-passe-oublie">Demander un nouveau lien</Link></div>
      ) : done ? (
        <div className="card space-y-4 text-center animate-pop" role="status">
          <p className="text-2xl font-extrabold">Mot de passe mis à jour ✓</p>
          <p className="text-ink-soft">Vous pouvez vous connecter avec votre nouveau mot de passe.</p>
          <Link className="btn-primary w-full" to="/enseignant/connexion">Se connecter</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="card space-y-4 animate-rise" noValidate>
          <div>
            <label htmlFor="password" className="label">Nouveau mot de passe</label>
            <div className="relative">
              <input id="password" type={show ? 'text' : 'password'} className="field min-h-[52px] pr-24" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" maxLength={200} autoFocus />
              <PwToggle show={show} onClick={() => setShow(!show)} />
            </div>
            <p className="mt-1.5 text-sm text-ink-soft">8 caractères minimum.</p>
          </div>
          {error && <ErrorBox>{error}</ErrorBox>}
          <button className="btn-primary w-full" disabled={busy || password.length < 8}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button>
        </form>
      )}
    </Screen>
  )
}
