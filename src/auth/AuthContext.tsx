import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ApiError, apiRequest, initializeApi } from '../lib/api'

export type UserProfile = {
  goals: string[]; experience: 'beginner' | 'intermediate' | 'advanced' | null
  availableEquipment: string[]; workoutDaysPerWeek: number | null; minutesPerSession: number | null
  dietaryPreferences: string[]; units: 'metric' | 'imperial'; timezone: string; theme: 'dark' | 'light' | 'system'
}
export type AuthUser = { id: string; email: string; emailVerified: boolean; displayName: string; onboardingComplete: boolean; profile: UserProfile }
export type ProfileInput = Omit<UserProfile, 'experience' | 'workoutDaysPerWeek' | 'minutesPerSession'> & {
  experience: NonNullable<UserProfile['experience']>; workoutDaysPerWeek: number; minutesPerSession: number; displayName: string
}
type AuthStatus = 'loading' | 'signed-out' | 'signed-in' | 'unavailable'
type AuthContextValue = {
  status: AuthStatus; user: AuthUser | null; error: string; retry: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, displayName: string) => Promise<string>
  verifyEmail: (token: string) => Promise<string>
  requestPasswordReset: (email: string) => Promise<string>
  resetPassword: (token: string, password: string) => Promise<string>
  updateProfile: (profile: ProfileInput) => Promise<void>; signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [error, setError] = useState('')

  const retry = async () => {
    setStatus('loading')
    setError('')
    try {
      await initializeApi()
      const result = await apiRequest<{ user: AuthUser }>('/api/v1/auth/me')
      setUser(result.user); setStatus('signed-in')
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) { setUser(null); setStatus('signed-out') }
      else { setUser(null); setError(cause instanceof Error ? cause.message : 'The service could not be reached.'); setStatus('unavailable') }
    }
  }
  useEffect(() => { void retry() }, [])

  const signIn: AuthContextValue['signIn'] = async (email, password) => {
    const result = await apiRequest<{ user: AuthUser }>('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
    setUser(result.user); setStatus('signed-in'); setError('')
  }
  const register: AuthContextValue['register'] = async (email, password, displayName) => (await apiRequest<{ message: string }>('/api/v1/auth/register', { method: 'POST', body: JSON.stringify({ email, password, displayName }) })).message
  const verifyEmail: AuthContextValue['verifyEmail'] = async (token) => (await apiRequest<{ message: string }>('/api/v1/auth/verify-email', { method: 'POST', body: JSON.stringify({ token }) })).message
  const requestPasswordReset: AuthContextValue['requestPasswordReset'] = async (email) => (await apiRequest<{ message: string }>('/api/v1/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) })).message
  const resetPassword: AuthContextValue['resetPassword'] = async (token, password) => (await apiRequest<{ message: string }>('/api/v1/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) })).message
  const updateProfile: AuthContextValue['updateProfile'] = async (profile) => {
    const result = await apiRequest<{ user: AuthUser }>('/api/v1/auth/profile', { method: 'PATCH', body: JSON.stringify(profile) })
    setUser(result.user)
  }
  const signOut: AuthContextValue['signOut'] = async () => {
    await apiRequest<{ message: string }>('/api/v1/auth/logout', { method: 'POST' })
    setUser(null); setStatus('signed-out')
  }

  const value = useMemo(() => ({ status, user, error, retry, signIn, register, verifyEmail, requestPasswordReset, resetPassword, updateProfile, signOut }), [status, user, error])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider.')
  return value
}
