import { Router, type RequestHandler } from 'express'
import rateLimit from 'express-rate-limit'
import mongoose from 'mongoose'
import { z } from 'zod'
import { config } from './config.js'
import { csrfCookieName, readCookie, requireAuth, requireCsrf, setCsrfCookie, setSessionCookie, sessionCookieName } from './auth-middleware.js'
import { passwordResetEmail, sendTransactionalEmail, verificationEmail } from './email.js'
import { OneTimeToken } from './models/one-time-token.js'
import { Session } from './models/session.js'
import { User } from './models/user.js'
import { createOpaqueToken, hashOpaqueToken, hashPassword, safeEqual, verifyPassword } from './security.js'
import { strongPasswordSchema } from './auth-validation.js'

const registrationSchema = z.object({
  email: z.string().trim().email().max(254),
  password: strongPasswordSchema,
  displayName: z.string().trim().min(1).max(60),
}).strict()
const loginSchema = z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(128), rememberMe: z.boolean().default(false) }).strict()
const tokenSchema = z.object({ token: z.string().min(32).max(200) }).strict()
const resetSchema = tokenSchema.extend({ password: strongPasswordSchema }).strict()
const profileSchema = z.object({
  displayName: z.string().trim().min(1).max(60),
  age: z.number().int().min(13).max(120).nullable(),
  sexForCalculation: z.enum(['female', 'male']).nullable(),
  heightCm: z.number().min(100).max(250).nullable(),
  weightKg: z.number().min(25).max(400).nullable(),
  goals: z.array(z.string().trim().min(1).max(80)).max(8),
  targetWeightKg: z.number().min(25).max(400).nullable(),
  desiredWeeklyChangeKg: z.number().min(-1.5).max(1.5).nullable(),
  experience: z.enum(['beginner', 'intermediate', 'advanced']),
  availableEquipment: z.array(z.string().trim().min(1).max(60)).max(20),
  preferredWorkoutDays: z.array(z.number().int().min(0).max(6)).max(7),
  preferredWorkoutTypes: z.array(z.enum(['strength', 'cardio', 'yoga', 'mobility', 'sports', 'mixed', 'other'])).max(7),
  workoutDaysPerWeek: z.number().int().min(1).max(7),
  minutesPerSession: z.number().int().min(10).max(240),
  trainingIntensity: z.enum(['low', 'moderate', 'high']),
  dietaryPreferences: z.array(z.string().trim().min(1).max(80)).max(12),
  allergies: z.array(z.string().trim().min(1).max(80)).max(20),
  foodRestrictions: z.array(z.string().trim().min(1).max(80)).max(20),
  units: z.enum(['metric', 'imperial']),
  timezone: z.string().trim().min(1).max(64),
  theme: z.enum(['dark', 'light', 'system']),
}).strict()

const authLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_request, response) => response.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please wait and try again.' } }),
})
const recoveryLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_request, response) => response.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many recovery requests. Please wait and try again.' } }),
})

const asyncRoute = (handler: RequestHandler): RequestHandler => (request, response, next) => {
  Promise.resolve(handler(request, response, next)).catch(next)
}

function validationError(response: Parameters<RequestHandler>[1]) {
  response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Check the information and try again.' } })
}

function databaseUnavailable(response: Parameters<RequestHandler>[1]) {
  response.status(503).json({ error: { code: 'DATABASE_UNAVAILABLE', message: 'FitQuest is temporarily unavailable. Please try again shortly.' } })
}

function emailUnavailable(response: Parameters<RequestHandler>[1]) {
  response.status(503).json({ error: { code: 'EMAIL_UNAVAILABLE', message: 'Account email is not configured yet. Please try again later.' } })
}

function sessionCookieOptions() {
  return { httpOnly: true, secure: config.nodeEnv === 'production', sameSite: config.nodeEnv === 'production' ? 'none' as const : 'lax' as const, path: '/' }
}

function publicUser(user: {
  _id: mongoose.Types.ObjectId
  email: string
  emailVerified: boolean
  displayName: string
  onboardingComplete: boolean
  profile: unknown
}) {
  return {
    id: user._id.toString(),
    email: user.email,
    emailVerified: user.emailVerified,
    displayName: user.displayName,
    onboardingComplete: user.onboardingComplete,
    profile: user.profile,
  }
}

async function issueOneTimeToken(userId: mongoose.Types.ObjectId, purpose: 'verify-email' | 'password-reset', hours: number) {
  await OneTimeToken.deleteMany({ userId, purpose })
  const token = createOpaqueToken()
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000)
  const record = await OneTimeToken.create({ userId, purpose, tokenHash: token.hash, expiresAt })
  return { value: token.value, eventId: record._id.toString() }
}

export function createAuthRouter() {
  const router = Router()
  router.use(requireCsrf)

  router.get('/csrf', (_request, response) => {
    const token = createOpaqueToken().value
    setCsrfCookie(response, token)
    response.status(200).json({ csrfToken: token })
  })

  router.get('/recovery-status', (_request, response) => {
    response.status(200).json({ available: Boolean(config.resendApiKey && config.emailFrom) })
  })

  router.post('/register', authLimit, asyncRoute(async (request, response) => {
    const parsed = registrationSchema.safeParse(request.body)
    if (!parsed.success) return validationError(response)
    if (mongoose.connection.readyState !== 1) return databaseUnavailable(response)
    const email = parsed.data.email.toLowerCase()
    if (await User.exists({ email })) {
      return response.status(409).json({ error: { code: 'ACCOUNT_EXISTS', message: 'An account with this email already exists. Sign in instead.' } })
    }

    const passwordHash = await hashPassword(parsed.data.password)
    let user
    try {
      user = await User.create({ email, passwordHash, displayName: parsed.data.displayName, emailVerified: true })
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
        return response.status(409).json({ error: { code: 'ACCOUNT_EXISTS', message: 'An account with this email already exists. Sign in instead.' } })
      }
      throw error
    }

    const token = createOpaqueToken()
    const expiresAt = new Date(Date.now() + config.sessionTtlDays * 24 * 60 * 60 * 1000)
    await Session.create({ userId: user._id, tokenHash: token.hash, expiresAt })
    setSessionCookie(response, token.value)
    response.status(201).json({ user: publicUser(user) })
  }))

  router.post('/verify-email', authLimit, asyncRoute(async (request, response) => {
    const parsed = tokenSchema.safeParse(request.body)
    if (!parsed.success) return validationError(response)
    if (mongoose.connection.readyState !== 1) return databaseUnavailable(response)

    const tokenHash = hashOpaqueToken(parsed.data.token)
    const dbSession = await mongoose.startSession()
    let verified = false
    try {
      await dbSession.withTransaction(async () => {
        const token = await OneTimeToken.findOne({ tokenHash, purpose: 'verify-email', expiresAt: { $gt: new Date() } }).session(dbSession)
        if (!token) return
        const result = await User.updateOne({ _id: token.userId }, { $set: { emailVerified: true } }, { session: dbSession })
        if (result.matchedCount !== 1) return
        await OneTimeToken.deleteMany({ userId: token.userId, purpose: 'verify-email' }, { session: dbSession })
        verified = true
      })
    } finally {
      await dbSession.endSession()
    }

    if (!verified) return response.status(400).json({ error: { code: 'TOKEN_INVALID', message: 'This verification link is invalid or expired. Request a new one and try again.' } })
    response.status(200).json({ message: 'Email verified. You can now sign in.' })
  }))

  router.post('/login', authLimit, asyncRoute(async (request, response) => {
    const parsed = loginSchema.safeParse(request.body)
    if (!parsed.success) return validationError(response)
    if (mongoose.connection.readyState !== 1) return databaseUnavailable(response)

    const user = await User.findOne({ email: parsed.data.email.toLowerCase() }).select('+passwordHash')
    const valid = user ? await verifyPassword(parsed.data.password, user.passwordHash) : false
    if (!user || !valid) {
      return response.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Unable to sign in. Check your email and password.' } })
    }

    if (!user.emailVerified) {
      await User.updateOne({ _id: user._id }, { $set: { emailVerified: true } })
      user.emailVerified = true
    }

    const token = createOpaqueToken()
    const sessionDurationMs = parsed.data.rememberMe
      ? config.sessionTtlDays * 24 * 60 * 60 * 1000
      : 8 * 60 * 60 * 1000
    const expiresAt = new Date(Date.now() + sessionDurationMs)
    await Session.create({ userId: user._id, tokenHash: token.hash, expiresAt })
    setSessionCookie(response, token.value, sessionDurationMs)
    response.status(200).json({ user: publicUser(user) })
  }))

  router.post('/logout', asyncRoute(async (request, response) => {
    const token = readCookie(request, sessionCookieName)
    if (token && mongoose.connection.readyState === 1) {
      const tokenHash = hashOpaqueToken(token)
      await Session.updateOne({ tokenHash, revokedAt: null }, { $set: { revokedAt: new Date() } })
    }
    response.clearCookie(sessionCookieName, { ...sessionCookieOptions(), maxAge: undefined })
    response.status(200).json({ message: 'Signed out.' })
  }))

  router.post('/forgot-password', recoveryLimit, asyncRoute(async (request, response) => {
    const parsed = z.object({ email: z.string().trim().email().max(254) }).strict().safeParse(request.body)
    if (!parsed.success) return validationError(response)
    if (!config.resendApiKey || !config.emailFrom) {
      return response.status(503).json({ error: { code: 'RECOVERY_UNAVAILABLE', message: 'Password recovery is temporarily unavailable because email delivery is not configured.' } })
    }
    if (mongoose.connection.readyState !== 1) return databaseUnavailable(response)

    const user = await User.findOne({ email: parsed.data.email.toLowerCase(), emailVerified: true })
    if (user) {
      const token = await issueOneTimeToken(user._id, 'password-reset', 1)
      await sendTransactionalEmail(passwordResetEmail(user.email, token.value, token.eventId))
    }
    response.status(202).json({ message: 'If an account matches that address, a reset link will be sent when email delivery is available.' })
  }))

  router.post('/reset-password', recoveryLimit, asyncRoute(async (request, response) => {
    const parsed = resetSchema.safeParse(request.body)
    if (!parsed.success) return validationError(response)
    if (mongoose.connection.readyState !== 1) return databaseUnavailable(response)

    const dbSession = await mongoose.startSession()
    let reset = false
    try {
      await dbSession.withTransaction(async () => {
        const token = await OneTimeToken.findOne({ tokenHash: hashOpaqueToken(parsed.data.token), purpose: 'password-reset', expiresAt: { $gt: new Date() } }).session(dbSession)
        if (!token) return
        const passwordHash = await hashPassword(parsed.data.password)
        const result = await User.updateOne({ _id: token.userId }, { $set: { passwordHash } }, { session: dbSession })
        if (result.matchedCount !== 1) return
        await OneTimeToken.deleteMany({ userId: token.userId, purpose: 'password-reset' }, { session: dbSession })
        await Session.deleteMany({ userId: token.userId }, { session: dbSession })
        reset = true
      })
    } finally {
      await dbSession.endSession()
    }

    if (!reset) return response.status(400).json({ error: { code: 'TOKEN_INVALID', message: 'This reset link is invalid or expired. Request a new one and try again.' } })
    response.status(200).json({ message: 'Password updated. Sign in with your new password.' })
  }))

  router.get('/me', requireAuth, asyncRoute(async (request, response) => {
    const user = await User.findById(request.authUser?.id).select('email emailVerified displayName onboardingComplete profile').lean()
    if (!user) return response.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Please sign in to continue.' } })
    response.status(200).json({ user: publicUser(user) })
  }))

  router.patch('/profile', requireAuth, asyncRoute(async (request, response) => {
    const parsed = profileSchema.safeParse(request.body)
    if (!parsed.success) return validationError(response)
    const profile = parsed.data
    const existing = await User.findById(request.authUser?.id).select('onboardingComplete').lean()
    const hasWizardRequirements = profile.age !== null && profile.heightCm !== null && profile.weightKg !== null
      && profile.goals.length > 0 && profile.availableEquipment.length > 0 && profile.preferredWorkoutDays.length > 0
    const complete = Boolean(existing?.onboardingComplete || hasWizardRequirements)
    const user = await User.findByIdAndUpdate(request.authUser?.id, {
      $set: { displayName: profile.displayName, profile, onboardingComplete: complete },
    }, { new: true, runValidators: true }).select('email emailVerified displayName onboardingComplete profile').lean()

    if (!user) return response.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Please sign in to continue.' } })
    response.status(200).json({ user: publicUser(user) })
  }))

  router.get('/csrf-status', (request, response) => {
    const cookieToken = readCookie(request, csrfCookieName)
    const headerToken = request.get('x-csrf-token')
    response.status(200).json({ valid: Boolean(cookieToken && headerToken && safeEqual(cookieToken, headerToken)) })
  })

  return router
}
