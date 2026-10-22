import type { RequestHandler } from 'express'
import mongoose from 'mongoose'
import { createHash } from 'node:crypto'
import { Session } from './models/session.js'
import { User } from './models/user.js'
import { config } from './config.js'
import { safeEqual } from './security.js'

export const sessionCookieName = 'fitquest_session'
export const csrfCookieName = 'fitquest_csrf'

export function readCookie(request: Parameters<RequestHandler>[0], name: string): string | undefined {
  const cookieHeader = request.headers.cookie
  if (!cookieHeader) return undefined

  for (const cookie of cookieHeader.split(';')) {
    const separator = cookie.indexOf('=')
    if (separator < 0 || cookie.slice(0, separator).trim() !== name) continue
    try {
      return decodeURIComponent(cookie.slice(separator + 1).trim())
    } catch {
      return undefined
    }
  }
  return undefined
}

export const requireCsrf: RequestHandler = (request, response, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return next()

  const origin = request.get('origin')
  const cookieToken = readCookie(request, csrfCookieName)
  const headerToken = request.get('x-csrf-token')
  if (origin !== config.clientOrigin || !cookieToken || !headerToken || !safeEqual(cookieToken, headerToken)) {
    response.status(403).json({ error: { code: 'CSRF_REJECTED', message: 'Refresh the page and try again.' } })
    return
  }
  next()
}

export const requireAuth: RequestHandler = async (request, response, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      response.status(503).json({ error: { code: 'DATABASE_UNAVAILABLE', message: 'FitQuest is temporarily unavailable. Please try again shortly.' } })
      return
    }

    const rawToken = readCookie(request, sessionCookieName)
    if (!rawToken) {
      response.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Please sign in to continue.' } })
      return
    }

    const tokenHash = createHash('sha256').update(rawToken).digest('hex')
    const session = await Session.findOne({ tokenHash, revokedAt: null, expiresAt: { $gt: new Date() } }).lean()
    if (!session) {
      response.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Please sign in to continue.' } })
      return
    }

    const user = await User.findById(session.userId).select('email displayName emailVerified onboardingComplete').lean()
    if (!user || !user.emailVerified) {
      response.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Please sign in to continue.' } })
      return
    }

    request.authUser = {
      id: user._id.toString(),
      email: user.email,
      displayName: user.displayName,
      emailVerified: user.emailVerified,
      onboardingComplete: user.onboardingComplete,
    }
    next()
  } catch (error) {
    next(error)
  }
}

export function setSessionCookie(response: Parameters<RequestHandler>[1], token: string) {
  response.cookie(sessionCookieName, token, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
    path: '/',
    maxAge: config.sessionTtlDays * 24 * 60 * 60 * 1000,
  })
}

export function clearSessionCookie(response: Parameters<RequestHandler>[1]) {
  response.clearCookie(sessionCookieName, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
    path: '/',
  })
}

export function setCsrfCookie(response: Parameters<RequestHandler>[1], token: string) {
  response.cookie(csrfCookieName, token, {
    httpOnly: false,
    secure: config.nodeEnv === 'production',
    sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
    path: '/',
  })
}
