const KEY = 'euniv:teacher'
export const teacherToken = () => localStorage.getItem(KEY)
export const setTeacherToken = (t: string | null) => (t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY))

export class ApiError extends Error {
  constructor(public status: number, message: string, public fields: { path: string; message: string }[] = []) { super(message) }
}

export async function api<T = any>(path: string, opts: { method?: string; body?: unknown; auth?: boolean } = {}): Promise<T> {
  const t = teacherToken()
  let r: Response
  try {
    r = await fetch('/api' + path, {
      method: opts.method ?? (opts.body ? 'POST' : 'GET'),
      headers: { 'content-type': 'application/json', ...(opts.auth !== false && t ? { authorization: `Bearer ${t}` } : {}) },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'Connexion impossible. Vérifiez votre réseau et réessayez.')
  }
  const j = await r.json().catch(() => ({}))
  if (!r.ok) {
    if (r.status === 401 && opts.auth !== false && t) { setTeacherToken(null); location.href = '/enseignant/connexion' }
    throw new ApiError(r.status, j.error || 'Une erreur est survenue.', j.fields)
  }
  return j
}

let cfg: Promise<{ publicUrl: string }> | null = null
export async function joinUrl(code: string) {
  cfg ??= api('/config', { auth: false }).catch(() => ({ publicUrl: '' }))
  const { publicUrl } = await cfg
  return `${publicUrl || location.origin}/j/${code}`
}
