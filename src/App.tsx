import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Activity, Apple, ArrowDownRight, ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronDown, CircleHelp, Clock3, Dumbbell, Flame, Footprints, Heart, LayoutDashboard, Menu, Moon, Plus, Search, Settings, ShieldCheck, Sun, Target, Trophy, Users, X } from 'lucide-react'
import { useAuth } from './auth/AuthContext'
import { ProfileForm } from './components/ProfileForm'
import { apiRequest } from './lib/api'
import { exerciseCatalog, foodCatalog, type FoodItem } from './data/catalog'

type View = 'Overview' | 'Workouts' | 'Nutrition' | 'Progress' | 'Community' | 'Settings'
type Exercise = { name: string; sets: number; reps: number; weightKg: number | null }
type WorkoutRecord = { _id: string; title: string; date: string; durationMinutes: number; notes: string; exercises: Exercise[] }
type MealRecord = { _id: string; foodName: string; mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'; servings: number; servingLabel: string; calories: number; proteinGrams: number; carbsGrams: number; fatGrams: number; date: string }
type Modal = 'workout' | 'meal' | null

const navItems: { label: View; icon: typeof LayoutDashboard }[] = [
  { label: 'Overview', icon: LayoutDashboard }, { label: 'Workouts', icon: Dumbbell }, { label: 'Nutrition', icon: Apple }, { label: 'Progress', icon: Activity }, { label: 'Community', icon: Users },
]

const dayStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
const dateKey = (value: string | Date) => dayStart(new Date(value)).getTime()
const formatNumber = (n: number) => Math.round(n).toLocaleString()
const localDateLabel = (date: Date, options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'short', day: 'numeric' }) => date.toLocaleDateString(undefined, options)

function App() {
  const { user, signOut } = useAuth()
  const [view, setView] = useState<View>('Overview')
  const [modal, setModal] = useState<Modal>(null)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [light, setLight] = useState(false)
  const [notice, setNotice] = useState('')
  const [workouts, setWorkouts] = useState<WorkoutRecord[]>([])
  const [meals, setMeals] = useState<MealRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [rangeDays, setRangeDays] = useState<7 | 30>(7)
  const [workoutTitle, setWorkoutTitle] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(30)
  const [exerciseQuery, setExerciseQuery] = useState('')
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [mealType, setMealType] = useState<MealRecord['mealType']>('Breakfast')
  const [foodQuery, setFoodQuery] = useState('')
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null)
  const [servings, setServings] = useState(1)

  const loadData = async () => {
    setLoading(true)
    try {
      const [workoutResult, mealResult] = await Promise.all([
        apiRequest<{ workouts: WorkoutRecord[] }>('/api/v1/workouts'),
        apiRequest<{ meals: MealRecord[] }>('/api/v1/meals'),
      ])
      setWorkouts(workoutResult.workouts)
      setMeals(mealResult.meals)
      setLoadError('')
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : 'Your activity could not be loaded.')
    } finally { setLoading(false) }
  }
  useEffect(() => { void loadData() }, [user?.id])

  const toast = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 2800) }
  const today = dayStart(new Date())
  const todayWorkouts = workouts.filter((item) => dateKey(item.date) === today.getTime())
  const todayMeals = meals.filter((item) => dateKey(item.date) === today.getTime())
  const weekStart = new Date(today); weekStart.setDate(weekStart.getDate() - 6)
  const previousStart = new Date(today); previousStart.setDate(previousStart.getDate() - 13)
  const previousEnd = new Date(today); previousEnd.setDate(previousEnd.getDate() - 7)
  const weekWorkouts = workouts.filter((item) => new Date(item.date) >= weekStart)
  const previousWorkouts = workouts.filter((item) => new Date(item.date) >= previousStart && new Date(item.date) < previousEnd)
  const todayNutrition = todayMeals.reduce((sum, item) => ({ calories: sum.calories + item.calories, protein: sum.protein + item.proteinGrams, carbs: sum.carbs + item.carbsGrams, fat: sum.fat + item.fatGrams }), { calories: 0, protein: 0, carbs: 0, fat: 0 })
  const weeklyMinutes = weekWorkouts.reduce((sum, item) => sum + item.durationMinutes, 0)
  const previousMinutes = previousWorkouts.reduce((sum, item) => sum + item.durationMinutes, 0)
  const trend = previousMinutes ? Math.round(((weeklyMinutes - previousMinutes) / previousMinutes) * 100) : null
  const workoutDays = new Set(workouts.map((item) => dateKey(item.date)))
  let streak = 0
  const latestStreakDay = workoutDays.has(today.getTime()) ? today.getTime() : today.getTime() - 86_400_000
  for (let cursor = latestStreakDay; workoutDays.has(cursor); cursor -= 86_400_000) streak += 1

  const addWorkout = async (event: FormEvent) => {
    event.preventDefault()
    if (!workoutTitle.trim()) return
    try {
      const result = await apiRequest<{ workout: WorkoutRecord }>('/api/v1/workouts', { method: 'POST', body: JSON.stringify({ title: workoutTitle.trim(), date: new Date().toISOString(), durationMinutes, notes: '', exercises }) })
      setWorkouts((items) => [result.workout, ...items])
      setWorkoutTitle(''); setDurationMinutes(30); setExercises([]); setExerciseQuery(''); setModal(null)
      toast('Workout saved. Your charts are up to date.')
    } catch (cause) { toast(cause instanceof Error ? cause.message : 'Could not save workout.') }
  }

  const addMeal = async (event: FormEvent) => {
    event.preventDefault()
    if (!selectedFood) { toast('Choose a food from the list first.'); return }
    try {
      const result = await apiRequest<{ meal: MealRecord }>('/api/v1/meals', { method: 'POST', body: JSON.stringify({ foodName: selectedFood.name, mealType, servings, servingLabel: selectedFood.serving, calories: selectedFood.calories * servings, proteinGrams: selectedFood.proteinGrams * servings, carbsGrams: selectedFood.carbsGrams * servings, fatGrams: selectedFood.fatGrams * servings, date: new Date().toISOString() }) })
      setMeals((items) => [result.meal, ...items])
      setSelectedFood(null); setFoodQuery(''); setServings(1); setModal(null)
      toast('Meal saved. Your nutrition chart is up to date.')
    } catch (cause) { toast(cause instanceof Error ? cause.message : 'Could not save meal.') }
  }

  const deleteWorkout = async (id: string) => {
    try { await apiRequest<void>(`/api/v1/workouts/${id}`, { method: 'DELETE' }); setWorkouts((items) => items.filter((item) => item._id !== id)); toast('Workout removed and progress recalculated.') }
    catch (cause) { toast(cause instanceof Error ? cause.message : 'Could not delete workout.') }
  }
  const deleteMeal = async (id: string) => {
    try { await apiRequest<void>(`/api/v1/meals/${id}`, { method: 'DELETE' }); setMeals((items) => items.filter((item) => item._id !== id)); toast('Meal removed and nutrition recalculated.') }
    catch (cause) { toast(cause instanceof Error ? cause.message : 'Could not delete meal.') }
  }
  const addExercise = (name: string) => {
    if (!name) return
    setExercises((items) => [...items, { name, sets: 3, reps: 10, weightKg: null }])
    setExerciseQuery('')
  }

  return <div className={light ? 'app light' : 'app'}>
    <aside className={`sidebar ${mobileMenu ? 'open' : ''}`}>
      <a className="brand" href="#home" onClick={() => setView('Overview')}><span className="brand-mark"><Activity size={20} strokeWidth={2.7} /></span><span>fit<span className="brand-accent">quest</span></span></a>
      <div className="workspace-label">YOUR SPACE</div>
      <nav className="primary-nav" aria-label="Main navigation">{navItems.map(({ label, icon: Icon }) => <button key={label} className={`nav-item ${view === label ? 'active' : ''}`} onClick={() => { setView(label); setMobileMenu(false) }}><Icon size={18} /><span>{label}</span></button>)}</nav>
      <div className="sidebar-spacer" />
      <div className="sidebar-quest"><div className="quest-top"><span className="quest-icon"><Trophy size={17} /></span><span>YOUR STREAK</span></div><strong>{streak} {streak === 1 ? 'day' : 'days'} active</strong><div className="quest-progress"><span style={{ width: `${Math.min(100, streak / 5 * 100)}%` }} /></div><div className="quest-caption"><span>{streak} days</span><span>personal best</span></div></div>
      <button className={`nav-item settings-link ${view === 'Settings' ? 'active' : ''}`} onClick={() => setView('Settings')}><Settings size={18} /><span>Settings</span></button>
      <div className="profile-mini"><div className="avatar">{user?.displayName.slice(0, 1).toUpperCase()}</div><div className="profile-copy"><strong>{user?.displayName}</strong><span>{user?.email}</span></div><button className="profile-signout" onClick={() => void signOut()} aria-label="Sign out">Sign out</button></div>
    </aside>

    <main className="main-shell">
      <header className="topbar"><button className="icon-button mobile-menu" aria-label="Open menu" onClick={() => setMobileMenu(!mobileMenu)}><Menu size={20} /></button><div className="breadcrumbs"><span>My space</span><span className="crumb-slash">/</span><strong>{view}</strong></div><div className="top-actions"><div className="date-chip"><CalendarDays size={16} /><span>{localDateLabel(new Date())}</span></div><button className="icon-button theme-toggle" aria-label="Toggle color theme" onClick={() => setLight(!light)}>{light ? <Moon size={18} /> : <Sun size={18} />}</button><div className="top-avatar">{user?.displayName.slice(0, 1).toUpperCase()}</div></div></header>
      {loadError && <div className="data-error" role="alert"><ShieldCheck size={16} /><span>{loadError}</span><button onClick={() => void loadData()}>Retry</button></div>}
      {view === 'Settings' ? <ProfileForm /> : view === 'Overview' ? <>
        <section className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line" /> {localDateLabel(new Date(), { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()}</div><h1>Welcome, {user?.displayName.split(' ')[0]} <span className="wave">✳</span></h1><p className="welcome-subtitle">Your progress starts with what you choose to log today.</p></div><button className="button button-primary" onClick={() => setModal('workout')}><Plus size={17} /> Log a workout</button></section>
        <section className="stats-grid" aria-label="Your weekly activity"><StatCard icon={<Flame size={18} />} label="ACTIVE STREAK" value={streak} unit={streak === 1 ? 'day' : 'days'} note="consecutive workout days" accent="orange" /><StatCard icon={<Dumbbell size={18} />} label="WORKOUTS" value={weekWorkouts.length} unit="this week" note="your activity log" accent="lime" /><StatCard icon={<Footprints size={18} />} label="ACTIVE MINUTES" value={weeklyMinutes} unit="min" note="this week" accent="blue" /><StatCard icon={<Heart size={18} />} label="TODAY'S MEALS" value={todayMeals.length} unit={todayMeals.length === 1 ? 'entry' : 'entries'} note={`${formatNumber(todayNutrition.calories)} estimated kcal`} accent="pink" /></section>
        <section className="content-grid"><div className="panel activity-panel"><div className="panel-heading"><div><div className="section-kicker">YOUR MOMENTUM</div><h2>Activity over time</h2></div><label className="select-wrap"><span className="sr-only">Activity chart range</span><select className="select-button" value={rangeDays} onChange={(event) => setRangeDays(Number(event.target.value) as 7 | 30)}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option></select><ChevronDown size={14} /></label></div><div className="chart-summary"><strong>{formatDuration(weeklyMinutes)}</strong>{trend !== null && <span className={`trend ${trend < 0 ? 'trend-down' : ''}`}>{trend < 0 ? <ArrowDownRight size={15} /> : <ArrowUpRight size={15} />} {Math.abs(trend)}%</span>}<span className="muted">{trend === null ? 'logged this week' : 'vs previous week'}</span></div><ActivityChart workouts={workouts} days={rangeDays} /><div className="chart-legend"><span><i className="legend-dot current" /> Your activity</span><span className="chart-total">{weekWorkouts.length} sessions this week</span></div></div>
          <div className="panel nutrition-panel nutrition-card"><div className="panel-heading"><div><div className="section-kicker">FUEL YOUR DAY</div><h2>Today’s nutrition</h2></div><button className="text-button" onClick={() => setView('Nutrition')}>Details <ArrowRight size={14} /></button></div><MacroDonut nutrition={todayNutrition} /><div className="macro-list"><Macro label="Protein" value={todayNutrition.protein} goal={140} color="lime" /><Macro label="Carbs" value={todayNutrition.carbs} goal={280} color="orange" /><Macro label="Fat" value={todayNutrition.fat} goal={85} color="blue" /></div><button className="add-meal" onClick={() => setModal('meal')}><Plus size={15} /> Log a meal</button></div>
        </section>
        <section className="bottom-grid"><div className="panel schedule-panel"><div className="panel-heading"><div><div className="section-kicker">YOUR RECORD</div><h2>Today’s workouts</h2></div><button className="text-button" onClick={() => setView('Workouts')}>All workouts <ArrowRight size={15} /></button></div>{loading ? <div className="empty-inline">Loading your activity…</div> : todayWorkouts.length ? <div className="session-list">{todayWorkouts.slice(0, 4).map((item) => <div className="session-row" key={item._id}><span className="session-check checked"><Check size={13} /></span><span className="session-copy"><strong>{item.title}</strong><span>{item.exercises.length} exercises logged</span></span><span className="session-time"><Clock3 size={14} /> {item.durationMinutes} min</span><button className="row-delete" onClick={() => void deleteWorkout(item._id)} aria-label={`Delete ${item.title}`}><X size={15} /></button></div>)}</div> : <EmptyInline icon={<Dumbbell size={17} />} title="No workouts logged today" text="Your dashboard will update as soon as you add one." />}<button className="add-session" onClick={() => setModal('workout')}><Plus size={16} /> Add workout</button></div>
          <div className="panel schedule-panel"><div className="panel-heading"><div><div className="section-kicker">YOUR FOOD DIARY</div><h2>Today’s meals</h2></div><button className="text-button" onClick={() => setView('Nutrition')}>Open diary <ArrowRight size={15} /></button></div>{loading ? <div className="empty-inline">Loading your diary…</div> : todayMeals.length ? <div className="session-list">{todayMeals.slice(0, 4).map((item) => <div className="session-row" key={item._id}><span className="meal-dot"><Apple size={14} /></span><span className="session-copy"><strong>{item.foodName}</strong><span>{item.mealType} · {item.servings} × {item.servingLabel}</span></span><span className="session-time">{formatNumber(item.calories)} kcal</span><button className="row-delete" onClick={() => void deleteMeal(item._id)} aria-label={`Delete ${item.foodName}`}><X size={15} /></button></div>)}</div> : <EmptyInline icon={<Apple size={17} />} title="No meals logged today" text="Add a food to see your calories and macros here." />}<button className="add-session" onClick={() => setModal('meal')}><Plus size={16} /> Add meal</button></div>
        </section>
        <footer className="footer"><span>© {new Date().getFullYear()} FitQuest</span><span><ShieldCheck size={14} /> Your health data stays yours</span><button onClick={() => toast('Support options are not configured yet.')}><CircleHelp size={14} /> Help & feedback</button></footer>
      </> : view === 'Workouts' ? <WorkoutsView workouts={workouts} loading={loading} onLog={() => setModal('workout')} onDelete={(id) => void deleteWorkout(id)} /> : view === 'Nutrition' ? <NutritionView meals={meals} loading={loading} totals={todayNutrition} onLog={() => setModal('meal')} onDelete={(id) => void deleteMeal(id)} /> : view === 'Progress' ? <ProgressView workouts={workouts} meals={meals} /> : <EmptyPage onBack={() => setView('Overview')} />}
    </main>
    {mobileMenu && <button className="sidebar-scrim" aria-label="Close menu" onClick={() => setMobileMenu(false)} />}
    {notice && <div className="toast" role="status"><Check size={16} /> {notice}</div>}
    {modal && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null) }}><form className="modal entry-modal" onSubmit={modal === 'workout' ? addWorkout : addMeal}><button className="modal-close" type="button" aria-label="Close" onClick={() => setModal(null)}><X size={19} /></button><span className="modal-icon">{modal === 'workout' ? <Dumbbell size={19} /> : <Apple size={19} />}</span><div className="section-kicker">ADD TO YOUR JOURNEY</div><h2>{modal === 'workout' ? 'Log a workout' : 'Log a meal'}</h2><p>{modal === 'workout' ? 'Choose exercises and record your sets and reps. No automatic rep counting.' : 'Choose a food and serving. Nutrition values are estimates per listed serving.'}</p>
      {modal === 'workout' ? <><label htmlFor="workout-title">Workout name</label><input id="workout-title" value={workoutTitle} onChange={(event) => setWorkoutTitle(event.target.value)} placeholder="e.g. Upper body strength" maxLength={100} required /><label htmlFor="duration">Duration (minutes)</label><input id="duration" type="number" min={1} max={1440} value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))} required /><label htmlFor="exercise-search">Add an exercise</label><div className="catalog-search"><Search size={16} /><input id="exercise-search" value={exerciseQuery} onChange={(event) => setExerciseQuery(event.target.value)} placeholder="Search exercise names" autoComplete="off" /></div><div className="catalog-results">{exerciseCatalog.filter((name) => name.toLowerCase().includes(exerciseQuery.toLowerCase())).slice(0, 8).map((name) => <button type="button" key={name} onClick={() => addExercise(name)}>{name}<Plus size={14} /></button>)}{exerciseQuery.trim().length > 1 && !exerciseCatalog.some((name) => name.toLowerCase() === exerciseQuery.trim().toLowerCase()) && <button type="button" onClick={() => addExercise(exerciseQuery.trim())}>Add “{exerciseQuery.trim()}” as a custom exercise<Plus size={14} /></button>}</div>{exercises.length > 0 && <div className="chosen-exercises"><div className="section-kicker">EXERCISES · SETS AND REPS ARE MANUAL</div>{exercises.map((exercise, index) => <div className="exercise-entry" key={`${exercise.name}-${index}`}><strong>{exercise.name}</strong><label>Sets<input type="number" min={1} max={30} value={exercise.sets} onChange={(event) => setExercises((items) => items.map((item, i) => i === index ? { ...item, sets: Number(event.target.value) } : item))} /></label><label>Reps<input type="number" min={1} max={500} value={exercise.reps} onChange={(event) => setExercises((items) => items.map((item, i) => i === index ? { ...item, reps: Number(event.target.value) } : item))} /></label><label>kg<input type="number" min={0} max={1000} placeholder="—" onChange={(event) => setExercises((items) => items.map((item, i) => i === index ? { ...item, weightKg: event.target.value ? Number(event.target.value) : null } : item))} /></label><button type="button" className="row-delete" aria-label={`Remove ${exercise.name}`} onClick={() => setExercises((items) => items.filter((_, i) => i !== index))}><X size={15} /></button></div>)}</div>}</> : <><label htmlFor="meal-type">Meal</label><select id="meal-type" value={mealType} onChange={(event) => setMealType(event.target.value as MealRecord['mealType'])}><option>Breakfast</option><option>Lunch</option><option>Dinner</option><option>Snack</option></select><label htmlFor="food-search">Choose food</label><div className="catalog-search"><Search size={16} /><input id="food-search" value={foodQuery} onChange={(event) => { setFoodQuery(event.target.value); setSelectedFood(null) }} placeholder="Search foods" autoComplete="off" /></div><div className="food-results">{foodCatalog.filter((food) => `${food.name} ${food.category}`.toLowerCase().includes(foodQuery.toLowerCase())).slice(0, 10).map((food) => <button type="button" key={food.name} className={selectedFood?.name === food.name ? 'selected' : ''} onClick={() => { setSelectedFood(food); setFoodQuery(food.name) }}><span><strong>{food.name}</strong><small>{food.serving} · {food.calories} kcal · {food.category}</small></span><Plus size={14} /></button>)}</div>{selectedFood && <div className="selected-food"><div><strong>{selectedFood.name}</strong><span>{selectedFood.serving} · {selectedFood.calories} kcal · P {selectedFood.proteinGrams}g / C {selectedFood.carbsGrams}g / F {selectedFood.fatGrams}g</span></div><label>Servings<input type="number" min={0.25} max={20} step={0.25} value={servings} onChange={(event) => setServings(Number(event.target.value))} /></label></div>}</>}
      <div className="modal-actions"><button className="button button-quiet" type="button" onClick={() => setModal(null)}>Cancel</button><button className="button button-primary" type="submit"><Plus size={16} /> Save {modal === 'workout' ? 'workout' : 'meal'}</button></div></form></div>}
  </div>
}

function formatDuration(minutes: number) { return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h ${minutes % 60}m` }

function StatCard({ icon, label, value, unit, note, accent }: { icon: ReactNode; label: string; value: number; unit: string; note: string; accent: string }) {
  return <div className="stat-card"><div className="stat-top"><span className={`stat-icon ${accent}`}>{icon}</span><span className="stat-label">{label}</span></div><div className="stat-value">{formatNumber(value)}<small>{unit}</small></div><div className="stat-foot"><span>{note}</span></div></div>
}

function ActivityChart({ workouts, days }: { workouts: WorkoutRecord[]; days: 7 | 30 }) {
  const today = dayStart(new Date())
  const buckets = Array.from({ length: days }, (_, index) => {
    const date = new Date(today); date.setDate(date.getDate() - (days - 1 - index))
    const entries = workouts.filter((item) => dateKey(item.date) === date.getTime())
    return { label: date.toLocaleDateString(undefined, { weekday: days === 7 ? 'short' : undefined, month: days === 30 ? 'numeric' : undefined, day: days === 30 ? 'numeric' : undefined }), minutes: entries.reduce((sum, item) => sum + item.durationMinutes, 0) }
  })
  const max = Math.max(30, ...buckets.map((item) => item.minutes))
  const hasActivity = buckets.some((item) => item.minutes > 0)
  return <div className={`chart-area ${days === 30 ? 'chart-month' : ''}`}><div className="chart-y-labels"><span>{formatNumber(max)}</span><span>{formatNumber(max / 2)}</span><span>0</span></div><div className="chart-content"><div className="chart-gridlines"><i /><i /><i /></div><div className="bars">{buckets.map((item, index) => <div className="bar-pair" key={`${item.label}-${index}`} title={`${item.label}: ${item.minutes} minutes`}><span className={`bar current-bar ${item.minutes ? 'highlight-bar' : 'empty-bar'}`} style={{ height: `${Math.max(item.minutes ? 5 : 1, item.minutes / max * 100)}%` }} /></div>)}</div>{!hasActivity && <div className="chart-empty">Log a workout to start your activity graph.</div>}<div className="chart-x-labels">{buckets.filter((_, index) => days === 7 || index % 5 === 0 || index === days - 1).map((item, index) => <span key={`${item.label}-${index}`}>{item.label}</span>)}</div></div></div>
}

function MacroDonut({ nutrition }: { nutrition: { calories: number; protein: number; carbs: number; fat: number } }) {
  const p = nutrition.protein * 4; const c = nutrition.carbs * 4; const f = nutrition.fat * 9; const total = p + c + f
  const gradient = total ? `conic-gradient(var(--lime) 0 ${p / total * 100}%, var(--orange) ${p / total * 100}% ${(p + c) / total * 100}%, var(--blue) ${(p + c) / total * 100}% 100%)` : 'conic-gradient(var(--line) 0 100%)'
  return <div className="nutrition-overview"><div className="calorie-ring" style={{ background: gradient }}><div><strong>{formatNumber(nutrition.calories)}</strong><span>estimated kcal</span></div></div><div className="calorie-copy"><span>{formatNumber(nutrition.calories)} <small>eaten today</small></span><span>{total ? `${formatNumber(total)} kcal` : 'No food logged'} <small>from macros</small></span></div></div>
}

function Macro({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  return <div className="macro-row"><div className="macro-label"><span>{label}</span><span><b>{formatNumber(value)}g</b> <small>/ {goal}g reference</small></span></div><div className="macro-track"><i className={color} style={{ width: `${Math.min(100, value / goal * 100)}%` }} /></div></div>
}

function EmptyInline({ icon, title, text }: { icon: ReactNode; title: string; text: string }) { return <div className="empty-inline"><span className="section-feature-icon">{icon}</span><strong>{title}</strong><span>{text}</span></div> }

function WorkoutsView({ workouts, loading, onLog, onDelete }: { workouts: WorkoutRecord[]; loading: boolean; onLog: () => void; onDelete: (id: string) => void }) {
  return <section className="section-page"><div className="eyebrow"><span className="eyebrow-line" /> TRAIN WITH INTENTION</div><div className="section-title-row"><div><h1>Your workouts</h1><p className="welcome-subtitle">Your personal training history, saved to your account.</p></div><button className="button button-primary" onClick={onLog}><Plus size={17} /> Log a workout</button></div>{loading ? <div className="panel workout-state">Loading workouts…</div> : workouts.length ? <div className="workout-log-list">{workouts.map((item) => <article className="panel workout-log-card" key={item._id}><div className="workout-log-top"><div><div className="section-kicker">{new Date(item.date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</div><h2>{item.title}</h2></div><button className="delete-workout" onClick={() => onDelete(item._id)}>Delete</button></div><p>{item.durationMinutes} minutes</p>{item.exercises.length > 0 && <div className="manual-exercise-list">{item.exercises.map((exercise, index) => <div key={`${item._id}-${index}`}><strong>{exercise.name}</strong><span>{exercise.sets} sets × {exercise.reps} reps{exercise.weightKg !== null ? ` · ${exercise.weightKg} kg` : ''}</span></div>)}</div>}</article>)}</div> : <div className="panel workout-state"><div className="section-feature-icon"><Dumbbell size={23} /></div><h2>Your log starts at zero</h2><p>No sample workouts are added. Your history will appear here after you record your first session.</p><button className="button button-primary" onClick={onLog}><Plus size={16} /> Add your first workout</button></div>}</section>
}

function NutritionView({ meals, loading, totals, onLog, onDelete }: { meals: MealRecord[]; loading: boolean; totals: { calories: number; protein: number; carbs: number; fat: number }; onLog: () => void; onDelete: (id: string) => void }) {
  const groups = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const
  return <section className="section-page"><div className="eyebrow"><span className="eyebrow-line" /> FUEL YOUR JOURNEY</div><div className="section-title-row"><div><h1>Nutrition diary</h1><p className="welcome-subtitle">Food values are estimates. Your choices and servings control the totals.</p></div><button className="button button-primary" onClick={onLog}><Plus size={17} /> Log a meal</button></div><section className="stats-grid nutrition-stats"><StatCard icon={<Flame size={18} />} label="TODAY'S ENERGY" value={totals.calories} unit="kcal est." note="based on logged foods" accent="orange" /><StatCard icon={<Heart size={18} />} label="PROTEIN" value={totals.protein} unit="g" note="today" accent="lime" /><StatCard icon={<Activity size={18} />} label="CARBOHYDRATES" value={totals.carbs} unit="g" note="today" accent="blue" /><StatCard icon={<Apple size={18} />} label="FAT" value={totals.fat} unit="g" note="today" accent="pink" /></section>{loading ? <div className="panel workout-state">Loading meals…</div> : meals.length ? <div className="meal-groups">{groups.map((group) => { const items = meals.filter((meal) => meal.mealType === group); return <div className="panel meal-group" key={group}><div className="panel-heading"><h2>{group}</h2><span>{formatNumber(items.reduce((sum, item) => sum + item.calories, 0))} kcal est.</span></div>{items.length ? items.map((item) => <div className="meal-log-row" key={item._id}><div className="meal-dot"><Apple size={15} /></div><div className="meal-log-copy"><strong>{item.foodName}</strong><span>{item.servings} × {item.servingLabel} · {localDateLabel(new Date(item.date), { hour: 'numeric', minute: '2-digit' })}</span><small>P {formatNumber(item.proteinGrams)}g · C {formatNumber(item.carbsGrams)}g · F {formatNumber(item.fatGrams)}g</small></div><strong>{formatNumber(item.calories)} kcal</strong><button className="row-delete" onClick={() => onDelete(item._id)} aria-label={`Delete ${item.foodName}`}><X size={15} /></button></div>) : <p className="empty-meal-group">No {group.toLowerCase()} entries yet.</p>}</div>})}</div> : <div className="panel workout-state"><div className="section-feature-icon"><Apple size={23} /></div><h2>Your diary starts at zero</h2><p>No example meals are included. Add foods to build your personal daily log.</p><button className="button button-primary" onClick={onLog}><Plus size={16} /> Add your first meal</button></div>}</section>
}

function ProgressView({ workouts, meals }: { workouts: WorkoutRecord[]; meals: MealRecord[] }) {
  const minutes = workouts.reduce((sum, item) => sum + item.durationMinutes, 0)
  const sessions = workouts.length
  const mealCount = meals.length
  return <section className="section-page"><div className="eyebrow"><span className="eyebrow-line" /> YOUR CONSISTENCY, OVER TIME</div><div className="section-title-row"><div><h1>Progress</h1><p className="welcome-subtitle">Every measure below comes from your saved records.</p></div></div><div className="stats-grid"><StatCard icon={<Dumbbell size={18} />} label="TOTAL WORKOUTS" value={sessions} unit="sessions" note="all time" accent="lime" /><StatCard icon={<Clock3 size={18} />} label="ACTIVE TIME" value={minutes} unit="minutes" note="all time" accent="blue" /><StatCard icon={<Apple size={18} />} label="MEALS LOGGED" value={mealCount} unit="entries" note="all time" accent="orange" /><StatCard icon={<Target size={18} />} label="DAYS ACTIVE" value={new Set(workouts.map((item) => dateKey(item.date))).size} unit="days" note="unique workout days" accent="pink" /></div><div className="panel progress-panel"><h2>Your recent activity</h2><p>Choose Overview to see your activity chart. Log or remove entries and these totals recalculate immediately.</p></div></section>
}

function EmptyPage({ onBack }: { onBack: () => void }) { return <section className="section-page"><div className="eyebrow"><span className="eyebrow-line" /> BETTER, TOGETHER</div><div className="section-title-row"><div><h1>Your community</h1><p className="welcome-subtitle">Community features are not connected yet.</p></div></div><div className="panel workout-state"><div className="section-feature-icon"><Users size={23} /></div><h2>It’s quiet here for now</h2><p>There are no sample people, challenges, or activity in your account.</p><button className="text-button" onClick={onBack}>Back to overview <ArrowRight size={15} /></button></div></section> }

export default App

