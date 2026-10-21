export interface Profile { fullName: string; nickname: string }

const PROFILE = 'euniv:profile'
export const tokenKey = (code: string) => `euniv:token:${code}`
export const cleanCode = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, '')

export const loadProfile = (): Profile | null => {
  try { const p = JSON.parse(localStorage.getItem(PROFILE) ?? 'null'); return p?.fullName && p?.nickname ? p : null } catch { return null }
}
export const saveProfile = (p: Profile) => localStorage.setItem(PROFILE, JSON.stringify(p))
export const forgetStudent = (code: string) => { localStorage.removeItem(tokenKey(code)); localStorage.removeItem(PROFILE); localStorage.removeItem('euniv:last') }

/** « Sarah D. » → « Sarah » (le nom public est toujours « Prénom + initiale »). */
/** Nom convivial pour l'accueil : premier mot du pseudo (ou du nom). */
export const firstNameOf = (name: string) => name.replace(/\s+\S\.$/, '').split(/\s+/)[0] || name

export const ordinal = (n: number) => `${n}${n === 1 ? 'er' : 'e'}`
export const pts = (n: number) => `${n.toLocaleString('fr-FR')} point${Math.abs(n) > 1 ? 's' : ''}`
export const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
