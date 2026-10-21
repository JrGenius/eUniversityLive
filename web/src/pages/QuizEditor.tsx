import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { ANS, ErrorBox, Spinner, TeacherNav } from '../components/ui'

interface Q { key: string; text: string; options: string[]; correctIndex: number; durationSec: number; explanation: string }
const DURATIONS = [10, 20, 30, 60]
let n = 0
const blank = (): Q => ({ key: `k${++n}`, text: '', options: ['', '', '', ''], correctIndex: -1, durationSec: 20, explanation: '' })

function validate(title: string, qs: Q[]) {
  const e: Record<string, string> = {}
  if (!title.trim()) e.title = 'Donnez un titre au quiz.'
  if (!qs.length) e.global = 'Ajoutez au moins une question.'
  qs.forEach((q, i) => {
    if (!q.text.trim()) e[`${i}.text`] = 'Saisissez l’énoncé de la question.'
    const filled = q.options.map((o) => o.trim())
    const used = filled.filter(Boolean).length
    if (used < 2) e[`${i}.options`] = 'Renseignez au moins deux propositions.'
    filled.forEach((o, j) => { if (!o && j < 2) e[`${i}.opt${j}`] = 'Proposition vide.' })
    if (q.correctIndex < 0 || !filled[q.correctIndex]) e[`${i}.correct`] = 'Indiquez la bonne réponse parmi les propositions renseignées.'
  })
  return e
}

export default function QuizEditor() {
  const { id } = useParams()
  const nav = useNavigate()
  const isNew = id === 'nouveau'
  const [title, setTitle] = useState(''); const [description, setDescription] = useState('')
  const [qs, setQs] = useState<Q[]>(isNew ? [blank()] : [])
  const [loading, setLoading] = useState(!isNew)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (isNew) return
    api(`/quizzes/${id}`).then((q) => {
      setTitle(q.title); setDescription(q.description ?? '')
      setQs(q.questions.map((x: any) => ({ key: `k${++n}`, text: x.text, options: [...x.options, '', '', ''].slice(0, 4), correctIndex: x.correctIndex, durationSec: x.durationSec, explanation: x.explanation ?? '' })))
    }).catch((e) => setError(e.message)).finally(() => setLoading(false))
  }, [id])

  const upd = (i: number, p: Partial<Q>) => setQs((l) => l.map((q, k) => (k === i ? { ...q, ...p } : q)))
  const setOpt = (i: number, j: number, v: string) => upd(i, { options: qs[i].options.map((o, k) => (k === j ? v : o)) })
  const move = (i: number, d: number) => setQs((l) => { const c = [...l]; const j = i + d; if (j < 0 || j >= c.length) return l; [c[i], c[j]] = [c[j], c[i]]; return c })
  const dupQ = (i: number) => setQs((l) => [...l.slice(0, i + 1), { ...l[i], key: `k${++n}`, options: [...l[i].options] }, ...l.slice(i + 1)])
  const delQ = (i: number) => setQs((l) => l.filter((_, k) => k !== i))

  async function save() {
    const e = validate(title, qs)
    setErrors(e); setError('')
    if (Object.keys(e).length) {
      setError('Certains champs sont incomplets. Corrigez les éléments signalés en rouge.')
      document.querySelector('[data-invalid="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setBusy(true)
    try {
      const body = {
        title, description,
        questions: qs.map((q) => {
          // On retire les propositions vides à la fin et on recalcule la bonne réponse.
          const opts = q.options.map((o) => o.trim())
          const keep = opts.map((o, j) => ({ o, j })).filter((x) => x.o)
          return { text: q.text, options: keep.map((x) => x.o), correctIndex: keep.findIndex((x) => x.j === q.correctIndex), durationSec: q.durationSec, explanation: q.explanation }
        }),
      }
      await api(isNew ? '/quizzes' : `/quizzes/${id}`, { method: isNew ? 'POST' : 'PUT', body })
      nav('/enseignant')
    } catch (err) { setError((err as Error).message) } finally { setBusy(false) }
  }

  const invalid = (k: string) => (errors[k] ? { 'data-invalid': true, 'aria-invalid': true } : {})
  const Err = ({ k }: { k: string }) => (errors[k] ? <p className="mt-1 text-sm font-semibold text-bad">{errors[k]}</p> : null)

  return (
    <>
      <TeacherNav right={<><Link className="btn-ghost btn-sm" to="/enseignant">Annuler</Link><button className="btn-primary btn-sm" disabled={busy} onClick={save}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button></>} />
      <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">
        <h1 className="text-2xl font-extrabold">{isNew ? 'Nouveau quiz' : 'Modifier le quiz'}</h1>
        {loading ? <Spinner /> : (
          <>
            {error && <ErrorBox>{error}</ErrorBox>}
            <div className="card space-y-4">
              <div>
                <label htmlFor="title" className="label">Titre du quiz</label>
                <input id="title" className={`field ${errors.title ? 'field-error' : ''}`} {...invalid('title')} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
                <Err k="title" />
              </div>
              <div>
                <label htmlFor="desc" className="label">Description <span className="font-normal text-ink-soft">(facultative)</span></label>
                <textarea id="desc" className="field" rows={2} value={description} maxLength={500} onChange={(e) => setDescription(e.target.value)} />
              </div>
            </div>

            {qs.map((q, i) => (
              <section key={q.key} className="card space-y-4" aria-label={`Question ${i + 1}`}>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-lg font-extrabold">Question {i + 1}</h2>
                  <div className="flex gap-1.5">
                    <button className="btn-ghost btn-sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Monter la question">↑</button>
                    <button className="btn-ghost btn-sm" onClick={() => move(i, 1)} disabled={i === qs.length - 1} aria-label="Descendre la question">↓</button>
                    <button className="btn-ghost btn-sm" onClick={() => dupQ(i)}>Dupliquer</button>
                    <button className="btn-danger btn-sm" onClick={() => delQ(i)} aria-label="Supprimer la question">Supprimer</button>
                  </div>
                </div>
                <div>
                  <label className="label" htmlFor={`t${q.key}`}>Énoncé</label>
                  <textarea id={`t${q.key}`} className={`field ${errors[`${i}.text`] ? 'field-error' : ''}`} {...invalid(`${i}.text`)} rows={2} maxLength={500} value={q.text} onChange={(e) => upd(i, { text: e.target.value })} />
                  <Err k={`${i}.text`} />
                </div>
                <fieldset {...invalid(`${i}.correct`)}>
                  <legend className="label">Propositions <span className="font-normal text-ink-soft">— cochez la bonne réponse</span></legend>
                  <div className="space-y-2">
                    {q.options.map((o, j) => (
                      <div key={j} className="flex items-center gap-2">
                        <input type="radio" className="h-6 w-6 shrink-0 accent-[rgb(var(--ok))]" name={`c${q.key}`} checked={q.correctIndex === j} onChange={() => upd(i, { correctIndex: j })} aria-label={`Bonne réponse : proposition ${ANS[j].letter}`} />
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sm font-bold text-white ${ANS[j].bg}`} aria-hidden>{ANS[j].letter}</span>
                        <input className={`field ${errors[`${i}.opt${j}`] ? 'field-error' : ''}`} {...invalid(`${i}.opt${j}`)} value={o} maxLength={200} placeholder={j < 2 ? 'Proposition' : 'Proposition (facultative)'} onChange={(e) => setOpt(i, j, e.target.value)} aria-label={`Proposition ${ANS[j].letter}`} />
                      </div>
                    ))}
                  </div>
                  <Err k={`${i}.options`} /><Err k={`${i}.correct`} />
                </fieldset>
                <div>
                  <span className="label">Durée</span>
                  <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Durée">
                    {DURATIONS.map((d) => <button key={d} role="radio" aria-checked={q.durationSec === d} onClick={() => upd(i, { durationSec: d })} className={`btn-sm rounded-xl border px-4 py-2 font-bold ${q.durationSec === d ? 'border-ink bg-ink text-white' : 'border-line bg-card'}`}>{d} s</button>)}
                  </div>
                </div>
                <div>
                  <label className="label" htmlFor={`e${q.key}`}>Explication après correction <span className="font-normal text-ink-soft">(facultative)</span></label>
                  <textarea id={`e${q.key}`} className="field" rows={2} maxLength={600} value={q.explanation} onChange={(e) => upd(i, { explanation: e.target.value })} />
                </div>
              </section>
            ))}
            <button className="btn-ghost w-full border-dashed" onClick={() => setQs((l) => [...l, blank()])}>+ Ajouter une question</button>
            {errors.global && <ErrorBox>{errors.global}</ErrorBox>}
            <button className="btn-primary w-full" disabled={busy} onClick={save}>{busy ? 'Enregistrement…' : 'Enregistrer le quiz'}</button>
          </>
        )}
      </main>
    </>
  )
}
