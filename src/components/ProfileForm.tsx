import { useMemo, useState, type ReactNode } from 'react'
import { Activity, ArrowLeft, ArrowRight, Check, LogOut } from 'lucide-react'
import { useAuth, type ProfileInput } from '../auth/AuthContext'
import { estimateRestingEnergyKcal } from '../lib/fitness'

const steps = ['Personal information', 'Fitness goals', 'Workout preferences', 'Nutrition preferences', 'Review & finish']
const goals = ['Weight loss', 'Weight gain', 'Muscle building', 'Strength improvement', 'General fitness', 'Endurance', 'Weight maintenance']
const equipmentOptions = ['Bodyweight', 'Dumbbells', 'Resistance bands', 'Gym access', 'Kettlebell', 'Treadmill', 'Barbell', 'Other']
const workoutTypes = [
  ['strength', 'Strength'], ['cardio', 'Cardio'], ['yoga', 'Yoga'], ['mobility', 'Mobility'],
  ['sports', 'Sports'], ['mixed', 'Mixed training'], ['other', 'Other'],
] as const
const dietOptions = ['Vegetarian', 'Vegan', 'Eggetarian', 'High protein', 'Low carbohydrate', 'Keto']
const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const splitList = (value: string) => value.split(',').map((part) => part.trim()).filter(Boolean)
const toNumberOrNull = (value: string) => value.trim() === '' ? null : Number(value)
const cmToInches = (cm: number) => cm / 2.54
const kgToPounds = (kg: number) => kg * 2.2046226218

export function ProfileForm({ onboarding = false, onThemeChange }: { onboarding?: boolean; onThemeChange?: (theme: ProfileInput['theme']) => void }) {
  const { user, updateProfile, signOut } = useAuth()
  const profile = user?.profile
  const [step, setStep] = useState(0)
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [age, setAge] = useState(profile?.age?.toString() ?? '')
  const [sex, setSex] = useState<ProfileInput['sexForCalculation']>(profile?.sexForCalculation ?? null)
  const [heightCm, setHeightCm] = useState(profile?.heightCm === null || profile?.heightCm === undefined ? '' : String(profile.units === 'imperial' ? cmToInches(profile.heightCm) : profile.heightCm))
  const [weightKg, setWeightKg] = useState(profile?.weightKg === null || profile?.weightKg === undefined ? '' : String(profile.units === 'imperial' ? kgToPounds(profile.weightKg) : profile.weightKg))
  const [goalList, setGoalList] = useState<string[]>(profile?.goals ?? [])
  const [targetWeightKg, setTargetWeightKg] = useState(profile?.targetWeightKg === null || profile?.targetWeightKg === undefined ? '' : String(profile.units === 'imperial' ? kgToPounds(profile.targetWeightKg) : profile.targetWeightKg))
  const [weeklyChangeKg, setWeeklyChangeKg] = useState(profile?.desiredWeeklyChangeKg === null || profile?.desiredWeeklyChangeKg === undefined ? '' : String(profile.units === 'imperial' ? Math.abs(profile.desiredWeeklyChangeKg) * 2.2046226218 : Math.abs(profile.desiredWeeklyChangeKg)))
  const [experience, setExperience] = useState<ProfileInput['experience']>(profile?.experience ?? 'beginner')
  const [equipment, setEquipment] = useState<string[]>(profile?.availableEquipment ?? [])
  const [preferredDays, setPreferredDays] = useState<number[]>(profile?.preferredWorkoutDays ?? [])
  const [minutes, setMinutes] = useState(profile?.minutesPerSession ?? 30)
  const [types, setTypes] = useState<string[]>(profile?.preferredWorkoutTypes ?? [])
  const [intensity, setIntensity] = useState<ProfileInput['trainingIntensity']>(profile?.trainingIntensity ?? 'moderate')
  const [diet, setDiet] = useState<string[]>(() => {
    const saved = profile?.dietaryPreferences ?? []
    return [...saved.filter((item) => dietOptions.includes(item)), ...(saved.some((item) => !dietOptions.includes(item)) ? ['Other'] : [])]
  })
  const [otherDiet, setOtherDiet] = useState(() => (profile?.dietaryPreferences ?? []).filter((item) => !dietOptions.includes(item)).join(', '))
  const [allergiesText, setAllergiesText] = useState((profile?.allergies ?? []).join(', '))
  const [restrictionsText, setRestrictionsText] = useState((profile?.foodRestrictions ?? []).join(', '))
  const [units, setUnits] = useState<ProfileInput['units']>(profile?.units ?? 'metric')
  const [theme, setTheme] = useState<ProfileInput['theme']>(() => {
    const savedTheme = localStorage.getItem('fitquest-theme')
    return savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system' ? savedTheme : profile?.theme ?? 'dark'
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const restingEnergy = useMemo(() => estimateRestingEnergyKcal({
    age: toNumberOrNull(age),
    heightCm: heightCm === '' ? null : units === 'metric' ? Number(heightCm) : Number(heightCm) * 2.54,
    weightKg: weightKg === '' ? null : units === 'metric' ? Number(weightKg) : Number(weightKg) / 2.2046226218,
    sexForCalculation: sex,
  }), [age, heightCm, weightKg, sex, units])

  const toggle = (list: string[], value: string, setList: (next: string[]) => void) => setList(list.includes(value) ? list.filter((item) => item !== value) : [...list, value])
  const changeUnits = (next: ProfileInput['units']) => {
    if (next === units) return
    const convert = (value: string, factor: number) => value === '' ? '' : String(Number(value) * factor)
    if (next === 'imperial') {
      setHeightCm((value) => convert(value, 1 / 2.54))
      setWeightKg((value) => convert(value, 2.2046226218))
      setTargetWeightKg((value) => convert(value, 2.2046226218))
      setWeeklyChangeKg((value) => convert(value, 2.2046226218))
    } else {
      setHeightCm((value) => convert(value, 2.54))
      setWeightKg((value) => convert(value, 1 / 2.2046226218))
      setTargetWeightKg((value) => convert(value, 1 / 2.2046226218))
      setWeeklyChangeKg((value) => convert(value, 1 / 2.2046226218))
    }
    setUnits(next)
  }
  const toggleGoal = (goal: string) => {
    const weightGoals = ['Weight loss', 'Weight gain', 'Weight maintenance']
    if (weightGoals.includes(goal) && !goalList.includes(goal)) {
      setGoalList([...goalList.filter((item) => !weightGoals.includes(item)), goal])
    } else toggle(goalList, goal, setGoalList)
  }
  const setDay = (day: number) => setPreferredDays((days) => days.includes(day) ? days.filter((item) => item !== day) : [...days, day].sort((a, b) => a - b))
  const goalChangeDirection = goalList.includes('Weight loss') ? -1 : goalList.some((goal) => ['Weight gain', 'Muscle building'].includes(goal)) ? 1 : 0

  const validateStep = () => {
    if (step === 0) {
      if (!displayName.trim()) return 'Enter the name you want FitQuest to use.'
      const ageValue = toNumberOrNull(age)
      const heightValue = toNumberOrNull(heightCm)
      const weightValue = toNumberOrNull(weightKg)
      const required = onboarding || Boolean(age || heightCm || weightKg)
      if (required && (!ageValue || ageValue < 13 || ageValue > 120)) return 'Enter an age from 13 to 120 years.'
      if (required && (!heightValue || heightValue < (units === 'metric' ? 100 : 39.4) || heightValue > (units === 'metric' ? 250 : 98.4))) return `Enter a valid height in ${units === 'metric' ? 'centimeters' : 'inches'}.`
      if (required && (!weightValue || weightValue < (units === 'metric' ? 25 : 55) || weightValue > (units === 'metric' ? 400 : 882))) return `Enter a valid weight in ${units === 'metric' ? 'kilograms' : 'pounds'}.`
    }
    if (step === 1 && goalList.length === 0) return 'Choose at least one fitness goal.'
    if (step === 1 && !experience) return 'Choose your experience level.'
    if (step === 1 && goalList.some((goal) => ['Weight loss', 'Weight gain', 'Muscle building', 'Weight maintenance'].includes(goal))) {
      const target = toNumberOrNull(targetWeightKg)
      if (!target || target < (units === 'metric' ? 25 : 55) || target > (units === 'metric' ? 400 : 882)) return 'Enter a valid target weight for your selected goal.'
    }
    if (step === 1 && goalChangeDirection !== 0) {
      const change = toNumberOrNull(weeklyChangeKg)
      if (!change || change <= 0 || change > (units === 'metric' ? 1.5 : 3.3)) return 'Enter a weekly change above 0 and within the shown limit.'
    }
    if (step === 2 && equipment.length === 0) return 'Choose at least one available equipment option.'
    if (step === 2 && preferredDays.length === 0) return 'Choose at least one preferred workout day.'
    if (step === 2 && (minutes < 10 || minutes > 240)) return 'Choose a workout duration between 10 and 240 minutes.'
    if (step === 3 && splitList(allergiesText).length > 20) return 'Enter no more than 20 allergies, separated by commas.'
    if (step === 3 && splitList(restrictionsText).length > 20) return 'Enter no more than 20 food restrictions, separated by commas.'
    if (step === 3 && [...diet.filter((item) => item !== 'Other'), ...(diet.includes('Other') ? splitList(otherDiet) : [])].length > 12) return 'Choose or enter no more than 12 dietary preferences.'
    return ''
  }

  const moveNext = () => {
    const message = validateStep()
    if (message) { setError(message); return }
    setError(''); setStep((current) => Math.min(current + 1, steps.length - 1))
  }

  const submit = async () => {
    const message = validateStep()
    if (message) { setError(message); return }
    setBusy(true); setError(''); setSaved(false)
    try {
      const heightInput = toNumberOrNull(heightCm)
      const weightInput = toNumberOrNull(weightKg)
      const targetInput = toNumberOrNull(targetWeightKg)
      const weeklyInput = toNumberOrNull(weeklyChangeKg)
      const metricHeight = heightInput === null ? null : units === 'metric' ? heightInput : heightInput * 2.54
      const metricWeight = weightInput === null ? null : units === 'metric' ? weightInput : weightInput / 2.2046226218
      const metricTarget = targetInput === null ? null : units === 'metric' ? targetInput : targetInput / 2.2046226218
      const metricWeekly = weeklyInput === null || goalChangeDirection === 0 ? null : (units === 'metric' ? weeklyInput : weeklyInput / 2.2046226218) * goalChangeDirection
      const dietaryPreferences = [...diet.filter((item) => item !== 'Other'), ...(diet.includes('Other') ? splitList(otherDiet) : [])]
      await updateProfile({
        displayName: displayName.trim(), age: toNumberOrNull(age), sexForCalculation: sex,
        heightCm: metricHeight, weightKg: metricWeight, goals: goalList,
        targetWeightKg: metricTarget, desiredWeeklyChangeKg: metricWeekly,
        experience, availableEquipment: equipment, preferredWorkoutDays: preferredDays,
        preferredWorkoutTypes: types as ProfileInput['preferredWorkoutTypes'], workoutDaysPerWeek: preferredDays.length,
        minutesPerSession: minutes, trainingIntensity: intensity, dietaryPreferences,
        allergies: splitList(allergiesText), foodRestrictions: splitList(restrictionsText),
        units, theme, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      })
      setSaved(true)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save your profile. Please try again.') }
    finally { setBusy(false) }
  }

  const selected = (items: string[], setter: (next: string[]) => void, value: string) => <label className="choice" key={value}><input type="checkbox" checked={items.includes(value)} onChange={() => toggle(items, value, setter)} />{value}</label>
  const summaryRow = (label: string, value: ReactNode) => <div className="wizard-summary-row"><span>{label}</span><strong>{value || 'Not provided'}</strong></div>

  return <main className="profile-page"><section className="profile-card onboarding-card">
    <div className="auth-brand"><Activity size={20} /> Fit<span>Quest</span></div>
    <div className="auth-kicker">{onboarding ? 'YOUR STARTING POINT' : 'YOUR ACCOUNT'}</div>
    <h1>{onboarding ? 'Make FitQuest yours.' : 'Profile & preferences'}</h1>
    <p className="auth-subtitle">{onboarding ? 'A few details help tailor your experience. You can change them later.' : 'Review and update your profile one section at a time.'}</p>
    <div className="wizard-progress" role="progressbar" aria-valuemin={1} aria-valuemax={5} aria-valuenow={step + 1} aria-label={`Step ${step + 1} of 5`}><span style={{ width: `${(step + 1) * 20}%` }} /></div>
    <div className="wizard-step-caption"><span>STEP {step + 1} OF 5</span><strong>{steps[step]}</strong></div>
    <div className="wizard-step-content" key={step}>
      {step === 0 && <div className="wizard-fields">
        <p className="wizard-help">Your measurements are private and help calculate an optional resting-energy estimate. They are not a diagnosis or a calorie prescription.</p>
        <label>Name<input autoComplete="name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={60} required /></label>
        <div className="profile-two"><label>Age<input type="number" min={13} max={120} value={age} onChange={(event) => setAge(event.target.value)} required={onboarding} /><small>Age in years. The estimate is only shown within the method’s adult study range.</small></label><label>Units<select value={units} onChange={(event) => changeUnits(event.target.value as ProfileInput['units'])}><option value="metric">Metric</option><option value="imperial">Imperial</option></select></label></div>
        <fieldset><legend>Biological sex for the estimate <small>Optional; used only to select the equation constant.</small></legend><div className="choice-grid">{(['female', 'male'] as const).map((value) => <label className="choice" key={value}><input type="radio" name="calculation-sex" checked={sex === value} onChange={() => setSex(value)} />{value === 'female' ? 'Female' : 'Male'}</label>)}<label className="choice"><input type="radio" name="calculation-sex" checked={sex === null} onChange={() => setSex(null)} />Skip</label></div></fieldset>
        <div className="profile-two"><label>Height ({units === 'metric' ? 'cm' : 'in'})<input type="number" min={units === 'metric' ? 100 : 39.4} max={units === 'metric' ? 250 : 98.4} step="0.1" value={heightCm} onChange={(event) => setHeightCm(event.target.value)} required={onboarding} /></label><label>Current body weight ({units === 'metric' ? 'kg' : 'lb'})<input type="number" min={units === 'metric' ? 25 : 55} max={units === 'metric' ? 400 : 882} step="0.1" value={weightKg} onChange={(event) => setWeightKg(event.target.value)} required={onboarding} /></label></div>
      </div>}
      {step === 1 && <div className="wizard-fields">
        <fieldset><legend>Choose your goals</legend><div className="choice-grid">{goals.map((goal) => <label className="choice" key={goal}><input type="checkbox" checked={goalList.includes(goal)} onChange={() => toggleGoal(goal)} />{goal}</label>)}</div></fieldset>
        {goalList.some((goal) => ['Weight loss', 'Weight gain', 'Muscle building', 'Weight maintenance'].includes(goal)) && <label>Target weight ({units === 'metric' ? 'kg' : 'lb'})<input type="number" min={units === 'metric' ? 25 : 55} max={units === 'metric' ? 400 : 882} step="0.1" value={targetWeightKg} onChange={(event) => setTargetWeightKg(event.target.value)} /></label>}
        {goalChangeDirection !== 0 && <label>Desired weekly change ({units === 'metric' ? 'kg' : 'lb'} per week)<input type="number" min="0" max={units === 'metric' ? 1.5 : 3.3} step="0.1" value={weeklyChangeKg} onChange={(event) => setWeeklyChangeKg(event.target.value)} /><small>This is a preference, not a recommended or guaranteed rate.</small></label>}
        <label>Experience level<select value={experience} onChange={(event) => setExperience(event.target.value as ProfileInput['experience'])}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label>
      </div>}
      {step === 2 && <div className="wizard-fields">
        <fieldset><legend>Available equipment</legend><div className="choice-grid">{equipmentOptions.map((item) => selected(equipment, setEquipment, item))}</div></fieldset>
        <fieldset><legend>Preferred workout days</legend><div className="choice-grid">{weekDays.map((day, index) => <label className="choice" key={day}><input type="checkbox" checked={preferredDays.includes(index)} onChange={() => setDay(index)} />{day}</label>)}</div></fieldset>
        <div className="profile-two"><label>Workout duration (minutes)<input type="number" min={10} max={240} step={5} value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} /></label><label>Training intensity<select value={intensity} onChange={(event) => setIntensity(event.target.value as ProfileInput['trainingIntensity'])}><option value="low">Low</option><option value="moderate">Moderate</option><option value="high">High</option></select></label></div>
        <fieldset><legend>Preferred workout types</legend><div className="choice-grid">{workoutTypes.map(([value, label]) => <label className="choice" key={value}><input type="checkbox" checked={types.includes(value)} onChange={() => toggle(types, value, setTypes)} />{label}</label>)}</div></fieldset>
      </div>}
      {step === 3 && <div className="wizard-fields">
        <fieldset><legend>Dietary preferences</legend><div className="choice-grid">{dietOptions.map((item) => selected(diet, setDiet, item))}{selected(diet, setDiet, 'Other')}</div></fieldset>
        {diet.includes('Other') && <label>Other preferences<input value={otherDiet} onChange={(event) => setOtherDiet(event.target.value)} placeholder="e.g. dairy-free" /></label>}
        <label>Allergies<input value={allergiesText} onChange={(event) => setAllergiesText(event.target.value)} placeholder="Comma-separated, if any" /><small>Always verify food labels and ingredients.</small></label>
        <label>Other food restrictions<input value={restrictionsText} onChange={(event) => setRestrictionsText(event.target.value)} placeholder="Comma-separated, optional" /></label>
        <div className="profile-two"><label>Units<select value={units} onChange={(event) => changeUnits(event.target.value as ProfileInput['units'])}><option value="metric">Metric</option><option value="imperial">Imperial</option></select></label><label>Appearance<select value={theme} onChange={(event) => { const next = event.target.value as ProfileInput['theme']; setTheme(next); onThemeChange?.(next) }}><option value="dark">Dark</option><option value="light">Light</option><option value="system">System</option></select></label></div>
      </div>}
      {step === 4 && <div className="wizard-review">
        <section className="wizard-review-section"><div><h2>Personal information</h2><button type="button" onClick={() => setStep(0)}>Edit</button></div>{summaryRow('Name', displayName)}{summaryRow('Age', age ? `${age} years` : '')}{summaryRow('Height', heightCm ? `${Number(heightCm).toFixed(1)} ${units === 'metric' ? 'cm' : 'in'}` : '')}{summaryRow('Weight', weightKg ? `${Number(weightKg).toFixed(1)} ${units === 'metric' ? 'kg' : 'lb'}` : '')}</section>
        <section className="wizard-review-section"><div><h2>Fitness goals</h2><button type="button" onClick={() => setStep(1)}>Edit</button></div>{summaryRow('Goals', goalList.join(', '))}{summaryRow('Experience', experience)}</section>
        <section className="wizard-review-section"><div><h2>Workout preferences</h2><button type="button" onClick={() => setStep(2)}>Edit</button></div>{summaryRow('Equipment', equipment.join(', '))}{summaryRow('Days', preferredDays.map((day) => weekDays[day]).join(', '))}{summaryRow('Duration / intensity', `${minutes} min · ${intensity}`)}</section>
        <section className="wizard-review-section"><div><h2>Nutrition preferences</h2><button type="button" onClick={() => setStep(3)}>Edit</button></div>{summaryRow('Diet', [...diet.filter((item) => item !== 'Other'), ...(diet.includes('Other') ? splitList(otherDiet) : [])].join(', '))}{summaryRow('Allergies', splitList(allergiesText).join(', '))}{summaryRow('Restrictions', splitList(restrictionsText).join(', '))}</section>
        <div className="energy-estimate"><span>OPTIONAL RESTING-ENERGY ESTIMATE</span><strong>{restingEnergy ? `~${restingEnergy.toLocaleString()} kcal/day` : 'Not available from these details'}</strong><small>{restingEnergy ? 'A formula-based estimate, not total daily needs, a food target, or medical advice.' : 'Add age, height, weight, and choose a calculation option. Estimates are limited to ages 19–78.'}</small></div>
      </div>}
    </div>
    {error && <div className="form-message error" role="alert">{error}</div>}{saved && <div className="form-message success" role="status"><Check size={16} /> Profile saved.</div>}
    <div className="wizard-actions">{step > 0 ? <button className="button button-quiet" type="button" onClick={() => { setError(''); setStep((current) => current - 1) }}><ArrowLeft size={16} /> Back</button> : <span />}{step < steps.length - 1 ? <button className="button button-primary" type="button" onClick={moveNext}>Continue <ArrowRight size={16} /></button> : <button className="button button-primary auth-submit" type="button" disabled={busy} onClick={() => void submit()} aria-busy={busy}>{busy ? <><span className="auth-spinner" /> Saving…</> : onboarding ? 'Save and finish' : 'Save profile'}</button>}</div>
    <button className="wizard-signout" type="button" onClick={() => void signOut()}><LogOut size={15} /> Sign out</button>
    <p className="wizard-footnote">Your profile stays private. FitQuest is not a medical service.</p>
  </section></main>
}
