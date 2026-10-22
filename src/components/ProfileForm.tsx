import { useState, type FormEvent } from 'react'
import { Activity, Check } from 'lucide-react'
import { useAuth, type ProfileInput } from '../auth/AuthContext'

const goalOptions = ['Build strength', 'Improve fitness', 'Lose weight', 'Gain muscle', 'Move more', 'Improve flexibility']
const equipmentOptions = ['Bodyweight', 'Dumbbells', 'Resistance bands', 'Gym access', 'Kettlebell', 'Treadmill']

export function ProfileForm({ onboarding = false }: { onboarding?: boolean }) {
  const { user, updateProfile } = useAuth()
  const profile = user?.profile
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [goals, setGoals] = useState<string[]>(profile?.goals ?? [])
  const [equipment, setEquipment] = useState<string[]>(profile?.availableEquipment ?? [])
  const [experience, setExperience] = useState<ProfileInput['experience']>(profile?.experience ?? 'beginner')
  const [days, setDays] = useState(profile?.workoutDaysPerWeek ?? 3)
  const [minutes, setMinutes] = useState(profile?.minutesPerSession ?? 30)
  const [diet, setDiet] = useState((profile?.dietaryPreferences ?? []).join(', '))
  const [units, setUnits] = useState<ProfileInput['units']>(profile?.units ?? 'metric')
  const [theme, setTheme] = useState<ProfileInput['theme']>(profile?.theme ?? 'dark')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const toggle = (list: string[], value: string, setter: (next: string[]) => void) => setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value])
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true); setError(''); setSaved(false)
    try {
      await updateProfile({ displayName, goals, experience, availableEquipment: equipment, workoutDaysPerWeek: days, minutesPerSession: minutes, dietaryPreferences: diet.split(',').map((item) => item.trim()).filter(Boolean), units, theme, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' })
      setSaved(true)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save your profile.') }
    finally { setBusy(false) }
  }

  return <main className="profile-page"><form className="profile-card" onSubmit={(event) => void submit(event)}>
    <div className="auth-brand"><Activity size={20} /> Fit<span>Quest</span></div>
    <div className="auth-kicker">{onboarding ? 'YOUR STARTING POINT' : 'YOUR ACCOUNT'}</div>
    <h1>{onboarding ? 'Make FitQuest yours.' : 'Profile & preferences'}</h1>
    <p className="auth-subtitle">Tell us what works for you. You can change these details any time.</p>
    <label>Display name<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required maxLength={60} /></label>
    <fieldset><legend>What are your goals?</legend><div className="choice-grid">{goalOptions.map((goal) => <label className="choice" key={goal}><input type="checkbox" checked={goals.includes(goal)} onChange={() => toggle(goals, goal, setGoals)} />{goal}</label>)}</div></fieldset>
    <label>Experience<select value={experience} onChange={(event) => setExperience(event.target.value as ProfileInput['experience'])}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label>
    <fieldset><legend>Available equipment</legend><div className="choice-grid">{equipmentOptions.map((item) => <label className="choice" key={item}><input type="checkbox" checked={equipment.includes(item)} onChange={() => toggle(equipment, item, setEquipment)} />{item}</label>)}</div></fieldset>
    <div className="profile-two"><label>Workout days per week<input type="number" min={1} max={7} value={days} onChange={(event) => setDays(Number(event.target.value))} /></label><label>Minutes per session<input type="number" min={10} max={240} step={5} value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} /></label></div>
    <label>Dietary preferences <small>Optional, comma separated</small><input value={diet} onChange={(event) => setDiet(event.target.value)} placeholder="Vegetarian, dairy-free" /></label>
    <div className="profile-two"><label>Units<select value={units} onChange={(event) => setUnits(event.target.value as ProfileInput['units'])}><option value="metric">Metric</option><option value="imperial">Imperial</option></select></label><label>Appearance<select value={theme} onChange={(event) => setTheme(event.target.value as ProfileInput['theme'])}><option value="dark">Dark</option><option value="light">Light</option><option value="system">System</option></select></label></div>
    {error && <div className="form-message error" role="alert">{error}</div>}{saved && <div className="form-message success" role="status"><Check size={16} /> Profile saved.</div>}
    <button className="button button-primary auth-submit" type="submit" disabled={busy || !goals.length || !equipment.length}>{busy ? 'Saving…' : onboarding ? 'Save and continue' : 'Save profile'}</button>
    {onboarding && <small>Choose at least one goal and one equipment option to continue.</small>}
  </form></main>
}
