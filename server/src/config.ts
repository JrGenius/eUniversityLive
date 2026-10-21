const prod = process.env.NODE_ENV === 'production'
const jwtSecret = process.env.JWT_SECRET || 'dev-only-secret'
if (prod && (jwtSecret.length < 24 || jwtSecret.startsWith('change-me'))) {
  throw new Error('JWT_SECRET doit être défini avec une valeur longue et aléatoire en production.')
}

export const config = {
  prod,
  port: Number(process.env.PORT || 3100),
  jwtSecret,
  publicUrl: process.env.PUBLIC_URL || '',
  corsOrigins: (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
  trustProxy: process.env.TRUST_PROXY === '1',
  // Surchargeable par les tests de charge / tests automatisés.
  disableRateLimit: process.env.DISABLE_RATE_LIMIT === '1',
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpSecure: process.env.SMTP_SECURE === '1',
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  mailFrom: process.env.MAIL_FROM || 'eUniversité Quiz <no-reply@euniversite.ci>',
}

export const DURATIONS = [10, 20, 30, 60] as const
export const BASE_POINTS = 800
export const MAX_BONUS = 200
