import nodemailer from "nodemailer"

type MailConfig = {
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
  from: string
  to: string
}

export type EmailSection = {
  label: string
  value?: string | null
}

type SendEmailOptions = {
  subject: string
  text: string
  html?: string
  replyTo?: string
  to?: string
}

function getMailConfig(): MailConfig {
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!user || !pass) {
    throw new Error("SMTP credentials are missing. Set SMTP_USER and SMTP_PASS.")
  }

  const host = process.env.SMTP_HOST ?? "smtp.gmail.com"
  const port = Number.parseInt(process.env.SMTP_PORT ?? "465", 10)
  const secureEnv = process.env.SMTP_SECURE
  const secure = secureEnv ? secureEnv === "true" : port === 465
  const from = process.env.MAIL_FROM ?? user
  const to = process.env.MAIL_TO ?? process.env.SUPPORT_EMAIL ?? user

  return { host, port, secure, user, pass, from, to }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export function formatEmailText(title: string, sections: EmailSection[]) {
  const lines = [title, ""]
  for (const section of sections) {
    const value = (section.value ?? "").toString().trim() || "-"
    lines.push(`${section.label}: ${value}`)
  }
  return lines.join("\n")
}

export function formatEmailHtml(title: string, sections: EmailSection[]) {
  const rows = sections
    .map((section) => {
      const value = (section.value ?? "").toString().trim() || "-"
      return `<tr>
        <td style="padding: 8px 12px; font-weight: 600; border-bottom: 1px solid #e5e7eb; vertical-align: top;">
          ${escapeHtml(section.label)}
        </td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">
          ${escapeHtml(value)}
        </td>
      </tr>`
    })
    .join("")

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="font-family: Arial, Helvetica, sans-serif; color: #111827;">
    <h2 style="font-size: 18px; margin: 0 0 12px;">${escapeHtml(title)}</h2>
    <table style="border-collapse: collapse; width: 100%; max-width: 640px;">
      ${rows}
    </table>
  </body>
</html>`
}

export async function sendEmail(options: SendEmailOptions) {
  const config = getMailConfig()
  const tlsReject = process.env.SMTP_TLS_REJECT_UNAUTHORIZED
  const tls =
    tlsReject && ["false", "0", "no"].includes(tlsReject.toLowerCase())
      ? { rejectUnauthorized: false }
      : undefined
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
    ...(tls ? { tls } : {}),
  })

  await transporter.sendMail({
    from: config.from,
    to: options.to ?? config.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
    replyTo: options.replyTo,
  })
}
