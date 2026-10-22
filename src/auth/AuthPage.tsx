import { useState, type FormEvent } from 'react'
import { Activity, ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles } from 'lucide-react'
import { useAuth } from './AuthContext'
import './auth.css'

type Mode = 'login' | 'register' | 'forgot' | 'verify' | 'reset'

export function AuthPage() {
  const { signIn, register, verifyEmail, requestPasswordReset, resetPassword } = useAuth()
  const token = new URLSearchParams(window.location.search).get('token') ?? ''
  const path = window.location.pathname
  const [mode, setMode] = useState<Mode>(path === '/verify-email' ? 'verify' : path === '/reset-password' ? 'reset' : 'login')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true); setError(''); setSuccess('')
    try {
      if (mode === 'login') await signIn(email, password)
      else if (mode === 'register') setSuccess(await register(email, password, displayName))
      else if (mode === 'forgot') setSuccess(await requestPasswordReset(email))
      else if (mode === 'verify') setSuccess(await verifyEmail(token))
      else if (mode === 'reset') { setSuccess(await resetPassword(token, password)); setMode('login'); window.history.replaceState({}, '', '/') }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const heading = mode === 'register' ? 'Make progress your own.' : mode === 'forgot' ? 'Reset your password.' : mode === 'verify' ? 'Verify your email.' : mode === 'reset' ? 'Choose a new password.' : 'Your next chapter starts here.'
  const subtitle = mode === 'register' ? 'Create an account to start your FitQuest.' : mode === 'forgot' ? 'Enter your email and we’ll send a reset link if an account matches.' : mode === 'verify' ? 'Confirm the address you used to create your FitQuest account.' : mode === 'reset' ? 'Choose a new password to get back to your account.' : 'A steady routine. A stronger you. One quest at a time.'

  return <main className="auth-page">
    <section className="auth-story">
      <a className="auth-brand" href="/"><span className="auth-brand-icon"><Activity size={19} /></span> fit<span>quest</span></a>
      <div className="auth-story-content"><div className="auth-kicker"><Sparkles size={14} /> YOUR JOURNEY, YOUR PACE</div><h1>Build strength.<br /><em>Find your rhythm.</em></h1><p>Small, consistent steps add up. FitQuest brings your workouts, nutrition, and progress into one place.</p><div className="auth-promise"><ShieldCheck size={16} /><span>Your profile and health details are private by default.</span></div></div>
      <span className="auth-story-footer">FITQUEST · FITNESS THAT FITS YOUR LIFE</span><div className="auth-graphic" aria-hidden="true"><div className="graphic-ring ring-one" /><div className="graphic-ring ring-two" /><div className="graphic-star">✳</div></div>
    </section>
    <section className="auth-form-side">
      <div className="auth-mobile-brand"><span className="auth-brand-icon"><Activity size={19} /></span> fit<span>quest</span></div>
      <div className="auth-form-wrap"><div className="auth-kicker"><LockKeyhole size={13} /> SECURE ACCOUNT</div><h2>{heading}</h2><p className="auth-subtitle">{subtitle}</p>
        {!token && (mode === 'verify' || mode === 'reset') ? <div className="form-message error" role="alert">This link is missing its secure token. Open the full link from your email or request another one.</div> : <form className="auth-form" onSubmit={(event) => void submit(event)}>
          {mode === 'register' && <label>Display name<input autoComplete="name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="How should we call you?" required maxLength={60} /></label>}
          {(mode === 'login' || mode === 'register' || mode === 'forgot') && <label>Email address<span className="auth-input"><Mail size={16} /><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required maxLength={254} /></span></label>}
          {(mode === 'login' || mode === 'register' || mode === 'reset') && <label>{mode === 'reset' ? 'New password' : 'Password'}<span className="auth-input"><LockKeyhole size={16} /><input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 12 characters" required minLength={12} maxLength={128} /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></span></label>}
          {mode === 'login' && <button type="button" className="auth-inline-link forgot-link" onClick={() => { setMode('forgot'); setError(''); setSuccess('') }}>Forgot password?</button>}
          {error && <div className="form-message error" role="alert">{error}</div>}
          {success && <div className="form-message success" role="status"><CheckCircle2 size={16} />{success}</div>}
          <button className="button button-primary auth-submit" type="submit" disabled={busy || ((mode === 'verify' || mode === 'reset') && !token)}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : mode === 'verify' ? 'Verify email' : 'Update password'}<ArrowRight size={16} /></button>
        </form>}
        <div className="auth-bottom">{mode === 'login' ? <>New to FitQuest? <button onClick={() => { setMode('register'); setError(''); setSuccess('') }}>Create an account</button></> : mode === 'register' ? <>Already have an account? <button onClick={() => { setMode('login'); setError(''); setSuccess('') }}>Sign in</button></> : <button className="back-link" onClick={() => { setMode('login'); setError(''); setSuccess(''); window.history.replaceState({}, '', '/') }}><ArrowLeft size={14} /> Back to sign in</button>}</div>
        <p className="auth-privacy">Your fitness information stays private. FitQuest is not a medical service.</p>
      </div>
    </section>
  </main>
}
