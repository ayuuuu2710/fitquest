import type { ReactNode } from 'react'
import { Activity, RefreshCw } from 'lucide-react'
import { useAuth } from './AuthContext'
import { AuthPage } from './AuthPage'
import { ProfileForm } from '../components/ProfileForm'

export function AuthGate({ children }: { children: ReactNode }) {
  const { status, error, retry, user } = useAuth()
  if (status === 'loading') return <main className="auth-status"><div className="auth-brand"><Activity size={20} /> Fit<span>Quest</span></div><div className="status-spinner" /><p>Connecting securely to FitQuest…</p></main>
  if (status === 'unavailable') return <main className="auth-status"><div className="auth-brand"><Activity size={20} /> Fit<span>Quest</span></div><h1>FitQuest is temporarily unavailable</h1><p>{error}</p><button className="button button-primary" onClick={() => void retry()}><RefreshCw size={16} /> Try again</button><small>Check that the API is running and MongoDB is configured.</small></main>
  if (!user) return <AuthPage />
  if (!user.onboardingComplete) return <ProfileForm onboarding />
  return children
}
