import { useEffect, useState } from 'react'
import { useAuth } from './auth/AuthContext'
import { ProfileForm } from './components/ProfileForm'
import { apiRequest } from './lib/api'
import {
  Activity, Apple, ArrowRight, ArrowUpRight, Bell, CalendarDays,
  Check, ChevronDown, CircleHelp, Clock3, Dumbbell, Flame, Footprints, Heart,
  LayoutDashboard, Menu, Moon, MoreHorizontal, Plus,
  Search, Settings, ShieldCheck, Sparkles, Sun, Target, Trophy, Users, X,
} from 'lucide-react'

type View = 'Overview' | 'Workouts' | 'Nutrition' | 'Progress' | 'Community' | 'Settings'
type Session = { name: string; detail: string; duration: string; done: boolean }
type WorkoutRecord = { _id: string; title: string; date: string; durationMinutes: number; notes: string; exercises: { name: string; sets: number; reps: number; weightKg: number | null }[] }

const navItems: { label: View; icon: typeof LayoutDashboard }[] = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Workouts', icon: Dumbbell },
  { label: 'Nutrition', icon: Apple },
  { label: 'Progress', icon: Activity },
  { label: 'Community', icon: Users },
]

const initialSessions: Session[] = [
  { name: 'Full body strength', detail: 'Upper + lower · 6 exercises', duration: '45 min', done: false },
  { name: 'Morning mobility', detail: 'Recovery · 8 movements', duration: '15 min', done: true },
  { name: 'Easy run', detail: 'Zone 2 · 4.2 km', duration: '28 min', done: true },
]

function App() {
  const { user, signOut } = useAuth()
  const [view, setView] = useState<View>('Overview')
  const [sessions, setSessions] = useState(initialSessions)
  const [modal, setModal] = useState<'workout' | 'meal' | null>(null)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [light, setLight] = useState(false)
  const [notice, setNotice] = useState('')
  const [workoutName, setWorkoutName] = useState('')
  const [mealName, setMealName] = useState('')
  const [workouts, setWorkouts] = useState<WorkoutRecord[]>([])
  const [workoutLoadError, setWorkoutLoadError] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(30)
  const [exerciseName, setExerciseName] = useState('')
  const [exerciseSets, setExerciseSets] = useState(3)
  const [exerciseReps, setExerciseReps] = useState(10)

  const loadWorkouts = async () => {
    try {
      const result = await apiRequest<{ workouts: WorkoutRecord[] }>('/api/v1/workouts')
      setWorkouts(result.workouts); setWorkoutLoadError('')
    } catch (cause) { setWorkoutLoadError(cause instanceof Error ? cause.message : 'Could not load workouts.') }
  }
  useEffect(() => { void loadWorkouts() }, [])

  const toast = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2600)
  }

  const addWorkout = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!workoutName.trim()) return
    try {
      const result = await apiRequest<{ workout: WorkoutRecord }>('/api/v1/workouts', { method: 'POST', body: JSON.stringify({ title: workoutName.trim(), date: new Date().toISOString(), durationMinutes, notes: '', exercises: exerciseName.trim() ? [{ name: exerciseName.trim(), sets: exerciseSets, reps: exerciseReps, weightKg: null }] : [] }) })
      setWorkouts((items) => [result.workout, ...items])
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : 'Could not save workout')
      return
    }
    setSessions((items) => [{ name: workoutName.trim(), detail: 'Just added · Manual log', duration: '— min', done: true }, ...items])
    setWorkoutName('')
    setExerciseName('')
    setModal(null)
    toast('Workout saved to your account')
  }

  const addMeal = (event: React.FormEvent) => {
    event.preventDefault()
    if (!mealName.trim()) return
    setMealName('')
    setModal(null)
    toast('Meal added to today’s diary')
  }

  const toggleSession = (name: string) => setSessions((items) => items.map((item) => item.name === name ? { ...item, done: !item.done } : item))

  return (
    <div className={light ? 'app light' : 'app'}>
      <aside className={`sidebar ${mobileMenu ? 'open' : ''}`}>
        <a className="brand" href="#home" onClick={() => setView('Overview')}>
          <span className="brand-mark"><Activity size={20} strokeWidth={2.7} /></span>
          <span>fit<span className="brand-accent">quest</span></span>
        </a>
        <div className="workspace-label">YOUR SPACE</div>
        <nav className="primary-nav" aria-label="Main navigation">
          {navItems.map(({ label, icon: Icon }) => <button key={label} className={`nav-item ${view === label ? 'active' : ''}`} onClick={() => { setView(label); setMobileMenu(false) }}><Icon size={18} /><span>{label}</span>{label === 'Community' && <span className="nav-pill">3</span>}</button>)}
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-quest">
          <div className="quest-top"><span className="quest-icon"><Trophy size={17} /></span><span>WEEKLY QUEST</span><MoreHorizontal size={18} /></div>
          <strong>Move 5 days</strong>
          <div className="quest-progress"><span /></div>
          <div className="quest-caption"><span>3 of 5 days</span><span>2 days left</span></div>
        </div>
        <button className={`nav-item settings-link ${view === 'Settings' ? 'active' : ''}`} onClick={() => { setView('Settings'); setMobileMenu(false) }}><Settings size={18} /><span>Settings</span></button>
        <div className="profile-mini"><div className="avatar">{user?.displayName.slice(0, 1).toUpperCase()}</div><div className="profile-copy"><strong>{user?.displayName}</strong><span>{user?.email}</span></div><button className="profile-signout" onClick={() => void signOut()} aria-label="Sign out">Sign out</button></div>
      </aside>

      <main className="main-shell">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Open menu" onClick={() => setMobileMenu(!mobileMenu)}><Menu size={20} /></button>
          <div className="breadcrumbs"><span>My space</span><span className="crumb-slash">/</span><strong>{view}</strong></div>
          <div className="top-actions"><div className="date-chip"><CalendarDays size={16} /><span>Tuesday, Oct 22</span></div><button className="icon-button theme-toggle" aria-label="Toggle color theme" onClick={() => setLight(!light)}>{light ? <Moon size={18} /> : <Sun size={18} />}</button><button className="icon-button notification-button" aria-label="Notifications" onClick={() => toast('You’re all caught up')}><Bell size={18} /><i /></button><div className="top-avatar">A</div></div>
        </header>

        {view === 'Settings' ? <ProfileForm /> : view === 'Overview' ? <>
          <div className="preview-notice"><ShieldCheck size={15} /><span><strong>Preview data</strong> — dashboard figures and activity are examples and are not saved to an account yet.</span></div>
          <section className="welcome-row">
            <div><div className="eyebrow"><span className="eyebrow-line" /> TUESDAY, OCTOBER 22, 2026</div><h1>Good morning, Alex <span className="wave">✳</span></h1><p className="welcome-subtitle">A little progress each day adds up to big results.</p></div>
            <button className="button button-primary" onClick={() => setModal('workout')}><Plus size={17} /> Log a workout</button>
          </section>

          <section className="stats-grid" aria-label="Weekly fitness summary">
            <StatCard icon={<Flame size={18} />} label="ACTIVE STREAK" value="12" unit="days" change="+3 days" note="from last week" accent="orange" />
            <StatCard icon={<Dumbbell size={18} />} label="WORKOUTS" value="4" unit="/ 5" change="On track" note="weekly goal" accent="lime" />
            <StatCard icon={<Footprints size={18} />} label="ACTIVE MINUTES" value="186" unit="min" change="+24%" note="from last week" accent="blue" />
            <StatCard icon={<Heart size={18} />} label="QUEST POINTS" value="840" unit="pts" change="Top 18%" note="in your circle" accent="pink" />
          </section>

          <section className="content-grid">
            <div className="panel activity-panel">
              <div className="panel-heading"><div><div className="section-kicker">YOUR MOMENTUM</div><h2>Activity this week</h2></div><button className="select-button" onClick={() => toast('Showing the last 7 days')}>This week <ChevronDown size={15} /></button></div>
              <div className="chart-summary"><strong>3h 26m</strong><span className="trend"><ArrowUpRight size={15} /> 18.4%</span><span className="muted">vs. last week</span></div>
              <ActivityChart />
              <div className="chart-legend"><span><i className="legend-dot current" /> This week</span><span><i className="legend-dot previous" /> Last week</span><span className="chart-total">Goal <b>5h</b></span></div>
            </div>
            <div className="panel coach-panel">
              <div className="coach-orb"><Sparkles size={19} /></div><div className="coach-label">FITQUEST COACH <span className="online-dot" /></div><h2>You’re building<br />real momentum.</h2><p>You’ve moved 4 days in a row. A lighter session today will help you keep the streak and recover well.</p><div className="coach-recommendation"><div className="recommendation-icon"><Heart size={17} /></div><div><strong>Try a recovery flow</strong><span>12 min · Low intensity</span></div><ArrowRight size={17} /></div><button className="coach-link" onClick={() => toast('Coach chat will be available when AI is connected')}>Chat with your coach <ArrowRight size={15} /></button>
            </div>
          </section>

          <section className="bottom-grid">
            <div className="panel schedule-panel">
              <div className="panel-heading"><div><div className="section-kicker">KEEP YOUR RHYTHM</div><h2>Today’s plan</h2></div><button className="text-button" onClick={() => setView('Workouts')}>View plan <ArrowRight size={15} /></button></div>
              <div className="session-list">{sessions.slice(0, 3).map((session, index) => <button key={`${session.name}-${index}`} className={`session-row ${session.done ? 'completed' : ''}`} onClick={() => toggleSession(session.name)}><span className={`session-check ${session.done ? 'checked' : ''}`}>{session.done && <Check size={13} />}</span><span className="session-copy"><strong>{session.name}</strong><span>{session.detail}</span></span><span className="session-time"><Clock3 size={14} /> {session.duration}</span><ArrowRight className="session-arrow" size={15} /></button>)}</div>
              <button className="add-session" onClick={() => setModal('workout')}><Plus size={16} /> Add activity</button>
            </div>
            <div className="panel nutrition-panel">
              <div className="panel-heading"><div><div className="section-kicker">FUEL YOUR DAY</div><h2>Nutrition</h2></div><button className="icon-button small-more" aria-label="More nutrition options" onClick={() => setView('Nutrition')}><MoreHorizontal size={19} /></button></div>
              <div className="nutrition-overview"><div className="calorie-ring"><div><strong>1,240</strong><span>kcal left</span></div></div><div className="calorie-copy"><span>1,360 <small>eaten</small></span><span>2,600 <small>goal</small></span></div></div>
              <div className="macro-list"><Macro label="Protein" value="82" goal="140" color="lime" /><Macro label="Carbs" value="126" goal="280" color="orange" /><Macro label="Fat" value="48" goal="85" color="blue" /></div>
              <button className="add-meal" onClick={() => setModal('meal')}><Plus size={15} /> Log a meal</button>
            </div>
          </section>

          <section className="bottom-grid extra-grid">
            <div className="panel habit-panel"><div className="panel-heading"><div><div className="section-kicker">SMALL WINS, BIG DAYS</div><h2>Daily habits</h2></div><span className="habit-count">2 / 3 done</span></div><div className="habit-list"><Habit icon={<Footprints size={17} />} label="8,000 steps" progress="6,420 / 8,000" percent={80} /><Habit icon={<Apple size={17} />} label="Eat 5 servings of plants" progress="3 / 5 servings" percent={60} /><Habit icon={<Moon size={17} />} label="Get 8 hours of sleep" progress="Last night · 7h 42m" percent={96} /></div></div>
            <div className="panel challenge-panel"><div className="challenge-art"><div className="challenge-sun" /><div className="challenge-mountain mountain-back" /><div className="challenge-mountain mountain-front" /><span className="challenge-badge"><Trophy size={14} /> WEEK 3</span></div><div className="challenge-info"><div><div className="section-kicker">COMMUNITY QUEST</div><h2>Autumn miles</h2></div><span className="challenge-people"><Users size={14} /> 24</span></div><div className="challenge-progress-row"><span>You’re <b>6.4 km</b> into the quest</span><span>12 km</span></div><div className="challenge-track"><i /></div><button className="challenge-link" onClick={() => setView('Community')}>See your challenge <ArrowRight size={15} /></button></div>
          </section>

          <footer className="footer"><span>© 2026 FitQuest</span><span><ShieldCheck size={14} /> Your health data stays yours</span><button onClick={() => toast('Help center is coming soon')}><CircleHelp size={14} /> Help & feedback</button></footer>
        </> : view === 'Workouts' ? <WorkoutsView workouts={workouts} error={workoutLoadError} onRetry={() => void loadWorkouts()} onDelete={async (id) => { try { await apiRequest<void>(`/api/v1/workouts/${id}`, { method: 'DELETE' }); setWorkouts((items) => items.filter((item) => item._id !== id)); toast('Workout deleted') } catch (cause) { toast(cause instanceof Error ? cause.message : 'Could not delete workout') } }} onLog={() => setModal('workout')} /> : <SectionView view={view} onLog={() => setModal(view === 'Nutrition' ? 'meal' : 'workout')} onToast={toast} />}
      </main>
      {mobileMenu && <button className="sidebar-scrim" aria-label="Close menu" onClick={() => setMobileMenu(false)} />}
      {notice && <div className="toast"><Check size={16} /> {notice}</div>}
      {modal && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null) }}><form className="modal" onSubmit={modal === 'workout' ? (event) => void addWorkout(event) : addMeal}><button className="modal-close" type="button" aria-label="Close" onClick={() => setModal(null)}><X size={19} /></button><span className="modal-icon">{modal === 'workout' ? <Dumbbell size={19} /> : <Apple size={19} />}</span><div className="section-kicker">ADD TO YOUR JOURNEY</div><h2>{modal === 'workout' ? 'Log a workout' : 'Log a meal'}</h2><p>{modal === 'workout' ? 'Record your activity and enter sets and reps manually.' : 'Add a meal to your diary. You can review nutrition details after.'}</p><label htmlFor="entry-name">{modal === 'workout' ? 'Activity name' : 'Meal or food'}</label><input id="entry-name" autoFocus value={modal === 'workout' ? workoutName : mealName} onChange={(event) => modal === 'workout' ? setWorkoutName(event.target.value) : setMealName(event.target.value)} placeholder={modal === 'workout' ? 'e.g. Evening strength session' : 'e.g. Avocado toast'} required />{modal === 'workout' && <><label>Duration (minutes)<input type="number" min={1} max={1440} value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))} /></label><label>Exercise name (optional)<input value={exerciseName} onChange={(event) => setExerciseName(event.target.value)} placeholder="e.g. Goblet squat" /></label>{exerciseName.trim() && <div className="exercise-manual-fields"><label>Sets<input type="number" min={1} max={30} value={exerciseSets} onChange={(event) => setExerciseSets(Number(event.target.value))} /></label><label>Reps per set<input type="number" min={1} max={500} value={exerciseReps} onChange={(event) => setExerciseReps(Number(event.target.value))} /></label></div>}</>}<div className="modal-actions"><button className="button button-quiet" type="button" onClick={() => setModal(null)}>Cancel</button><button className="button button-primary" type="submit"><Plus size={16} /> Save entry</button></div></form></div>}
    </div>
  )
}

function StatCard({ icon, label, value, unit, change, note, accent }: { icon: React.ReactNode; label: string; value: string; unit: string; change: string; note: string; accent: string }) {
  return <div className="stat-card"><div className="stat-top"><span className={`stat-icon ${accent}`}>{icon}</span><span className="stat-label">{label}</span><button className="icon-button stat-more" aria-label={`More about ${label}`}><MoreHorizontal size={18} /></button></div><div className="stat-value">{value}<small>{unit}</small></div><div className="stat-foot"><span className={`stat-change ${accent}`}>{change}</span><span>{note}</span></div></div>
}

function ActivityChart() {
  const bars = [46, 74, 57, 92, 69, 48, 82]
  const old = [32, 52, 68, 48, 55, 33, 57]
  return <div className="chart-area"><div className="chart-y-labels"><span>60</span><span>45</span><span>30</span><span>15</span><span>0</span></div><div className="chart-content"><div className="chart-gridlines"><i /><i /><i /><i /><i /></div><div className="bars">{bars.map((height, i) => <div className="bar-pair" key={i}><span className="bar previous-bar" style={{ height: `${old[i]}%` }} /><span className={`bar current-bar ${i === 3 ? 'highlight-bar' : ''}`} style={{ height: `${height}%` }} /></div>)}</div><div className="chart-x-labels">{['Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue'].map((day) => <span key={day}>{day}</span>)}</div></div></div>
}

function Macro({ label, value, goal, color }: { label: string; value: string; goal: string; color: string }) {
  return <div className="macro-row"><div className="macro-label"><span>{label}</span><span><b>{value}g</b> <small>/ {goal}g</small></span></div><div className="macro-track"><i className={color} style={{ width: `${Math.min(100, Number(value) / Number(goal) * 100)}%` }} /></div></div>
}

function Habit({ icon, label, progress, percent }: { icon: React.ReactNode; label: string; progress: string; percent: number }) {
  return <div className="habit-row"><span className="habit-icon">{icon}</span><div className="habit-copy"><strong>{label}</strong><span>{progress}</span></div><div className="habit-track"><i style={{ width: `${percent}%` }} /></div>{percent >= 100 && <Check className="habit-check" size={15} />}</div>
}

function SectionView({ view, onLog, onToast }: { view: Exclude<View, 'Overview' | 'Settings'>; onLog: () => void; onToast: (message: string) => void }) {
  const copy: Record<Exclude<View, 'Overview' | 'Settings'>, { eyebrow: string; title: string; text: string; icon: typeof Dumbbell; items: string[] }> = {
    Workouts: { eyebrow: 'TRAIN WITH INTENTION', title: 'Your workouts', text: 'Build a routine that fits your life. Log sessions manually and celebrate every rep.', icon: Dumbbell, items: ['Strength foundations', 'Full body strength', 'Mobility & recovery'] },
    Nutrition: { eyebrow: 'FUEL YOUR JOURNEY', title: 'Nutrition diary', text: 'Keep an easy, flexible record of what helps you feel your best.', icon: Apple, items: ['Breakfast · Oats, berries & yogurt', 'Lunch · Grain bowl with tofu', 'Snack · Apple & almond butter'] },
    Progress: { eyebrow: 'NOTICE HOW FAR YOU’VE COME', title: 'Your progress', text: 'Consistency is the real milestone. Your weekly movement is trending up.', icon: Target, items: ['4 workouts this week', '186 active minutes', '12 day movement streak'] },
    Community: { eyebrow: 'BETTER, TOGETHER', title: 'Your community', text: 'Stay connected through friendly quests, encouragement, and shared progress.', icon: Users, items: ['Autumn miles · 24 members', 'Maya completed a 5K quest', 'Your circle sent you 3 kudos'] },
  }
  const item = copy[view]
  const Icon = item.icon
  return <section className="section-page"><div className="eyebrow"><span className="eyebrow-line" /> {item.eyebrow}</div><div className="section-title-row"><div><h1>{item.title}</h1><p className="welcome-subtitle">{item.text}</p></div><button className="button button-primary" onClick={onLog}><Plus size={17} /> {view === 'Nutrition' ? 'Log a meal' : 'Log a workout'}</button></div><div className="section-placeholder-grid"><div className="panel section-feature"><div className="section-feature-icon"><Icon size={23} /></div><div className="section-kicker">YOUR FITQUEST</div><h2>{view === 'Community' ? 'Small steps make a strong team.' : 'Every step counts.'}</h2><p>Your activity is saved in this browser for this preview. Connect your account in a later phase to sync across devices.</p><button className="text-button" onClick={() => onToast('More FitQuest features are being built')}>Explore what’s next <ArrowRight size={15} /></button></div><div className="panel section-list-panel"><div className="panel-heading"><div><div className="section-kicker">RECENT ACTIVITY</div><h2>{view === 'Community' ? 'Community updates' : 'Your week'}</h2></div><Search size={18} className="muted" /></div>{item.items.map((entry, index) => <div className="section-list-row" key={entry}><span className="section-list-number">0{index + 1}</span><strong>{entry}</strong><span className="list-status">{index === 0 ? 'TODAY' : 'THIS WEEK'}</span></div>)}<button className="section-empty-action" onClick={onLog}><Plus size={15} /> Add something new</button></div></div></section>
}

function WorkoutsView({ workouts, error, onRetry, onDelete, onLog }: { workouts: WorkoutRecord[]; error: string; onRetry: () => void; onDelete: (id: string) => void; onLog: () => void }) {
  return <section className="section-page"><div className="eyebrow"><span className="eyebrow-line" /> TRAIN WITH INTENTION</div><div className="section-title-row"><div><h1>Your workouts</h1><p className="welcome-subtitle">Your workouts are saved to your account. Enter sets and reps manually.</p></div><button className="button button-primary" onClick={onLog}><Plus size={17} /> Log a workout</button></div>
    {error ? <div className="panel workout-state"><p>{error}</p><button className="text-button" onClick={onRetry}>Try again <ArrowRight size={15} /></button></div> : workouts.length ? <div className="workout-log-list">{workouts.map((workout) => <article className="panel workout-log-card" key={workout._id}><div className="workout-log-top"><div><div className="section-kicker">{new Date(workout.date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</div><h2>{workout.title}</h2></div><button className="delete-workout" onClick={() => onDelete(workout._id)} aria-label={`Delete ${workout.title}`}>Delete</button></div><p>{workout.durationMinutes} minutes</p>{workout.exercises.length > 0 && <div className="manual-exercise-list">{workout.exercises.map((exercise, index) => <div key={`${exercise.name}-${index}`}><strong>{exercise.name}</strong><span>{exercise.sets} sets × {exercise.reps} reps{exercise.weightKg !== null ? ` · ${exercise.weightKg} kg` : ''}</span></div>)}</div>}{workout.notes && <p>{workout.notes}</p>}</article>)}</div> : <div className="panel workout-state"><div className="section-feature-icon"><Dumbbell size={23} /></div><h2>Your log starts here</h2><p>Record a workout, then add exercises and manually enter each set and rep.</p><button className="button button-primary" onClick={onLog}><Plus size={16} /> Add your first workout</button></div>}
  </section>
}

export default App
