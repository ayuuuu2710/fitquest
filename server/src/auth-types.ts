import type { Request } from 'express'

export type AuthenticatedUser = {
  id: string
  email: string
  displayName: string
  emailVerified: boolean
  onboardingComplete: boolean
}

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthenticatedUser
    }
  }
}

export type AuthRequest = Request & { authUser: AuthenticatedUser }
