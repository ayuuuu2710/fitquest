import { config } from './config.js'

type EmailMessage = { to: string; subject: string; html: string; idempotencyKey: string }

export async function sendTransactionalEmail(message: EmailMessage): Promise<boolean> {
  if (!config.resendApiKey || !config.emailFrom) return false

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.resendApiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': message.idempotencyKey,
      },
      body: JSON.stringify({ from: config.emailFrom, to: [message.to], subject: message.subject, html: message.html }),
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      console.error(`Transactional email delivery failed with status ${response.status}.`)
      return false
    }
    return true
  } catch {
    console.error('Transactional email delivery failed due to a network or timeout error.')
    return false
  }
}

export function verificationEmail(email: string, token: string, eventId: string): EmailMessage {
  const link = new URL('/verify-email', config.appBaseUrl)
  link.searchParams.set('token', token)
  return {
    to: email,
    subject: 'Verify your FitQuest email',
    idempotencyKey: `fitquest/verify/${eventId}`,
    html: `<main style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#20231d"><h1>Verify your email</h1><p>Confirm your email address to finish creating your FitQuest account.</p><p><a href="${link.toString()}" style="display:inline-block;padding:14px 20px;background:#c7f36a;color:#1b2510;text-decoration:none;font-weight:bold;border-radius:8px">Verify email</a></p><p>This link expires in 24 hours. If you didn’t create a FitQuest account, you can ignore this message.</p></main>`,
  }
}

export function passwordResetEmail(email: string, token: string, eventId: string): EmailMessage {
  const link = new URL('/reset-password', config.appBaseUrl)
  link.searchParams.set('token', token)
  return {
    to: email,
    subject: 'Reset your FitQuest password',
    idempotencyKey: `fitquest/reset/${eventId}`,
    html: `<main style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#20231d"><h1>Reset your password</h1><p>Use this link to choose a new password for your FitQuest account.</p><p><a href="${link.toString()}" style="display:inline-block;padding:14px 20px;background:#c7f36a;color:#1b2510;text-decoration:none;font-weight:bold;border-radius:8px">Reset password</a></p><p>This link expires in 1 hour. If you didn’t request this, you can ignore this message.</p></main>`,
  }
}
