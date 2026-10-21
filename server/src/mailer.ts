import nodemailer, { type Transporter } from 'nodemailer'
import { config } from './config.js'

/**
 * E-mail transactionnel (réinitialisation de mot de passe) via SMTP_* / MAIL_FROM.
 * mailer.enabled = false si le service n'est pas configuré : les routes qui
 * dépendent de l'envoi renvoient alors une erreur explicite, jamais un faux succès.
 */
let transport: Transporter | null = null

export const mailer = {
  enabled: !!config.smtpHost,
  async send(to: string, subject: string, text: string, html?: string): Promise<void> {
    if (!config.smtpHost) throw new Error('Service d’e-mail non configuré (SMTP_HOST manquant).')
    transport ??= nodemailer.createTransport({
      host: config.smtpHost, port: config.smtpPort, secure: config.smtpSecure,
      auth: config.smtpUser ? { user: config.smtpUser, pass: config.smtpPass } : undefined,
      connectionTimeout: 10_000, socketTimeout: 15_000,
    })
    await transport.sendMail({ from: config.mailFrom, to, subject, text, html })
  },
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
const wrap = (title: string, body: string, cta: string, url: string) => `<!doctype html><html lang="fr"><body style="margin:0;background:#FAF7F2;font-family:system-ui,sans-serif;color:#26262B">
  <div style="max-width:480px;margin:0 auto;padding:32px 20px">
    <p style="font-weight:800;font-size:18px;color:#C26500">eUniversité Quiz</p>
    <div style="background:#fff;border:1px solid #E5DFD5;border-radius:16px;padding:24px">
      <h1 style="margin:0 0 12px;font-size:22px">${title}</h1>
      <p style="font-size:16px;line-height:1.5;margin:0 0 20px">${body}</p>
      <p style="margin:0 0 16px"><a href="${url}" style="display:inline-block;background:#FD9503;color:#26262B;font-weight:800;text-decoration:none;padding:14px 28px;border-radius:14px">${cta}</a></p>
      <p style="font-size:13px;color:#62626B;margin:0">Si le bouton ne fonctionne pas, copie ce lien : <a href="${url}" style="color:#C26500;word-break:break-all">${url}</a></p>
    </div>
    <p style="font-size:12px;color:#62626B;margin-top:16px">GENIUS GROUPS SAS · Section EduTech</p>
  </div></body></html>`

export async function sendResetMail(to: string, name: string, url: string) {
  const first = esc(name.trim().split(/\s+/)[0] || name)
  await mailer.send(to, 'Réinitialisation de votre mot de passe — eUniversité Quiz',
    `Bonjour ${name},\n\nVoici votre lien de réinitialisation, valable 1 heure :\n${url}\n\nSi vous n'avez pas demandé ce lien, ignorez ce message : votre mot de passe reste inchangé.`,
    wrap('Réinitialiser votre mot de passe', `Bonjour ${first}, voici votre lien de réinitialisation, valable 1 heure. Sans action de votre part, votre mot de passe reste inchangé.`, 'Choisir un nouveau mot de passe', url))
}
