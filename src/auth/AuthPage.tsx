import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Activity, ArrowLeft, ArrowRight, Check, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles, X } from 'lucide-react'
import { useAuth } from './AuthContext'
import { apiRequest } from '../lib/api'
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
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [recoveryAvailable, setRecoveryAvailable] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const inFlight = useRef(false)

  useEffect(() => {
    let active = true
    void apiRequest<{ available: boolean }>('/api/v1/auth/recovery-status')
      .then((result) => { if (active) setRecoveryAvailable(result.available) })
      .catch(() => { if (active) setRecoveryAvailable(false) })
    return () => { active = false }
  }, [])

  const passwordChecks = [
    { label: 'At least 12 characters', valid: password.length >= 12 },
    { label: 'An uppercase letter', valid: /[A-Z]/.test(password) },
    { label: 'A lowercase letter', valid: /[a-z]/.test(password) },
    { label: 'A number', valid: /[0-9]/.test(password) },
    { label: 'A special character', valid: /[^A-Za-z0-9]/.test(password) },
  ]
  const strongPassword = passwordChecks.every((rule) => rule.valid)

  const switchMode = (next: Mode) => {
    setMode(next); setError(''); setSuccess(''); setPassword(''); setConfirmPassword('')
    if (next === 'login') window.history.replaceState({}, '', '/')
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (inFlight.current) return
    if ((mode === 'register' || mode === 'reset') && !strongPassword) {
      setError('Meet all password requirements before continuing.')
      return
    }
    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (mode === 'forgot' && recoveryAvailable !== true) {
      setError('Password recovery is unavailable because email delivery is not configured.')
      return
    }
    inFlight.current = true
    setBusy(true); setError(''); setSuccess('')
    try {
      if (mode === 'login') await signIn(email, password, rememberMe)
      else if (mode === 'register') await register(email, password, displayName)
      else if (mode === 'forgot') setSuccess(await requestPasswordReset(email))
      else if (mode === 'verify') setSuccess(await verifyEmail(token))
      else if (mode === 'reset') { setSuccess(await resetPassword(token, password)); setMode('login'); window.history.replaceState({}, '', '/') }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong. Please try again.')
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  const heading = mode === 'register' ? 'Make progress your own.' : mode === 'forgot' ? 'Reset your password.' : mode === 'verify' ? 'Verify your email.' : mode === 'reset' ? 'Choose a new password.' : 'Your next chapter starts here.'
  const subtitle = mode === 'register' ? 'Create an account to start your FitQuest. No email or phone verification required.' : mode === 'forgot' ? recoveryAvailable ? 'If an account matches that address, we’ll send a time-limited reset link.' : 'Password recovery is unavailable because email delivery is not configured.' : mode === 'verify' ? 'Email verification is not required for FitQuest accounts.' : mode === 'reset' ? 'Choose a strong new password to get back to your account.' : 'A steady routine. A stronger you. One quest at a time.'

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
          {(mode === 'login' || mode === 'register' || mode === 'reset') && <label>{mode === 'reset' ? 'New password' : 'Password'}<span className="auth-input"><LockKeyhole size={16} /><input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === 'login' ? 'Your password' : 'Create a strong password'} required maxLength={128} /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></span></label>}
          {(mode === 'register' || mode === 'reset') && <ul className="password-rules" aria-label="Password requirements">{passwordChecks.map((rule) => <li className={rule.valid ? 'valid' : ''} key={rule.label}>{rule.valid ? <Check size={14} /> : <X size={14} />}{rule.label}</li>)}</ul>}
          {mode === 'register' && <label>Confirm password<span className="auth-input"><LockKeyhole size={16} /><input type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Re-enter your password" required maxLength={128} /><button type="button" aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'} onClick={() => setShowConfirmPassword(!showConfirmPassword)}>{showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></span>{confirmPassword && <small className={password === confirmPassword ? 'confirm-match' : 'confirm-mismatch'}>{password === confirmPassword ? 'Passwords match' : 'Passwords do not match'}</small>}</label>}
          {mode === 'login' && <label className="remember-option"><input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />Keep me signed in longer</label>}
          {error && <div className="form-message error" role="alert">{error}</div>}
          {success && <div className="form-message success" role="status"><CheckCircle2 size={16} />{success}</div>}
          <button className="button button-primary auth-submit" type="submit" disabled={busy || ((mode === 'verify' || mode === 'reset') && !token) || (mode === 'forgot' && recoveryAvailable !== true)} aria-busy={busy}>{busy ? <><span className="auth-spinner" />Please wait…</> : <>{mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : mode === 'verify' ? 'Verify email' : 'Update password'}<ArrowRight size={16} /></>}</button>
        </form>}
        {mode === 'login' && (recoveryAvailable === true ? <button className="auth-inline-link forgot-link" type="button" onClick={() => switchMode('forgot')}>Forgot password?</button> : <p className="recovery-unavailable">{recoveryAvailable === false ? 'Password recovery is unavailable until email delivery is configured.' : 'Checking password recovery availability…'}</p>)}
        <div className="auth-bottom">{mode === 'login' ? <>New to FitQuest? <button type="button" onClick={() => switchMode('register')}>Create an account</button></> : mode === 'register' ? <>Already have an account? <button type="button" onClick={() => switchMode('login')}>Sign in</button></> : <button className="back-link" type="button" onClick={() => switchMode('login')}><ArrowLeft size={14} /> Back to sign in</button>}</div>
        <p className="auth-privacy">Your fitness information stays private. FitQuest is not a medical service.</p>
      </div>
    </section>
  </main>
}
