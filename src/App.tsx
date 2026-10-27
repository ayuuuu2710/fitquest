import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Activity, Apple, ArrowDownRight, ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronDown, CircleHelp, Clock3, Dumbbell, Flame, Footprints, Heart, LayoutDashboard, Menu, Moon, Plus, Search, Settings, ShieldCheck, Sun, Target, Trophy, X, Droplets, Weight } from 'lucide-react'
import { useAuth } from './auth/AuthContext'
import { ProfileForm } from './components/ProfileForm'
import { apiRequest } from './lib/api'
import { exerciseCatalog } from './data/catalog'
import './nutrition.css'

type View = 'Dashboard' | 'Workouts' | 'Nutrition' | 'Progress' | 'Settings'
type Exercise = { name: string; sets: number; reps: number; weightKg: number | null; weightUnit?: 'kg' | 'lb'; durationSeconds?: number | null }
type ActivityOption = { id: string; name: string; category: string; targetMuscles: string[]; secondaryMuscles: string[]; equipment: string[]; instructions: string; met: number; intensity: string; measurementType: 'duration' | 'duration-distance' | 'duration-speed'; speedKph?: number; sourceCode: string; source: string; sourceUrl: string }
type WorkoutRecord = { _id: string; title: string; date: string; durationMinutes: number; intensity?: 'low' | 'moderate' | 'high' | null; activityId?: string | null; activityName?: string | null; activityCategory?: string | null; activityIntensity?: string | null; activityMeasurementType?: string | null; activityMet?: number | null; activitySourceCode?: string | null; activitySource?: string | null; activitySourceUrl?: string | null; distanceKm?: number | null; speedKph?: number | null; calorieEstimate?: number | null; activeCalorieEstimate?: number | null; calorieCalculationWeightKg?: number | null; calorieFormulaVersion?: string | null; notes: string; exercises: Exercise[] }
type WorkoutTemplate = { _id: string; title: string; durationMinutes: number; intensity?: 'low' | 'moderate' | 'high' | null; activityId?: string | null; distanceKm?: number | null; exercises: Exercise[] }
type NutritionPer100g = { calories: number; proteinGrams: number; carbsGrams: number; fatGrams: number; fiberGrams?: number | null; sugarGrams?: number | null; sodiumMg?: number | null }
type FoodItem = { id: string; name: string; serving: string; servingGrams: number; nutritionPer100g: NutritionPer100g; category: string; source: string; referenceId?: string | null; ingredients?: string[]; cookingMethod?: string }
type MealRecord = { _id: string; foodId?: string; foodName: string; mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'; servings: number; servingLabel: string; quantityGrams?: number | null; nutritionPer100g?: NutritionPer100g; nutritionReferenceId?: string | null; nutritionSource?: string; calories: number; proteinGrams: number; carbsGrams: number; fatGrams: number; fiberGrams?: number | null; sugarGrams?: number | null; sodiumMg?: number | null; date: string }
type MetricRecord = { _id: string; kind: 'water' | 'weight'; value: number; date: string; notes?: string }
type BodyMeasurement = { _id: string; name: string; valueCm: number; date: string; notes?: string }
type DashboardTargets = { calories: number; protein: number; carbs: number; fat: number; water: number | null }
type Modal = 'workout' | 'meal' | 'water' | 'weight' | 'measurement' | 'targets' | 'template' | null

const navItems: { label: View; icon: typeof LayoutDashboard }[] = [
  { label: 'Dashboard', icon: LayoutDashboard }, { label: 'Workouts', icon: Dumbbell }, { label: 'Nutrition', icon: Apple }, { label: 'Progress', icon: Activity },
]
const defaultTargets: DashboardTargets = { calories: 2000, protein: 140, carbs: 250, fat: 70, water: null }
const readTargets = (key: string): DashboardTargets => {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? 'null') as Partial<DashboardTargets> | null
    return { ...defaultTargets, ...(saved ?? {}) }
  } catch { return defaultTargets }
}

const dayStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
const dateKey = (value: string | Date) => dayStart(new Date(value)).getTime()
const formatNumber = (n: number) => Math.round(n).toLocaleString()
const localDateLabel = (date: Date, options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'short', day: 'numeric' }) => date.toLocaleDateString(undefined, options)

function App() {
  const { user, signOut } = useAuth()
  const [view, setView] = useState<View>('Dashboard')
  const [modal, setModal] = useState<Modal>(null)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [light, setLight] = useState(() => {
    const saved = localStorage.getItem('fitquest-theme')
    return saved === 'light' || (saved === 'system' ? window.matchMedia('(prefers-color-scheme: light)').matches : saved === null && user?.profile.theme === 'light')
  })
  const [notice, setNotice] = useState('')
  const [undoAction, setUndoAction] = useState<(() => Promise<void>) | null>(null)
  const noticeTimer = useRef<number | null>(null)
  const [workouts, setWorkouts] = useState<WorkoutRecord[]>([])
  const [activityCatalog, setActivityCatalog] = useState<ActivityOption[]>([])
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([])
  const [meals, setMeals] = useState<MealRecord[]>([])
  const [metricLogs, setMetricLogs] = useState<MetricRecord[]>([])
  const [bodyMeasurements, setBodyMeasurements] = useState<BodyMeasurement[]>([])
  const [foodCatalog, setFoodCatalog] = useState<FoodItem[]>([])
  const [favoriteFoods, setFavoriteFoods] = useState<FoodItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [rangeDays, setRangeDays] = useState<7 | 30>(7)
  const [workoutTitle, setWorkoutTitle] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(30)
  const [selectedActivityId, setSelectedActivityId] = useState('')
  const [activityDistanceKm, setActivityDistanceKm] = useState('')
  const [workoutDate, setWorkoutDate] = useState(new Date().toISOString())
  const [exerciseQuery, setExerciseQuery] = useState('')
  const [exerciseCategory, setExerciseCategory] = useState('All')
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null)
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)
  const [templateMode, setTemplateMode] = useState(false)
  const [mealType, setMealType] = useState<MealRecord['mealType']>('Breakfast')
  const [foodQuery, setFoodQuery] = useState('')
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null)
  const [foodSource, setFoodSource] = useState<'local' | 'usda' | 'packaged'>('local')
  const [remoteFoods, setRemoteFoods] = useState<FoodItem[]>([])
  const [usdaAvailable, setUsdaAvailable] = useState(false)
  const [barcodeMessage, setBarcodeMessage] = useState('')
  const [foodQuantityGrams, setFoodQuantityGrams] = useState(100)
  const [editingMealId, setEditingMealId] = useState<string | null>(null)
  const [canEditMealQuantity, setCanEditMealQuantity] = useState(false)
  const [quickAdd, setQuickAdd] = useState(false)
  const [quickFoodName, setQuickFoodName] = useState('')
  const [quickNutrition, setQuickNutrition] = useState({ calories: 0, proteinGrams: 0, carbsGrams: 0, fatGrams: 0 })
  const [barcode, setBarcode] = useState('')
  const [recipeBuilder, setRecipeBuilder] = useState(false)
  const [recipeName, setRecipeName] = useState('')
  const [recipeCookedWeight, setRecipeCookedWeight] = useState(500)
  const [recipeIngredients, setRecipeIngredients] = useState<Array<{ name: string; grams: number; nutritionPer100g: NutritionPer100g }>>([])
  const [metricAmount, setMetricAmount] = useState(250)
  const [metricDate, setMetricDate] = useState(() => { const now = new Date(); now.setMinutes(now.getMinutes() - now.getTimezoneOffset()); return now.toISOString().slice(0, 16) })
  const [metricNotes, setMetricNotes] = useState('')
  const [editingMetricId, setEditingMetricId] = useState<string | null>(null)
  const [measurementName, setMeasurementName] = useState('Waist')
  const [editingMeasurementId, setEditingMeasurementId] = useState<string | null>(null)
  const [globalQuery, setGlobalQuery] = useState('')
  const [quickActionsOpen, setQuickActionsOpen] = useState(false)
  const [workoutIntensity, setWorkoutIntensity] = useState<'low' | 'moderate' | 'high'>(user?.profile.trainingIntensity ?? 'moderate')
  const targetStorageKey = `fitquest-dashboard-targets-${user?.id ?? 'guest'}`
  const [targets, setTargets] = useState<DashboardTargets>(() => readTargets(targetStorageKey))
  const [targetDraft, setTargetDraft] = useState<DashboardTargets>(targets)

  useEffect(() => {
    if (modal !== 'meal' || foodSource === 'local' || foodQuery.trim().length < 2) { setRemoteFoods([]); return }
    const timer = window.setTimeout(() => {
      void apiRequest<{ foods: FoodItem[] }>(`/api/v1/meals/search?q=${encodeURIComponent(foodQuery.trim())}&source=${foodSource}`).then((data) => setRemoteFoods(data.foods)).catch(() => setRemoteFoods([]))
    }, 600)
    return () => window.clearTimeout(timer)
  }, [modal, foodSource, foodQuery])

  useEffect(() => { localStorage.setItem(targetStorageKey, JSON.stringify(targets)) }, [targetStorageKey, targets])

  const loadData = async () => {
    setLoading(true)
    try {
      const [workoutResult, mealResult, foodResult, metricResult, bodyMeasurementResult, hydrationGoalResult, templateResult, activityResult, favoriteResult] = await Promise.all([
        apiRequest<{ workouts: WorkoutRecord[] }>('/api/v1/workouts'),
        apiRequest<{ meals: MealRecord[] }>('/api/v1/meals'),
        apiRequest<{ foods: FoodItem[]; usdaAvailable: boolean }>('/api/v1/meals/catalog'),
        apiRequest<{ logs: MetricRecord[] }>('/api/v1/metrics'),
        apiRequest<{ measurements: BodyMeasurement[] }>('/api/v1/metrics/measurements'),
        apiRequest<{ goalMl: number | null }>('/api/v1/metrics/hydration-goal'),
        apiRequest<{ templates: WorkoutTemplate[] }>('/api/v1/workout-templates'),
        apiRequest<{ activities: ActivityOption[] }>('/api/v1/workouts/activities'),
        apiRequest<{ favorites: Array<{ _id: string; name: string; category: string; source: string; referenceId?: string | null; serving: string; servingGrams: number; nutritionPer100g: NutritionPer100g }> }>('/api/v1/meals/favorites'),
      ])
      setWorkouts(workoutResult.workouts)
      setActivityCatalog(activityResult.activities)
      setTemplates(templateResult.templates)
      setMeals(mealResult.meals)
      setFoodCatalog(foodResult.foods)
      setUsdaAvailable(foodResult.usdaAvailable)
      setFavoriteFoods(favoriteResult.favorites.map((food) => ({ ...food, id: 'saved:' + food._id })))
      setMetricLogs(metricResult.logs)
      setBodyMeasurements(bodyMeasurementResult.measurements)
      if (hydrationGoalResult.goalMl !== null) setTargets((current) => ({ ...current, water: hydrationGoalResult.goalMl }))
      setLoadError('')
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : 'Your activity could not be loaded.')
    } finally { setLoading(false) }
  }
  useEffect(() => { void loadData() }, [user?.id])

  const toast = (message: string, undo?: () => Promise<void>) => {
    setNotice(message); setUndoAction(undo ?? null)
    if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current)
    noticeTimer.current = window.setTimeout(() => { setNotice(''); setUndoAction(null) }, undo ? 8000 : 2800)
  }
  const today = dayStart(new Date())
  const todayWorkouts = workouts.filter((item) => dateKey(item.date) === today.getTime())
  const todayMeals = meals.filter((item) => dateKey(item.date) === today.getTime())
  const todayWaterMl = metricLogs.filter((item) => item.kind === 'water' && dateKey(item.date) === today.getTime()).reduce((sum, item) => sum + item.value, 0)
  const latestWeightKg = metricLogs.find((item) => item.kind === 'weight')?.value ?? user?.profile.weightKg ?? null
  const selectedActivity = activityCatalog.find((activity) => activity.id === selectedActivityId) ?? null
  const recentFoodItems = [...new Map(meals.map((meal) => [meal.foodName.toLowerCase(), {
    id: 'recent:' + meal._id, name: meal.foodName, category: 'Recent food', serving: meal.servingLabel, servingGrams: 100,
    source: meal.nutritionSource ?? 'user-entered', referenceId: meal.nutritionReferenceId ?? null,
    nutritionPer100g: meal.nutritionPer100g ?? { calories: meal.calories, proteinGrams: meal.proteinGrams, carbsGrams: meal.carbsGrams, fatGrams: meal.fatGrams },
  }])).values()]
  const visibleFoodResults = foodSource === 'local'
    ? [...favoriteFoods, ...recentFoodItems, ...foodCatalog].filter((food) => `${food.name} ${food.category}`.toLowerCase().includes(foodQuery.toLowerCase())).slice(0, 16)
    : remoteFoods
  const activityCaloriesPreview = selectedActivity && latestWeightKg && user?.profile.age && user.profile.age >= 19 && user.profile.age <= 59
    ? Math.round(selectedActivity.met * 3.5 * latestWeightKg / 200 * durationMinutes * 10) / 10
    : null
  const weekStart = new Date(today); weekStart.setDate(weekStart.getDate() - 6)
  const previousStart = new Date(today); previousStart.setDate(previousStart.getDate() - 13)
  const previousEnd = new Date(today); previousEnd.setDate(previousEnd.getDate() - 7)
  const weekWorkouts = workouts.filter((item) => new Date(item.date) >= weekStart)
  const previousWorkouts = workouts.filter((item) => new Date(item.date) >= previousStart && new Date(item.date) < previousEnd)
  const todayNutrition = todayMeals.reduce((sum, item) => ({ calories: sum.calories + item.calories, protein: sum.protein + item.proteinGrams, carbs: sum.carbs + item.carbsGrams, fat: sum.fat + item.fatGrams }), { calories: 0, protein: 0, carbs: 0, fat: 0 })
  const weeklyMinutes = weekWorkouts.reduce((sum, item) => sum + item.durationMinutes, 0)
  const previousMinutes = previousWorkouts.reduce((sum, item) => sum + item.durationMinutes, 0)
  const trend = previousMinutes ? Math.round(((weeklyMinutes - previousMinutes) / previousMinutes) * 100) : null
  const estimatedCaloriesBurned = todayWorkouts.some((workout) => workout.activeCalorieEstimate !== null && workout.activeCalorieEstimate !== undefined)
    ? todayWorkouts.reduce((sum, workout) => sum + (workout.activeCalorieEstimate ?? 0), 0)
    : null
  const remainingCalories = targets.calories - todayNutrition.calories + (estimatedCaloriesBurned ?? 0)
  const workoutDays = new Set(workouts.map((item) => dateKey(item.date)))
  let streak = 0
  const latestStreakDay = workoutDays.has(today.getTime()) ? today.getTime() : today.getTime() - 86_400_000
  for (let cursor = latestStreakDay; workoutDays.has(cursor); cursor -= 86_400_000) streak += 1

  const addWorkout = async (event: FormEvent) => {
    event.preventDefault()
    if (!workoutTitle.trim()) return
    const payload = { title: workoutTitle.trim(), date: editingWorkoutId ? workoutDate : new Date().toISOString(), durationMinutes, intensity: workoutIntensity, activityId: selectedActivityId || null, distanceKm: activityDistanceKm ? Number(activityDistanceKm) : null, notes: '', exercises }
    try {
      if (templateMode) {
        const data = { title: payload.title, durationMinutes, intensity: workoutIntensity, activityId: selectedActivityId || null, distanceKm: activityDistanceKm ? Number(activityDistanceKm) : null, exercises }
        const result = editingTemplateId
          ? await apiRequest<{ template: WorkoutTemplate }>('/api/v1/workout-templates/' + editingTemplateId, { method: 'PATCH', body: JSON.stringify(data) })
          : await apiRequest<{ template: WorkoutTemplate }>('/api/v1/workout-templates', { method: 'POST', body: JSON.stringify(data) })
        setTemplates((items) => editingTemplateId ? items.map((item) => item._id === result.template._id ? result.template : item) : [result.template, ...items])
        setTemplateMode(false); setEditingTemplateId(null); setModal(null)
        toast(editingTemplateId ? 'Template updated.' : 'Workout template saved.')
      } else if (editingWorkoutId) {
        const result = await apiRequest<{ workout: WorkoutRecord }>('/api/v1/workouts/' + editingWorkoutId, { method: 'PATCH', body: JSON.stringify(payload) })
        setWorkouts((items) => items.map((item) => item._id === result.workout._id ? result.workout : item))
        setEditingWorkoutId(null); setModal(null); toast('Workout updated.')
      } else {
        const result = await apiRequest<{ workout: WorkoutRecord }>('/api/v1/workouts', { method: 'POST', body: JSON.stringify(payload) })
        setWorkouts((items) => [result.workout, ...items]); setModal(null); toast('Workout saved. Your charts are up to date.')
      }
      setWorkoutTitle(''); setDurationMinutes(30); setExercises([]); setExerciseQuery(''); setExerciseCategory('All'); setSelectedActivityId(''); setActivityDistanceKm('')
    } catch (cause) { toast(cause instanceof Error ? cause.message : 'Could not save workout.') }
  }

  const addMeal = async (event: FormEvent) => {
    event.preventDefault()
    if (recipeBuilder) {
      if (!recipeName.trim() || recipeIngredients.length === 0) { toast('Name the recipe and add at least one ingredient.'); return }
      try {
        await apiRequest<{ recipe: { _id: string; name: string; category: string; source: string; serving: string; nutritionPer100g: NutritionPer100g } }>('/api/v1/meals/recipes', { method: 'POST', body: JSON.stringify({ name: recipeName.trim(), cookedWeightGrams: recipeCookedWeight, cookingMethod: 'User-defined recipe; nutrient values are estimated from selected ingredient references.', ingredients: recipeIngredients }) })
        await loadData(); setRecipeBuilder(false); setRecipeName(''); setRecipeIngredients([]); setModal(null); toast('Recipe saved. You can now search and log it by cooked weight.')
      } catch (cause) { toast(cause instanceof Error ? cause.message : 'Could not save recipe.') }
      return
    }
    if (editingMealId) {
      try {
        const body = canEditMealQuantity ? { mealType, quantityGrams: foodQuantityGrams } : { mealType }
        const result = await apiRequest<{ meal: MealRecord }>('/api/v1/meals/' + editingMealId, { method: 'PATCH', body: JSON.stringify(body) })
        setMeals((items) => items.map((item) => item._id === result.meal._id ? result.meal : item)); setModal(null); setEditingMealId(null); toast('Meal updated and nutrition recalculated.')
      } catch (cause) { toast(cause instanceof Error ? cause.message : 'Could not update this meal.') }
      return
    }
    const food: FoodItem | null = quickAdd ? {
      id: '', name: quickFoodName.trim(), serving: '100 g', servingGrams: 100, category: 'Custom', source: 'user-entered',
      nutritionPer100g: quickNutrition,
    } : selectedFood
    if (!food) { toast('Choose a food from the list or use Quick Add.'); return }
    try {
      const result = await apiRequest<{ meal: MealRecord }>('/api/v1/meals', { method: 'POST', body: JSON.stringify({ foodId: food.id || undefined, foodName: food.name, source: food.source, referenceId: food.referenceId ?? null, nutritionPer100g: food.nutritionPer100g, quantityGrams: foodQuantityGrams, mealType, date: new Date().toISOString(), servingLabel: food.serving }) })
      setMeals((items) => [result.meal, ...items])
      setSelectedFood(null); setFoodQuery(''); setFoodQuantityGrams(100); setModal(null); setEditingMealId(null); setQuickAdd(false); setQuickFoodName('')
      toast(editingMealId ? 'Meal updated and nutrition recalculated.' : 'Meal saved. Your nutrition chart is up to date.')
    } catch (cause) { toast(cause instanceof Error ? cause.message : 'Could not save meal.') }
  }

  const addMetric = async (event: FormEvent) => {
    event.preventDefault()
    const kind = modal === 'water' ? 'water' : 'weight'
    const value = kind === 'water' ? metricAmount : (user?.profile.units === 'imperial' ? metricAmount / 2.2046226218 : metricAmount)
    if (!Number.isFinite(value) || value <= 0) { toast('Enter an amount greater than zero.'); return }
    try {
      const endpoint = editingMetricId ? `/api/v1/metrics/${editingMetricId}` : '/api/v1/metrics'
      const result = await apiRequest<{ log: MetricRecord }>(endpoint, { method: editingMetricId ? 'PATCH' : 'POST', body: JSON.stringify({ kind, value, date: new Date(metricDate).toISOString(), notes: metricNotes }) })
      setMetricLogs((items) => editingMetricId ? items.map((item) => item._id === result.log._id ? result.log : item).sort((a, b) => +new Date(b.date) - +new Date(a.date)) : [result.log, ...items])
      setModal(null)
      setEditingMetricId(null); setMetricNotes('')
      toast(editingMetricId ? 'Entry updated.' : kind === 'water' ? 'Water intake logged.' : 'Body weight logged.')
    } catch (cause) { toast(cause instanceof Error ? cause.message : 'Could not save this entry.') }
  }

  const quickLogWater = async (amount: number) => {
    try {
      const result = await apiRequest<{ log: MetricRecord }>('/api/v1/metrics', { method: 'POST', body: JSON.stringify({ kind: 'water', value: amount, date: new Date().toISOString() }) })
      setMetricLogs((items) => [result.log, ...items]); setModal(null); toast(`${amount} ml added to today's water log.`)
    } catch (cause) { toast(cause instanceof Error ? cause.message : 'Could not log water.') }
  }

  const editMetric = (item: MetricRecord) => {
    setEditingMetricId(item._id)
    setMetricAmount(item.kind === 'weight' && user?.profile.units === 'imperial' ? Number((item.value * 2.2046226218).toFixed(1)) : item.value)
    const date = new Date(item.date); date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); setMetricDate(date.toISOString().slice(0, 16))
    setMetricNotes(item.notes ?? '')
    setModal(item.kind)
  }

  const saveMeasurement = async (event: FormEvent) => {
    event.preventDefault()
    const valueCm = user?.profile.units === 'imperial' ? metricAmount * 2.54 : metricAmount
    if (!Number.isFinite(valueCm) || valueCm <= 0) { toast('Enter a measurement greater than zero.'); return }
    try {
      const endpoint = editingMeasurementId ? `/api/v1/metrics/measurements/${editingMeasurementId}` : '/api/v1/metrics/measurements'
      const result = await apiRequest<{ measurement: BodyMeasurement }>(endpoint, { method: editingMeasurementId ? 'PATCH' : 'POST', body: JSON.stringify({ name: measurementName, valueCm, date: new Date(metricDate).toISOString(), notes: metricNotes }) })
      setBodyMeasurements((items) => editingMeasurementId ? items.map((item) => item._id === result.measurement._id ? result.measurement : item).sort((a, b) => +new Date(b.date) - +new Date(a.date)) : [result.measurement, ...items])
      setModal(null); setEditingMeasurementId(null); setMetricNotes(''); toast(editingMeasurementId ? 'Measurement updated.' : 'Body measurement saved.')
    } catch (cause) { toast(cause instanceof Error ? cause.message : 'Could not save this measurement.') }
  }

  const editMeasurement = (item: BodyMeasurement) => {
    setEditingMeasurementId(item._id); setMeasurementName(item.name)
    setMetricAmount(user?.profile.units === 'imperial' ? Number((item.valueCm / 2.54).toFixed(1)) : item.valueCm)
    const date = new Date(item.date); date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); setMetricDate(date.toISOString().slice(0, 16))
    setMetricNotes(item.notes ?? ''); setModal('measurement')
  }

  const deleteMeasurement = async (id: string) => {
    const item = bodyMeasurements.find((measurement) => measurement._id === id)
    if (!item || !window.confirm(`Delete your ${item.name.toLowerCase()} measurement?`)) return
    try { await apiRequest<void>(`/api/v1/metrics/measurements/${id}`, { method: 'DELETE' }); setBodyMeasurements((items) => items.filter((measurement) => measurement._id !== id)); toast('Measurement deleted.') }
    catch (cause) { toast(cause instanceof Error ? cause.message : 'Could not delete this measurement.') }
  }

  const deleteMetric = async (id: string) => {
    const entry = metricLogs.find((item) => item._id === id)
    if (!entry || !window.confirm(`Delete this ${entry.kind === 'water' ? 'water' : 'weight'} entry?`)) return
    try {
      await apiRequest<void>(`/api/v1/metrics/${id}`, { method: 'DELETE' })
      setMetricLogs((items) => items.filter((item) => item._id !== id))
      toast(`${entry.kind === 'water' ? 'Water' : 'Weight'} entry deleted.`)
    } catch (cause) { toast(cause instanceof Error ? cause.message : 'Could not delete this entry.') }
  }

  const openTargetsModal = () => { setTargetDraft(targets); setModal('targets') }
  const saveTargets = async (event: FormEvent) => { event.preventDefault(); try { const result = await apiRequest<{ goalMl: number | null }>('/api/v1/metrics/hydration-goal', { method: 'PATCH', body: JSON.stringify({ goalMl: targetDraft.water }) }); setTargets({ ...targetDraft, water: result.goalMl }); setModal(null); toast('Daily targets saved.') } catch (cause) { toast(cause instanceof Error ? cause.message : 'Could not save your water goal.') } }
  const openQuickAction = (action: Exclude<Modal, 'targets' | null>) => {
    setQuickActionsOpen(false)
    if (action === 'workout') { startNewWorkout(); return }
    setEditingMetricId(null); setMetricNotes('')
    const now = new Date(); now.setMinutes(now.getMinutes() - now.getTimezoneOffset()); setMetricDate(now.toISOString().slice(0, 16))
    if (action === 'water') setMetricAmount(250)
    if (action === 'weight') setMetricAmount(user?.profile.units === 'imperial' && latestWeightKg ? Number((latestWeightKg * 2.2046226218).toFixed(1)) : latestWeightKg ?? 70)
    setModal(action)
  }

  const deleteWorkout = async (id: string) => {
    const deleted = workouts.find((item) => item._id === id)
    if (!deleted || !window.confirm('Delete “' + deleted.title + '”? You can undo this for a few seconds.')) return
    try {
      await apiRequest<void>('/api/v1/workouts/' + id, { method: 'DELETE' })
      setWorkouts((items) => items.filter((item) => item._id !== id))
      toast('Workout deleted.', async () => {
        const { _id, ...data } = deleted
        void _id
        const result = await apiRequest<{ workout: WorkoutRecord }>('/api/v1/workouts', { method: 'POST', body: JSON.stringify(data) })
        setWorkouts((items) => [result.workout, ...items])
      })
    }
    catch (cause) { toast(cause instanceof Error ? cause.message : 'Could not delete workout.') }
  }
  const editWorkout = (item: WorkoutRecord) => {
    setTemplateMode(false); setEditingWorkoutId(item._id); setWorkoutDate(item.date); setWorkoutTitle(item.title); setDurationMinutes(item.durationMinutes)
    setWorkoutIntensity(item.intensity ?? user?.profile.trainingIntensity ?? 'moderate'); setSelectedActivityId(item.activityId ?? ''); setActivityDistanceKm(item.distanceKm?.toString() ?? '')
    setExercises(item.exercises.map((exercise) => ({ ...exercise, weightUnit: exercise.weightUnit ?? 'kg', durationSeconds: exercise.durationSeconds ?? null })))
    setModal('workout')
  }
  const repeatWorkout = (item: WorkoutRecord | WorkoutTemplate) => {
    setTemplateMode(false); setEditingWorkoutId(null); setWorkoutDate(new Date().toISOString()); setWorkoutTitle(item.title); setDurationMinutes(item.durationMinutes)
    setWorkoutIntensity(item.intensity ?? user?.profile.trainingIntensity ?? 'moderate'); setSelectedActivityId(item.activityId ?? ''); setActivityDistanceKm(item.distanceKm?.toString() ?? '')
    setExercises(item.exercises.map((exercise) => ({ ...exercise, weightUnit: exercise.weightUnit ?? 'kg', durationSeconds: exercise.durationSeconds ?? null })))
    setModal('workout')
  }
  const editTemplate = (item: WorkoutTemplate) => {
    setTemplateMode(true); setEditingTemplateId(item._id); setEditingWorkoutId(null); setWorkoutTitle(item.title); setDurationMinutes(item.durationMinutes)
    setWorkoutIntensity(item.intensity ?? user?.profile.trainingIntensity ?? 'moderate'); setSelectedActivityId(item.activityId ?? ''); setActivityDistanceKm(item.distanceKm?.toString() ?? '')
    setExercises(item.exercises.map((exercise) => ({ ...exercise, weightUnit: exercise.weightUnit ?? 'kg', durationSeconds: exercise.durationSeconds ?? null })))
    setModal('workout')
  }
  const saveAsTemplate = async (item: WorkoutRecord) => {
    try {
      const data = { title: item.title, durationMinutes: item.durationMinutes, intensity: item.intensity ?? null, activityId: item.activityId ?? null, distanceKm: item.distanceKm ?? null, exercises: item.exercises }
      const result = await apiRequest<{ template: WorkoutTemplate }>('/api/v1/workout-templates', { method: 'POST', body: JSON.stringify(data) })
      setTemplates((items) => [result.template, ...items]); toast('Saved as a workout template.')
    } catch (cause) { toast(cause instanceof Error ? cause.message : 'Could not save template.') }
  }
  const deleteTemplate = async (item: WorkoutTemplate) => {
    if (!window.confirm('Delete the “' + item.title + '” template?')) return
    try { await apiRequest<void>('/api/v1/workout-templates/' + item._id, { method: 'DELETE' }); setTemplates((items) => items.filter((entry) => entry._id !== item._id)); toast('Template deleted.') }
    catch (cause) { toast(cause instanceof Error ? cause.message : 'Could not delete template.') }
  }
  const startNewTemplate = () => {
    setTemplateMode(true); setEditingTemplateId(null); setEditingWorkoutId(null)
    setWorkoutTitle(''); setDurationMinutes(30); setWorkoutIntensity(user?.profile.trainingIntensity ?? 'moderate'); setExercises([]); setExerciseQuery(''); setSelectedActivityId(''); setActivityDistanceKm('')
    setModal('workout')
  }
  const startNewWorkout = () => {
    setTemplateMode(false); setEditingWorkoutId(null); setEditingTemplateId(null)
    setWorkoutDate(new Date().toISOString()); setWorkoutTitle(''); setDurationMinutes(30); setWorkoutIntensity(user?.profile.trainingIntensity ?? 'moderate'); setExercises([]); setExerciseQuery(''); setSelectedActivityId(''); setActivityDistanceKm('')
    setModal('workout')
  }
  const deleteMeal = async (id: string) => {
    const meal = meals.find((item) => item._id === id)
    if (!meal || !window.confirm(`Delete ${meal.foodName} from your diary?`)) return
    try { await apiRequest<void>(`/api/v1/meals/${id}`, { method: 'DELETE' }); setMeals((items) => items.filter((item) => item._id !== id)); toast('Meal removed and nutrition recalculated.') }
    catch (cause) { toast(cause instanceof Error ? cause.message : 'Could not delete meal.') }
  }
  const editMeal = (meal: MealRecord) => {
    setEditingMealId(meal._id); setCanEditMealQuantity(Boolean(meal.nutritionPer100g)); setMealType(meal.mealType); setFoodSource('local'); setQuickAdd(false); setRecipeBuilder(false)
    setSelectedFood(meal.nutritionPer100g ? { id: meal.foodId ?? 'recent:' + meal._id, name: meal.foodName, category: 'Logged food', source: meal.nutritionSource ?? 'user-entered', referenceId: meal.nutritionReferenceId ?? null, serving: meal.servingLabel, servingGrams: 100, nutritionPer100g: meal.nutritionPer100g } : null)
    setFoodQuantityGrams(meal.quantityGrams ?? 100); setFoodQuery(meal.foodName); setModal('meal')
  }
  const repeatMeal = (meal: MealRecord) => {
    const grams = meal.quantityGrams ?? 100
    const nutrients = meal.nutritionPer100g ?? { calories: meal.calories * 100 / grams, proteinGrams: meal.proteinGrams * 100 / grams, carbsGrams: meal.carbsGrams * 100 / grams, fatGrams: meal.fatGrams * 100 / grams }
    setEditingMealId(null); setCanEditMealQuantity(true); setMealType(meal.mealType); setFoodSource('local'); setQuickAdd(false); setRecipeBuilder(false)
    setSelectedFood({ id: meal.foodId ?? 'recent:' + meal._id, name: meal.foodName, category: 'Recent food', source: meal.nutritionSource ?? 'user-entered', referenceId: meal.nutritionReferenceId ?? null, serving: meal.servingLabel, servingGrams: 100, nutritionPer100g: nutrients })
    setFoodQuantityGrams(grams); setFoodQuery(meal.foodName); setModal('meal')
  }
  const moveMeal = async (id: string, nextMealType: MealRecord['mealType']) => {
    try { const result = await apiRequest<{ meal: MealRecord }>('/api/v1/meals/' + id, { method: 'PATCH', body: JSON.stringify({ mealType: nextMealType }) }); setMeals((items) => items.map((item) => item._id === id ? result.meal : item)); toast('Meal moved.') }
    catch (cause) { toast(cause instanceof Error ? cause.message : 'Could not move this meal.') }
  }
  const addExercise = (name: string) => {
    if (!name) return
    setExercises((items) => [...items, { name, sets: 3, reps: 10, weightKg: null, weightUnit: user?.profile.units === 'imperial' ? 'lb' : 'kg', durationSeconds: null }])
    setExerciseQuery('')
  }

  return <div className={light ? 'app light' : 'app'}>
    <aside className={`sidebar ${mobileMenu ? 'open' : ''}`}>
      <a className="brand" href="#home" onClick={() => setView('Dashboard')}><span className="brand-mark"><Activity size={20} strokeWidth={2.7} /></span><span>fit<span className="brand-accent">quest</span></span></a>
      <div className="workspace-label">YOUR SPACE</div>
      <nav className="primary-nav" aria-label="Main navigation">{navItems.map(({ label, icon: Icon }) => <button key={label} className={`nav-item ${view === label ? 'active' : ''}`} onClick={() => { setView(label); setMobileMenu(false) }}><Icon size={18} /><span>{label}</span></button>)}</nav>
      <div className="sidebar-spacer" />
      <div className="sidebar-quest"><div className="quest-top"><span className="quest-icon"><Trophy size={17} /></span><span>YOUR STREAK</span></div><strong>{streak} {streak === 1 ? 'day' : 'days'} active</strong><div className="quest-progress"><span style={{ width: `${Math.min(100, streak / 5 * 100)}%` }} /></div><div className="quest-caption"><span>{streak} days</span><span>personal best</span></div></div>
      <button className={`nav-item settings-link ${view === 'Settings' ? 'active' : ''}`} onClick={() => setView('Settings')}><Settings size={18} /><span>Profile &amp; Settings</span></button>
      <div className="profile-mini"><div className="avatar">{user?.displayName.slice(0, 1).toUpperCase()}</div><div className="profile-copy"><strong>{user?.displayName}</strong><span>{user?.email}</span></div><button className="profile-signout" onClick={() => void signOut()} aria-label="Sign out">Sign out</button></div>
    </aside>

    <main className="main-shell">
      <header className="topbar"><button className="icon-button mobile-menu" aria-label="Open menu" onClick={() => setMobileMenu(!mobileMenu)}><Menu size={20} /></button><div className="breadcrumbs"><span>My space</span><span className="crumb-slash">/</span><strong>{view}</strong></div><div className="top-actions">
        <div className="global-search"><Search size={15} /><input value={globalQuery} onChange={(event) => setGlobalQuery(event.target.value)} placeholder="Search workouts & food" aria-label="Search workout history and food logs" />{globalQuery && <button type="button" aria-label="Clear search" onClick={() => setGlobalQuery('')}><X size={14} /></button>}
          {globalQuery.trim() && <div className="global-search-results"><strong>Workouts</strong>{workouts.filter((item) => `${item.title} ${item.exercises.map((exercise) => exercise.name).join(' ')}`.toLowerCase().includes(globalQuery.toLowerCase())).slice(0, 4).map((item) => <button type="button" key={item._id} onClick={() => { setView('Workouts'); setGlobalQuery('') }}><Dumbbell size={14} /><span>{item.title}<small>{localDateLabel(new Date(item.date))}</small></span></button>)}{!workouts.some((item) => `${item.title} ${item.exercises.map((exercise) => exercise.name).join(' ')}`.toLowerCase().includes(globalQuery.toLowerCase())) && <small>No workout matches</small>}<strong>Food logs</strong>{meals.filter((item) => item.foodName.toLowerCase().includes(globalQuery.toLowerCase())).slice(0, 4).map((item) => <button type="button" key={item._id} onClick={() => { setView('Nutrition'); setGlobalQuery('') }}><Apple size={14} /><span>{item.foodName}<small>{item.mealType} · {localDateLabel(new Date(item.date))}</small></span></button>)}{!meals.some((item) => item.foodName.toLowerCase().includes(globalQuery.toLowerCase())) && <small>No food matches</small>}</div>}
        </div>
        <div className="date-chip"><CalendarDays size={16} /><span>{localDateLabel(new Date())}</span></div><button className="icon-button theme-toggle" aria-label={light ? 'Switch to dark theme' : 'Switch to light theme'} onClick={() => { const next = !light; setLight(next); localStorage.setItem('fitquest-theme', next ? 'light' : 'dark') }}>{light ? <Moon size={18} /> : <Sun size={18} />}</button><div className="top-avatar">{user?.displayName.slice(0, 1).toUpperCase()}</div>
      </div></header>
      {loadError && <div className="data-error" role="alert"><ShieldCheck size={16} /><span>{loadError}</span><button onClick={() => void loadData()}>Retry</button></div>}
      {view === 'Settings' ? <ProfileForm onThemeChange={(theme) => { const isLight = theme === 'light' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: light)').matches); setLight(isLight); localStorage.setItem('fitquest-theme', theme) }} /> : view === 'Dashboard' ? <>
        <section className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line" /> {localDateLabel(new Date(), { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()}</div><h1>Welcome, {user?.displayName.split(' ')[0]} <span className="wave">✳</span></h1><p className="welcome-subtitle">Your progress starts with what you choose to log today.</p></div><button className="button button-primary" onClick={startNewWorkout}><Plus size={17} /> Log a workout</button></section>
        <section className="stats-grid" aria-label="Your weekly activity"><StatCard icon={<Flame size={18} />} label="ACTIVE STREAK" value={streak} unit={streak === 1 ? 'day' : 'days'} note="consecutive workout days" accent="orange" /><StatCard icon={<Dumbbell size={18} />} label="WORKOUTS" value={weekWorkouts.length} unit="this week" note="your activity log" accent="lime" /><StatCard icon={<Footprints size={18} />} label="ACTIVE MINUTES" value={weeklyMinutes} unit="min" note="this week" accent="blue" /><StatCard icon={<Heart size={18} />} label="TODAY'S MEALS" value={todayMeals.length} unit={todayMeals.length === 1 ? 'entry' : 'entries'} note={`${formatNumber(todayNutrition.calories)} estimated kcal`} accent="pink" /></section>
        <section className="dashboard-overview-grid">
          <div className="panel calorie-budget"><div className="panel-heading"><div><div className="section-kicker">TODAY'S CALORIE OVERVIEW</div><h2>Energy balance</h2></div><button type="button" className="text-button" onClick={openTargetsModal}>Edit targets <Settings size={14} /></button></div>
            <div className="budget-remaining"><strong>{remainingCalories.toLocaleString()}</strong><span>remaining kcal</span><small>Target − food + active exercise estimate</small></div>
            <div className="budget-breakdown"><div><span>Daily target</span><strong>{formatNumber(targets.calories)} kcal</strong></div><div><span>Food calories</span><strong>{formatNumber(todayNutrition.calories)} kcal</strong></div><div><span>Active exercise calories</span><strong>{estimatedCaloriesBurned === null ? '—' : `+${formatNumber(estimatedCaloriesBurned)} kcal`}</strong></div></div>
            <small className="estimate-note">{estimatedCaloriesBurned === null ? 'Choose a specific activity and add your age (19–59) and current body weight to your profile for an estimate.' : 'The workout record saves the standard MET estimate. The calorie budget uses active calories only, subtracting the resting component to avoid double-counting.'}</small>
          </div>
          <div className="panel daily-checklist"><div className="panel-heading"><div><div className="section-kicker">YOUR DAILY CHECKLIST</div><h2>Small steps count</h2></div><strong className="completion-percent">{Math.round(([todayWorkouts.length > 0, todayMeals.length > 0, todayNutrition.protein >= targets.protein, targets.water === null || todayWaterMl >= targets.water, todayWorkouts.some((item) => item.durationMinutes >= (user?.profile.minutesPerSession ?? 30))].filter(Boolean).length / 5) * 100)}%</strong></div>
            <div className="hydration-summary"><Droplets size={17} /><span><strong>{formatNumber(todayWaterMl)} ml</strong><small>{targets.water ? `of ${formatNumber(targets.water)} ml personal goal` : 'Set a personal water goal in targets'}</small></span><button type="button" onClick={() => openQuickAction('water')}>+ Add water</button></div>{targets.water !== null && <div className="hydration-progress" role="progressbar" aria-label="Today's water intake" aria-valuenow={todayWaterMl} aria-valuemin={0} aria-valuemax={targets.water}><span style={{ width: `${Math.min(100, targets.water > 0 ? todayWaterMl / targets.water * 100 : 0)}%` }} /></div>}
            <div className="checklist-list">
              <ChecklistItem done={todayWorkouts.length > 0} label="Log a workout" onClick={startNewWorkout} />
              <ChecklistItem done={todayMeals.length > 0} label="Log meals" onClick={() => setModal('meal')} />
              <ChecklistItem done={todayNutrition.protein >= targets.protein} label={`Meet protein target · ${Math.round(todayNutrition.protein)}/${targets.protein} g`} onClick={() => setView('Nutrition')} />
              <ChecklistItem done={targets.water === null || todayWaterMl >= targets.water} label={targets.water === null ? `Hydration · ${formatNumber(todayWaterMl)} ml logged` : `Meet hydration target · ${formatNumber(todayWaterMl)}/${formatNumber(targets.water)} ml`} onClick={() => openQuickAction('water')} />
              <ChecklistItem done={todayWorkouts.some((item) => item.durationMinutes >= (user?.profile.minutesPerSession ?? 30))} label="Complete daily fitness goal" onClick={startNewWorkout} />
            </div>
          </div>
        </section>
        <section className="content-grid"><div className="panel activity-panel"><div className="panel-heading"><div><div className="section-kicker">YOUR MOMENTUM</div><h2>Activity over time</h2></div><label className="select-wrap"><span className="sr-only">Activity chart range</span><select className="select-button" value={rangeDays} onChange={(event) => setRangeDays(Number(event.target.value) as 7 | 30)}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option></select><ChevronDown size={14} /></label></div><div className="chart-summary"><strong>{formatDuration(weeklyMinutes)}</strong>{trend !== null && <span className={`trend ${trend < 0 ? 'trend-down' : ''}`}>{trend < 0 ? <ArrowDownRight size={15} /> : <ArrowUpRight size={15} />} {Math.abs(trend)}%</span>}<span className="muted">{trend === null ? 'logged this week' : 'vs previous week'}</span></div><ActivityChart workouts={workouts} days={rangeDays} /><div className="chart-legend"><span><i className="legend-dot current" /> Your activity</span><span className="chart-total">{weekWorkouts.length} sessions this week</span></div></div>
          <div className="panel nutrition-panel nutrition-card"><div className="panel-heading"><div><div className="section-kicker">FUEL YOUR DAY</div><h2>Today’s nutrition</h2></div><button className="text-button" onClick={() => setView('Nutrition')}>Details <ArrowRight size={14} /></button></div><MacroDonut nutrition={todayNutrition} /><div className="macro-list"><Macro label="Protein" value={todayNutrition.protein} goal={targets.protein} color="lime" /><Macro label="Carbs" value={todayNutrition.carbs} goal={targets.carbs} color="orange" /><Macro label="Fat" value={todayNutrition.fat} goal={targets.fat} color="blue" /></div><button className="add-meal" onClick={() => setModal('meal')}><Plus size={15} /> Log a meal</button></div>
        </section>
        <section className="bottom-grid"><div className="panel schedule-panel"><div className="panel-heading"><div><div className="section-kicker">YOUR RECORD</div><h2>Today’s workouts</h2></div><button className="text-button" onClick={() => setView('Workouts')}>All workouts <ArrowRight size={15} /></button></div>{loading ? <div className="empty-inline">Loading your activity…</div> : todayWorkouts.length ? <div className="session-list">{todayWorkouts.slice(0, 4).map((item) => <div className="session-row" key={item._id}><span className="session-check checked"><Check size={13} /></span><span className="session-copy"><strong>{item.title}</strong><span>{item.exercises.length} exercises · {item.intensity ?? 'intensity not logged'}</span></span><span className="session-time"><Clock3 size={14} /> {item.durationMinutes} min</span><button className="row-delete" onClick={() => void deleteWorkout(item._id)} aria-label={`Delete ${item.title}`}><X size={15} /></button></div>)}</div> : <EmptyInline icon={<Dumbbell size={17} />} title="No workouts logged today" text="Your dashboard will update as soon as you add one." />}<button className="add-session" onClick={startNewWorkout}><Plus size={16} /> Add workout</button></div>
          <div className="panel schedule-panel"><div className="panel-heading"><div><div className="section-kicker">YOUR FOOD DIARY</div><h2>Today’s meals</h2></div><button className="text-button" onClick={() => setView('Nutrition')}>Open diary <ArrowRight size={15} /></button></div>{loading ? <div className="empty-inline">Loading your diary…</div> : todayMeals.length ? <div className="session-list">{todayMeals.slice(0, 4).map((item) => <div className="session-row" key={item._id}><span className="meal-dot"><Apple size={14} /></span><span className="session-copy"><strong>{item.foodName}</strong><span>{item.mealType} · {item.servings} × {item.servingLabel}</span></span><span className="session-time">{formatNumber(item.calories)} kcal</span><button className="row-delete" onClick={() => void deleteMeal(item._id)} aria-label={`Delete ${item.foodName}`}><X size={15} /></button></div>)}</div> : <EmptyInline icon={<Apple size={17} />} title="No meals logged today" text="Add a food to see your calories and macros here." />}<button className="add-session" onClick={() => setModal('meal')}><Plus size={16} /> Add meal</button></div>
        </section>
        <footer className="footer"><span>© {new Date().getFullYear()} FitQuest</span><span><ShieldCheck size={14} /> Your health data stays yours</span><button onClick={() => toast('Support options are not configured yet.')}><CircleHelp size={14} /> Help & feedback</button></footer>
      </> : view === 'Workouts' ? <WorkoutsView workouts={workouts} templates={templates} loading={loading} onLog={startNewWorkout} onNewTemplate={startNewTemplate} onDelete={(id) => void deleteWorkout(id)} onEdit={editWorkout} onRepeat={repeatWorkout} onSaveTemplate={saveAsTemplate} onDeleteTemplate={(item) => void deleteTemplate(item)} onEditTemplate={editTemplate} /> : view === 'Nutrition' ? <NutritionView meals={meals} loading={loading} totals={todayNutrition} onLog={() => { setEditingMealId(null); setQuickAdd(false); setRecipeBuilder(false); setSelectedFood(null); setFoodQuery(''); setModal('meal') }} onDelete={(id) => void deleteMeal(id)} onEdit={editMeal} onRepeat={repeatMeal} onMove={(id, mealType) => void moveMeal(id, mealType)} /> : <ProgressView workouts={workouts} meals={meals} metricLogs={metricLogs} measurements={bodyMeasurements} units={user?.profile.units ?? 'metric'} targetWeightKg={user?.profile.targetWeightKg ?? null} weeklyWorkoutGoal={user?.profile.workoutDaysPerWeek ?? null} onLogWeight={() => openQuickAction('weight')} onLogMeasurement={() => { setEditingMeasurementId(null); setMeasurementName('Waist'); setMetricAmount(user?.profile.units === 'imperial' ? 31.5 : 80); setMetricNotes(''); const now = new Date(); now.setMinutes(now.getMinutes()-now.getTimezoneOffset()); setMetricDate(now.toISOString().slice(0,16)); setModal('measurement') }} onEditMeasurement={editMeasurement} onDeleteMeasurement={(id) => void deleteMeasurement(id)} onEditMetric={editMetric} onDeleteMetric={(id) => void deleteMetric(id)} onLogWater={() => openQuickAction('water')} />}
    </main>
    <div className="quick-actions-anchor">
      {quickActionsOpen && <div className="quick-actions-menu" role="menu" aria-label="Quick actions">
        <button role="menuitem" onClick={() => openQuickAction('workout')}><Dumbbell size={16} /> Log workout</button>
        <button role="menuitem" onClick={() => openQuickAction('meal')}><Apple size={16} /> Log food</button>
        <button role="menuitem" onClick={() => openQuickAction('water')}><Droplets size={16} /> Log water</button>
        <button role="menuitem" onClick={() => openQuickAction('weight')}><Weight size={16} /> Log body weight</button>
      </div>}
      <button className="quick-actions-button" aria-expanded={quickActionsOpen} aria-label={quickActionsOpen ? 'Close quick actions' : 'Open quick actions'} onClick={() => setQuickActionsOpen((open) => !open)}><Plus size={22} /><span>Quick log</span></button>
    </div>
    {(modal === 'water' || modal === 'weight' || modal === 'measurement' || modal === 'targets') && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null) }}>
      <form className="modal entry-modal quick-entry-modal" onSubmit={modal === 'targets' ? saveTargets : modal === 'measurement' ? saveMeasurement : addMetric}>
        <button className="modal-close" type="button" aria-label="Close" onClick={() => setModal(null)}><X size={19} /></button>
        <span className="modal-icon">{modal === 'water' ? <Droplets size={19} /> : modal === 'weight' || modal === 'measurement' ? <Weight size={19} /> : <Target size={19} />}</span>
        <div className="section-kicker">YOUR DAILY TRACKING</div>
        <h2>{modal === 'water' ? 'Log water' : modal === 'weight' ? 'Log body weight' : modal === 'measurement' ? 'Log body measurement' : 'Customize daily targets'}</h2>
        <p>{modal === 'water' ? 'Record water intake in milliliters.' : modal === 'weight' ? 'Body weight is private and saved to your account.' : modal === 'measurement' ? 'Measurements are private and saved to your account.' : 'Targets are editable estimates for your personal tracking.'}</p>
        {modal === 'water' && <><label htmlFor="water-amount">Water amount (ml)<input id="water-amount" type="number" min={1} max={10000} step={50} value={metricAmount} onChange={(event) => setMetricAmount(Number(event.target.value))} required /></label>{!editingMetricId && <div className="water-quick-add"><button type="button" onClick={() => void quickLogWater(250)}>+250 ml</button><button type="button" onClick={() => void quickLogWater(500)}>+500 ml</button></div>}</>}
        {modal === 'weight' && <><label htmlFor="weight-amount">Body weight ({user?.profile.units === 'imperial' ? 'lb' : 'kg'})<input id="weight-amount" type="number" min={user?.profile.units === 'imperial' ? 55 : 25} max={user?.profile.units === 'imperial' ? 882 : 400} step="0.1" value={metricAmount} onChange={(event) => setMetricAmount(Number(event.target.value))} required /></label><label htmlFor="weight-notes">Notes (optional)<textarea id="weight-notes" maxLength={500} value={metricNotes} onChange={(event) => setMetricNotes(event.target.value)} placeholder="Optional context for this measurement" /></label></>}
        {modal === 'measurement' && <><label htmlFor="body-measurement-name">Measurement<select id="body-measurement-name" value={['Waist','Chest','Biceps','Hips','Thighs','Neck','Calves'].includes(measurementName) ? measurementName : 'Custom'} onChange={(event) => setMeasurementName(event.target.value)}>{['Waist','Chest','Biceps','Hips','Thighs','Neck','Calves','Custom'].map((name) => <option key={name}>{name}</option>)}</select></label>{(!['Waist','Chest','Biceps','Hips','Thighs','Neck','Calves'].includes(measurementName)) && <label htmlFor="custom-measurement-name">Custom name<input id="custom-measurement-name" maxLength={60} value={measurementName === 'Custom' ? '' : measurementName} placeholder="e.g. Forearm" onChange={(event) => setMeasurementName(event.target.value || 'Custom')} required /></label>}<label htmlFor="measurement-amount">Value ({user?.profile.units === 'imperial' ? 'in' : 'cm'})<input id="measurement-amount" type="number" min="1" max={user?.profile.units === 'imperial' ? 118 : 300} step="0.1" value={metricAmount} onChange={(event) => setMetricAmount(Number(event.target.value))} required /></label><label htmlFor="measurement-notes">Notes (optional)<textarea id="measurement-notes" maxLength={500} value={metricNotes} onChange={(event) => setMetricNotes(event.target.value)} placeholder="Optional context" /></label></>}
        {modal !== 'targets' && <label htmlFor="metric-date">Date and time<input id="metric-date" type="datetime-local" value={metricDate} onChange={(event) => setMetricDate(event.target.value)} required /></label>}
        {modal === 'targets' && <div className="target-fields">{([[ 'calories', 'Daily calories', 'kcal' ], [ 'protein', 'Protein', 'g' ], [ 'carbs', 'Carbohydrates', 'g' ], [ 'fat', 'Fat', 'g' ]] as const).map(([key, label, unit]) => <label key={key}>{label} ({unit})<input type="number" min={1} max={key === 'calories' ? 10000 : 20000} value={targetDraft[key]} onChange={(event) => setTargetDraft((current) => ({ ...current, [key]: Number(event.target.value) }))} required /></label>)}<label>Personal water goal (ml)<input type="number" min={1} max={20000} placeholder="Optional" value={targetDraft.water ?? ''} onChange={(event) => setTargetDraft((current) => ({ ...current, water: event.target.value ? Number(event.target.value) : null }))} /></label><p className="water-goal-help">Hydration needs vary. Set your own goal or leave it blank to track without a target.</p></div>}
        <div className="modal-actions"><button className="button button-quiet" type="button" onClick={() => setModal(null)}>Cancel</button><button className="button button-primary" type="submit">{modal === 'targets' ? 'Save targets' : editingMetricId || editingMeasurementId ? 'Save changes' : 'Save entry'}</button></div>
      </form>
    </div>}
    {mobileMenu && <button className="sidebar-scrim" aria-label="Close menu" onClick={() => setMobileMenu(false)} />}
    {notice && <div className="toast" role="status"><Check size={16} /> {notice}{undoAction && <button type="button" onClick={() => { const action = undoAction; setUndoAction(null); void action().then(() => toast('Workout restored.')).catch((cause) => toast(cause instanceof Error ? cause.message : 'Could not restore workout.')) }}>Undo</button>}</div>}
    {(modal === 'workout' || modal === 'meal') && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null) }}><form className="modal entry-modal" onSubmit={modal === 'workout' ? addWorkout : addMeal}><button className="modal-close" type="button" aria-label="Close" onClick={() => setModal(null)}><X size={19} /></button><span className="modal-icon">{modal === 'workout' ? <Dumbbell size={19} /> : <Apple size={19} />}</span><div className="section-kicker">ADD TO YOUR JOURNEY</div><h2>{modal === 'workout' ? templateMode ? (editingTemplateId ? 'Edit workout template' : 'Create workout template') : editingWorkoutId ? 'Edit workout' : 'Log a workout' : 'Log a meal'}</h2><p>{modal === 'workout' ? templateMode ? 'Build a reusable routine with manual exercise details.' : 'Choose exercises and record sets and reps. No automatic rep counting.' : 'Choose a food and serving. Nutrition values are estimates per listed serving.'}</p>
      {modal === 'workout' ? <><label htmlFor="workout-title">Workout name</label><input id="workout-title" value={workoutTitle} onChange={(event) => setWorkoutTitle(event.target.value)} placeholder="e.g. Upper body strength" maxLength={100} required /><label htmlFor="duration">Activity duration (minutes)</label><input id="duration" type="number" min={1} max={1440} value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))} required /><label htmlFor="activity-select">Activity type for calorie estimate (optional)</label><select id="activity-select" value={selectedActivityId} onChange={(event) => setSelectedActivityId(event.target.value)}><option value="">Choose an activity for an estimate</option>{[...new Set(activityCatalog.map((activity) => activity.category))].map((category) => <optgroup key={category} label={category}>{activityCatalog.filter((activity) => activity.category === category).map((activity) => <option key={activity.id} value={activity.id}>{activity.name} · {activity.met} MET</option>)}</optgroup>)}</select>{selectedActivity && <div className="activity-estimate-info"><strong>{selectedActivity.intensity} effort · {selectedActivity.met} MET</strong><span>{selectedActivity.instructions}</span><small>Target: {selectedActivity.targetMuscles.join(', ')}{selectedActivity.secondaryMuscles.length ? ` · Also: ${selectedActivity.secondaryMuscles.join(', ')}` : ''}{selectedActivity.equipment.length ? ` · Equipment: ${selectedActivity.equipment.join(', ')}` : ''}</small>{selectedActivity.measurementType === 'duration-distance' && <label htmlFor="activity-distance">Distance (optional, km)<input id="activity-distance" type="number" min="0" max="10000" step="0.1" value={activityDistanceKm} onChange={(event) => setActivityDistanceKm(event.target.value)} placeholder="Add distance if known" /></label>}{selectedActivity.speedKph && <small>Reference pace: about {selectedActivity.speedKph} km/h. If your pace differs, choose the closest activity option.</small>}{activityCaloriesPreview !== null ? <strong>Estimated: {formatNumber(activityCaloriesPreview)} kcal total, about {formatNumber(Math.max(0, (selectedActivity.met - 1) * 3.5 * latestWeightKg! / 200 * durationMinutes))} active kcal</strong> : <small>Add an age from 19–59 and a current body weight in your profile to calculate an estimate.</small>}<small>Source: {selectedActivity.source}, activity code {selectedActivity.sourceCode}. This is an estimate, not a measurement.</small></div>}<label htmlFor="exercise-search">Add an exercise</label><div className="catalog-search"><Search size={16} /><input id="exercise-search" value={exerciseQuery} onChange={(event) => setExerciseQuery(event.target.value)} placeholder="Search exercise names" autoComplete="off" /></div><label className="exercise-category-filter">Exercise category<select value={exerciseCategory} onChange={(event) => setExerciseCategory(event.target.value)}>{['All','Strength','Cardio','Bodyweight','Mobility'].map((category) => <option key={category}>{category}</option>)}</select></label><div className="catalog-results">{exerciseCatalog.filter((name) => name.toLowerCase().includes(exerciseQuery.toLowerCase()) && (exerciseCategory === 'All' || getExerciseMetadata(name).category === exerciseCategory)).slice(0, 12).map((name) => { const meta = getExerciseMetadata(name); return <button type="button" key={name} onClick={() => addExercise(name)}><span>{name}<small>{meta.category} · {meta.muscle} · {meta.equipment}</small></span><Plus size={14} /></button> })}{exerciseQuery.trim().length > 1 && !exerciseCatalog.some((name) => name.toLowerCase() === exerciseQuery.trim().toLowerCase()) && <button type="button" onClick={() => addExercise(exerciseQuery.trim())}>Add “{exerciseQuery.trim()}” as a custom exercise<Plus size={14} /></button>}</div>{exercises.length > 0 && <div className="chosen-exercises"><div className="section-kicker">EXERCISES · SETS AND REPS ARE MANUAL</div>{exercises.map((exercise, index) => { const meta = getExerciseMetadata(exercise.name); const unit = exercise.weightUnit ?? 'kg'; const shownWeight = exercise.weightKg === null ? 0 : unit === 'lb' ? exercise.weightKg * 2.2046226218 : exercise.weightKg; return <div className="exercise-entry" key={exercise.name + '-' + index}><div className="exercise-meta"><strong>{exercise.name}</strong><small>{meta.category} · {meta.muscle} · {meta.equipment}</small></div><NumberStepper label="Sets" value={exercise.sets} min={1} max={30} onChange={(value) => setExercises((items) => items.map((item, i) => i === index ? { ...item, sets: value } : item))} /><NumberStepper label="Reps" value={exercise.reps} min={1} max={500} onChange={(value) => setExercises((items) => items.map((item, i) => i === index ? { ...item, reps: value } : item))} /><div className="weight-entry"><NumberStepper label="Weight" value={Number(shownWeight.toFixed(1))} min={0} max={unit === 'lb' ? 2200 : 1000} step={unit === 'lb' ? 1 : 0.5} onChange={(value) => setExercises((items) => items.map((item, i) => i === index ? { ...item, weightKg: value === 0 ? null : unit === 'lb' ? value / 2.2046226218 : value } : item))} /><select aria-label="Weight unit" value={unit} onChange={(event) => setExercises((items) => items.map((item, i) => i === index ? { ...item, weightUnit: event.target.value as 'kg' | 'lb' } : item))}><option value="kg">kg</option><option value="lb">lb</option></select></div>{meta.durationApplicable && <NumberStepper label="Seconds" value={exercise.durationSeconds ?? 0} min={0} max={86400} step={15} onChange={(value) => setExercises((items) => items.map((item, i) => i === index ? { ...item, durationSeconds: value || null } : item))} />}<button type="button" className="row-delete" aria-label={'Remove ' + exercise.name} onClick={() => setExercises((items) => items.filter((_, i) => i !== index))}><X size={15} /></button></div> })}</div>}<RestTimer /></> : <><label htmlFor="meal-type">Meal</label><select id="meal-type" value={mealType} onChange={(event) => setMealType(event.target.value as MealRecord['mealType'])}><option>Breakfast</option><option>Lunch</option><option>Dinner</option><option>Snack</option></select><div className="food-mode-row"><label htmlFor="food-source">Find food from</label><select id="food-source" value={foodSource} onChange={(event) => { setFoodSource(event.target.value as 'local' | 'usda' | 'packaged'); setSelectedFood(null); setRemoteFoods([]) }}><option value="local">FitQuest foods & Indian recipes</option><option value="usda" disabled={!usdaAvailable}>USDA raw ingredients{!usdaAvailable ? ' · setup needed' : ''}</option><option value="packaged">Packaged foods</option></select><button type="button" className="text-button" onClick={() => { setRecipeBuilder(!recipeBuilder); setQuickAdd(false); setSelectedFood(null); setRecipeIngredients([]) }}>{recipeBuilder ? 'Log a meal' : 'Create recipe'}</button><button type="button" className="text-button" onClick={() => { setQuickAdd(!quickAdd); setSelectedFood(null) }}>{quickAdd ? 'Search foods' : 'Quick Add'}</button></div>{quickAdd ? <div className="quick-food-fields"><label>Food name<input value={quickFoodName} onChange={(event) => setQuickFoodName(event.target.value)} placeholder="Food or meal name" maxLength={100} required /></label><p>Enter nutrition per 100 g. This is saved as a user-entered estimate.</p>{([['calories','Calories (kcal)'],['proteinGrams','Protein (g)'],['carbsGrams','Carbohydrates (g)'],['fatGrams','Fat (g)']] as const).map(([key,label]) => <label key={key}>{label}<input type="number" min="0" max={key === 'calories' ? 1000 : 100} step="0.1" value={quickNutrition[key]} onChange={(event) => setQuickNutrition((value) => ({ ...value, [key]: Number(event.target.value) }))} required /></label>)}<label>How much (grams)<input type="number" min="1" max="5000" value={foodQuantityGrams} onChange={(event) => setFoodQuantityGrams(Number(event.target.value))} required /></label><p>Confirm this entry: about {formatNumber(quickNutrition.calories * foodQuantityGrams / 100)} kcal · P {(quickNutrition.proteinGrams * foodQuantityGrams / 100).toFixed(1)} g · C {(quickNutrition.carbsGrams * foodQuantityGrams / 100).toFixed(1)} g · F {(quickNutrition.fatGrams * foodQuantityGrams / 100).toFixed(1)} g.</p></div> : <>{recipeBuilder && <div className="quick-food-fields"><label>Recipe name<input value={recipeName} onChange={(event) => setRecipeName(event.target.value)} placeholder="e.g. Aloo Matar, family recipe" maxLength={100} required /></label><label>Total cooked weight (g)<input type="number" min="1" max="100000" value={recipeCookedWeight} onChange={(event) => setRecipeCookedWeight(Number(event.target.value))} required /></label><p>Cook the dish, then weigh the full finished recipe. Ingredient quantities include oil, ghee, and sauces when used.</p>{recipeIngredients.map((ingredient,index) => <div className="recipe-ingredient-row" key={ingredient.name+index}><span>{ingredient.name} · {ingredient.grams} g</span><button type="button" onClick={() => setRecipeIngredients((items) => items.filter((_,i)=>i!==index))}>Remove</button></div>)}{selectedFood && <button type="button" className="button button-quiet" onClick={() => { setRecipeIngredients((items) => [...items,{ name:selectedFood.name, grams:foodQuantityGrams, nutritionPer100g:selectedFood.nutritionPer100g }]); setSelectedFood(null); setFoodQuery('') }}>Add selected food as ingredient ({foodQuantityGrams} g)</button>}</div>}<div className="catalog-search"><Search size={16} /><input id="food-search" value={foodQuery} onChange={(event) => { setFoodQuery(event.target.value); setSelectedFood(null) }} placeholder={foodSource === 'packaged' ? 'Search branded foods' : foodSource === 'usda' ? 'Search raw ingredients' : 'Search foods and Indian dishes'} autoComplete="off" /></div>{foodSource === 'packaged' && <div className="barcode-entry"><input aria-label="Product barcode" value={barcode} onChange={(event) => setBarcode(event.target.value)} placeholder="Or scan/type a barcode" /><button type="button" onClick={() => { setBarcodeMessage(''); void apiRequest<{ food: FoodItem }>('/api/v1/meals/barcode/' + encodeURIComponent(barcode)).then((result) => { setSelectedFood(result.food); setFoodQuery(result.food.name); setFoodQuantityGrams(100) }).catch((cause) => setBarcodeMessage(cause instanceof Error ? cause.message : 'Product not found.')) }}>Find barcode</button>{barcodeMessage && <small>{barcodeMessage}</small>}</div>}{foodSource === 'usda' && !usdaAvailable && <p className="food-source-note">USDA search is optional and needs a backend-only FoodData Central key. Local logging and Quick Add still work.</p>}<div className="food-results">{visibleFoodResults.map((food) => <button type="button" key={food.id} className={selectedFood?.id === food.id ? 'selected' : ''} onClick={() => { setQuickAdd(false); setSelectedFood(food); setFoodQuery(food.name); setFoodQuantityGrams(food.servingGrams || 100) }}><span><strong>{food.name}</strong><small>{food.category} · {food.source} · {formatNumber(food.nutritionPer100g.calories)} kcal / 100 g</small></span><Plus size={14} /></button>)}</div></>}{selectedFood && !quickAdd && <div className="selected-food"><div><strong>{selectedFood.name}</strong><span>{selectedFood.source} · {formatNumber(selectedFood.nutritionPer100g.calories * foodQuantityGrams / 100)} kcal · P {(selectedFood.nutritionPer100g.proteinGrams * foodQuantityGrams / 100).toFixed(1)} g · C {(selectedFood.nutritionPer100g.carbsGrams * foodQuantityGrams / 100).toFixed(1)} g · F {(selectedFood.nutritionPer100g.fatGrams * foodQuantityGrams / 100).toFixed(1)} g</span>{selectedFood.ingredients && <small>Ingredients: {selectedFood.ingredients.join(', ')}. {selectedFood.cookingMethod}</small>}<small>Nutrition is estimated. {selectedFood.source === 'Open Food Facts' ? 'Packaged product information is community supplied.' : ''}</small></div><div className="quantity-picker"><label htmlFor="food-quantity">How much are you having? (g)</label><input id="food-quantity" type="number" min="1" max="5000" step="1" value={foodQuantityGrams} onChange={(event) => setFoodQuantityGrams(Number(event.target.value))} /><div>{[100,150,200].map((grams) => <button type="button" key={grams} onClick={() => setFoodQuantityGrams(grams)}>{grams} g</button>)}<button type="button" onClick={() => setFoodQuantityGrams(selectedFood.servingGrams)}>{selectedFood.serving} · {selectedFood.servingGrams} g</button></div></div><button type="button" className="text-button" onClick={() => { void apiRequest<{ favorite: { _id: string } }>('/api/v1/meals/favorites', { method: 'POST', body: JSON.stringify({ name: selectedFood.name, category: selectedFood.category, source: selectedFood.source, referenceId: selectedFood.referenceId, serving: selectedFood.serving, servingGrams: selectedFood.servingGrams, nutritionPer100g: selectedFood.nutritionPer100g }) }).then((result) => { setFavoriteFoods((items) => items.some((item) => item.name === selectedFood.name) ? items : [{ ...selectedFood, id: 'saved:' + result.favorite._id }, ...items]); toast('Food saved to favorites.') }).catch((cause) => toast(cause instanceof Error ? cause.message : 'Could not save favorite.')) }}>Save as favorite</button></div>}</>}
      <div className="modal-actions"><button className="button button-quiet" type="button" onClick={() => setModal(null)}>Cancel</button><button className="button button-primary" type="submit" disabled={modal === 'meal' && !editingMealId && (recipeBuilder ? (!recipeName.trim() || recipeIngredients.length === 0) : quickAdd ? (!quickFoodName.trim() || !Number.isFinite(foodQuantityGrams) || foodQuantityGrams <= 0) : !selectedFood)}><Plus size={16} /> Save {modal === 'workout' ? templateMode ? 'template' : editingWorkoutId ? 'changes' : 'workout' : recipeBuilder ? 'recipe' : editingMealId ? 'changes' : 'meal'}</button></div></form></div>}
  </div>
}

function formatDuration(minutes: number) { return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h ${minutes % 60}m` }

function StatCard({ icon, label, value, unit, note, accent }: { icon: ReactNode; label: string; value: number | string; unit: string; note: string; accent: string }) {
  return <div className="stat-card"><div className="stat-top"><span className={`stat-icon ${accent}`}>{icon}</span><span className="stat-label">{label}</span></div><div className="stat-value">{typeof value === 'number' ? formatNumber(value) : value}<small>{unit}</small></div><div className="stat-foot"><span>{note}</span></div></div>
}

function ActivityChart({ workouts, days }: { workouts: WorkoutRecord[]; days: 7 | 30 }) {
  const today = dayStart(new Date())
  const buckets = Array.from({ length: days }, (_, index) => {
    const date = new Date(today); date.setDate(date.getDate() - (days - 1 - index))
    const entries = workouts.filter((item) => dateKey(item.date) === date.getTime())
    return { label: date.toLocaleDateString(undefined, { weekday: days === 7 ? 'short' : undefined, month: days === 30 ? 'numeric' : undefined, day: days === 30 ? 'numeric' : undefined }), tooltipDate: date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }), minutes: entries.reduce((sum, item) => sum + item.durationMinutes, 0), entries }
  })
  const max = Math.max(30, ...buckets.map((item) => item.minutes))
  const hasActivity = buckets.some((item) => item.minutes > 0)
  return <div className={`chart-area ${days === 30 ? 'chart-month' : ''}`}><div className="chart-y-labels"><span>{formatNumber(max)}</span><span>{formatNumber(max / 2)}</span><span>0</span></div><div className="chart-content"><div className="chart-gridlines"><i /><i /><i /></div><div className="bars">{buckets.map((item, index) => { const details = item.entries.map((workout) => `${workout.title} · ${workout.durationMinutes} min · ${workout.calorieEstimate == null ? 'calorie estimate unavailable' : `~${formatNumber(workout.calorieEstimate)} kcal estimated (${workout.activityMet} MET, ${workout.calorieCalculationWeightKg} kg)`}`).join('; '); return <div className="bar-pair" key={`${item.label}-${index}`} tabIndex={0} title={`${item.tooltipDate}: ${details || 'No workouts'}`} aria-label={`${item.tooltipDate}: ${details || 'No workouts'}`}><span className={`bar current-bar ${item.minutes ? 'highlight-bar' : 'empty-bar'}`} style={{ height: `${Math.max(item.minutes ? 5 : 1, item.minutes / max * 100)}%` }} /></div> })}</div>{!hasActivity && <div className="chart-empty">Log a workout to start your activity graph.</div>}<div className="chart-x-labels">{buckets.filter((_, index) => days === 7 || index % 5 === 0 || index === days - 1).map((item, index) => <span key={`${item.label}-${index}`}>{item.label}</span>)}</div></div></div>
}

function MacroDonut({ nutrition }: { nutrition: { calories: number; protein: number; carbs: number; fat: number } }) {
  const p = nutrition.protein * 4; const c = nutrition.carbs * 4; const f = nutrition.fat * 9; const total = p + c + f
  const gradient = total ? `conic-gradient(var(--lime) 0 ${p / total * 100}%, var(--orange) ${p / total * 100}% ${(p + c) / total * 100}%, var(--blue) ${(p + c) / total * 100}% 100%)` : 'conic-gradient(var(--line) 0 100%)'
  return <div className="nutrition-overview"><div className="calorie-ring" style={{ background: gradient }}><div><strong>{formatNumber(nutrition.calories)}</strong><span>estimated kcal</span></div></div><div className="calorie-copy"><span>{formatNumber(nutrition.calories)} <small>eaten today</small></span><span>{total ? `${formatNumber(total)} kcal` : 'No food logged'} <small>from macros</small></span></div></div>
}

function Macro({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  return <div className="macro-row"><div className="macro-label"><span>{label}</span><span><b>{formatNumber(value)}g</b> <small>/ {goal}g target · {formatNumber(Math.max(0, goal - value))}g left</small></span></div><div className="macro-track"><i className={color} style={{ width: `${Math.min(100, value / goal * 100)}%` }} /></div></div>
}

function ChecklistItem({ done, label, onClick }: { done: boolean; label: string; onClick: () => void }) {
  return <button type="button" className="checklist-item" onClick={onClick} aria-pressed={done}><span className={`checklist-mark ${done ? 'done' : ''}`}>{done && <Check size={13} />}</span><span>{label}</span><ArrowRight size={14} /></button>
}

function EmptyInline({ icon, title, text }: { icon: ReactNode; title: string; text: string }) { return <div className="empty-inline"><span className="section-feature-icon">{icon}</span><strong>{title}</strong><span>{text}</span></div> }

function getExerciseMetadata(name: string) {
  const value = name.toLowerCase()
  const category = /run|treadmill|cycling|bike|rowing|elliptical|jump rope|swimming|walking|mountain climber/.test(value) ? 'Cardio' : /yoga|mobility|stretch/.test(value) ? 'Mobility' : /plank|push-up|pull-up|dip|air squat|dead bug|lunge/.test(value) ? 'Bodyweight' : 'Strength'
  const muscle = /squat|leg press|lunge|calf|leg curl/.test(value) ? 'Lower body' : /deadlift|romanian|hip thrust/.test(value) ? 'Glutes & hamstrings' : /bench|push-up|chest|fly|dip/.test(value) ? 'Chest' : /pull|row|lat|face pull/.test(value) ? 'Back' : /curl|triceps/.test(value) ? 'Arms' : /plank|crunch|knee raise|dead bug/.test(value) ? 'Core' : /run|bike|walk|swim|row|elliptical|jump rope/.test(value) ? 'Full body' : 'Shoulders & upper body'
  const equipment = /barbell/.test(value) ? 'Barbell' : /dumbbell|goblet/.test(value) ? 'Dumbbells' : /cable|pushdown|pulldown/.test(value) ? 'Cable machine' : /machine|leg press/.test(value) ? 'Machine' : /band/.test(value) ? 'Resistance band' : /treadmill|stationary bike|rowing machine|elliptical/.test(value) ? 'Cardio machine' : 'Bodyweight or any'
  return { category, muscle, equipment, durationApplicable: category === 'Cardio' || category === 'Mobility' }
}

function NumberStepper({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (value: number) => void }) {
  const update = (next: number) => onChange(Math.min(max, Math.max(min, Number(next.toFixed(1)))))
  return <div className="number-stepper"><span>{label}</span><div><button type="button" aria-label={'Decrease ' + label} onClick={() => update(value - step)}>−</button><input aria-label={label} type="number" min={min} max={max} step={step} value={value} onChange={(event) => update(Number(event.target.value) || min)} /><button type="button" aria-label={'Increase ' + label} onClick={() => update(value + step)}>+</button></div></div>
}

function RestTimer() {
  const [preset, setPreset] = useState('60')
  const [customMinutes, setCustomMinutes] = useState(3)
  const [remaining, setRemaining] = useState(60)
  const [endsAt, setEndsAt] = useState<number | null>(null)
  const [sound, setSound] = useState(true)
  const [finished, setFinished] = useState(false)
  useEffect(() => {
    if (endsAt === null) return
    const tick = () => {
      const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
      setRemaining(left)
      if (left === 0) {
        setEndsAt(null); setFinished(true)
        if (sound && typeof AudioContext !== 'undefined') {
          try { const context = new AudioContext(); const oscillator = context.createOscillator(); const gain = context.createGain(); oscillator.frequency.value = 880; gain.gain.value = 0.12; oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + 0.35); oscillator.onended = () => void context.close() } catch { /* Audio is optional and may be blocked by the browser. */ }
        }
      }
    }
    tick()
    const timer = window.setInterval(tick, 250)
    return () => window.clearInterval(timer)
  }, [endsAt, sound])
  const choosePreset = (value: string) => { setPreset(value); setRemaining(value === 'custom' ? customMinutes * 60 : Number(value)); setFinished(false); setEndsAt(null) }
  const start = () => { const seconds = preset === 'custom' ? customMinutes * 60 : Number(preset); setRemaining(seconds); setFinished(false); setEndsAt(Date.now() + seconds * 1000) }
  const pause = () => { if (endsAt !== null) setRemaining(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))); setEndsAt(null) }
  const resume = () => { if (remaining > 0) setEndsAt(Date.now() + remaining * 1000) }
  const reset = () => { setEndsAt(null); setRemaining(preset === 'custom' ? customMinutes * 60 : Number(preset)); setFinished(false) }
  const time = Math.max(0, remaining)
  return <div className="rest-timer"><div className="rest-timer-heading"><div><div className="section-kicker">BETWEEN SETS</div><strong>{finished ? 'Rest complete' : 'Rest timer'}</strong></div><strong className="rest-countdown" aria-live="polite">{String(Math.floor(time / 60)).padStart(2, '0')}:{String(time % 60).padStart(2, '0')}</strong></div>
    <div className="rest-presets">{[['30','30 sec'],['60','60 sec'],['90','90 sec'],['120','2 min'],['custom','Custom']].map(([value,label]) => <button type="button" className={preset === value ? 'selected' : ''} key={value} onClick={() => choosePreset(value)}>{label}</button>)}</div>
    {preset === 'custom' && <label className="rest-custom">Custom minutes<input type="number" min={1} max={60} value={customMinutes} onChange={(event) => { const next = Math.max(1, Math.min(60, Number(event.target.value) || 1)); setCustomMinutes(next); setEndsAt(null); setFinished(false); setRemaining(next * 60) }} /></label>}
    <div className="rest-controls">{endsAt === null ? <button type="button" className="button button-primary" onClick={finished ? start : remaining < (preset === 'custom' ? customMinutes * 60 : Number(preset)) ? resume : start}>{remaining === 0 ? 'Start again' : remaining < (preset === 'custom' ? customMinutes * 60 : Number(preset)) ? 'Resume' : 'Start'}</button> : <button type="button" className="button button-primary" onClick={pause}>Pause</button>}<button type="button" className="button button-quiet" onClick={reset}>Reset</button><label><input type="checkbox" checked={sound} onChange={(event) => setSound(event.target.checked)} /> Sound</label></div>
  </div>
}

type PersonalRecord = { workoutId: string; label: string; value: string; category: string }

function findPersonalRecords(workouts: WorkoutRecord[]): PersonalRecord[] {
  const best = new Map<string, { score: number; record: PersonalRecord }>()
  const ordered = [...workouts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const add = (key: string, score: number, record: PersonalRecord) => {
    if (score > (best.get(key)?.score ?? 0)) best.set(key, { score, record })
  }
  for (const workout of ordered) {
    add('duration', workout.durationMinutes, { workoutId: workout._id, label: 'Longest workout', value: workout.durationMinutes + ' min', category: 'time' })
    for (const exercise of workout.exercises) {
      add('reps', exercise.reps, { workoutId: workout._id, label: 'Most reps · ' + exercise.name, value: exercise.reps + ' reps', category: 'reps' })
      const key = /bench press/i.test(exercise.name) ? 'bench' : /squat/i.test(exercise.name) ? 'squat' : /deadlift/i.test(exercise.name) ? 'deadlift' : null
      if (key && exercise.weightKg !== null) {
        const title = key === 'bench' ? 'Bench press' : key === 'squat' ? 'Squat' : 'Deadlift'
        const value = exercise.weightUnit === 'lb' ? exercise.weightKg * 2.2046226218 : exercise.weightKg
        const unit = exercise.weightUnit ?? 'kg'
        add(key, exercise.weightKg, { workoutId: workout._id, label: 'Heaviest ' + title, value: value.toFixed(1) + ' ' + unit, category: key })
      }
    }
  }
  return [...best.values()].map((entry) => entry.record)
}

function WorkoutsView({ workouts, templates, loading, onLog, onNewTemplate, onDelete, onEdit, onRepeat, onSaveTemplate, onDeleteTemplate, onEditTemplate }: {
  workouts: WorkoutRecord[]; templates: WorkoutTemplate[]; loading: boolean; onLog: () => void; onNewTemplate: () => void
  onDelete: (id: string) => void; onEdit: (item: WorkoutRecord) => void; onRepeat: (item: WorkoutRecord | WorkoutTemplate) => void
  onSaveTemplate: (item: WorkoutRecord) => void; onDeleteTemplate: (item: WorkoutTemplate) => void; onEditTemplate: (item: WorkoutTemplate) => void
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const records = findPersonalRecords(workouts)
  return <section className="section-page">
    <div className="eyebrow"><span className="eyebrow-line" /> TRAIN WITH INTENTION</div>
    <div className="section-title-row"><div><h1>Your workouts</h1><p className="welcome-subtitle">Review sessions, reuse routines, and track your personal bests.</p></div><button className="button button-primary" onClick={onLog}><Plus size={17} /> Log a workout</button></div>
    {workouts.length > 0 && records.length > 0 && <div className="panel pr-panel"><div className="panel-heading"><div><div className="section-kicker">YOUR PERSONAL RECORDS</div><h2>Milestones from your log</h2></div><Trophy size={19} /></div><div className="pr-grid">{records.map((record) => <div className="pr-tile" key={record.category}><span>{record.label}</span><strong>{record.value}</strong></div>)}</div></div>}
    <div className="panel template-panel"><div className="panel-heading"><div><div className="section-kicker">REUSABLE ROUTINES</div><h2>Workout templates</h2></div><button className="button button-quiet" onClick={onNewTemplate}><Plus size={15} /> Create template</button></div>
      {templates.length === 0 ? <p className="template-empty">Save a routine from your workout history or create a custom template to reuse it later.</p> : <div className="template-grid">{templates.map((item) => <article className="template-card" key={item._id}><strong>{item.title}</strong><span>{item.exercises.length} exercises · {item.durationMinutes} min</span><div><button onClick={() => onRepeat(item)}>Use</button><button onClick={() => onEditTemplate(item)}>Edit</button><button onClick={() => onDeleteTemplate(item)}>Delete</button></div></article>)}</div>}
    </div>
    {loading ? <div className="panel workout-state">Loading workouts…</div> : workouts.length ? <div className="workout-log-list">{workouts.map((item) => {
      const itemRecords = records.filter((record) => record.workoutId === item._id)
      const expanded = expandedId === item._id
      return <article className="panel workout-log-card" key={item._id}>
        <div className="workout-log-top"><div><div className="section-kicker">{new Date(item.date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</div><h2>{item.title} {itemRecords.length > 0 && <span className="pr-badge">PR</span>}</h2></div><div className="workout-actions"><button onClick={() => onRepeat(item)}>Repeat</button><button onClick={() => onSaveTemplate(item)}>Save template</button><button onClick={() => onEdit(item)}>Edit</button><button className="delete-workout" onClick={() => onDelete(item._id)}>Delete</button></div></div>
        <p>{item.durationMinutes} minutes · {item.activityName ? `${item.activityCategory} · ${item.activityMet} MET · ${item.calorieEstimate == null ? 'estimate unavailable' : `~${formatNumber(item.calorieEstimate)} kcal estimated`}` : 'activity not selected'} · {item.exercises.length} exercises</p>{item.calorieEstimate != null && <small className="activity-source-note">Calculated with {item.calorieCalculationWeightKg} kg body weight · 2024 Adult Compendium code {item.activitySourceCode}</small>}
        {itemRecords.length > 0 && <div className="workout-achievements">{itemRecords.map((record) => <span key={record.category}><Trophy size={13} /> {record.label}: {record.value}</span>)}</div>}
        <button className="workout-details-toggle" aria-expanded={expanded} onClick={() => setExpandedId(expanded ? null : item._id)}>{expanded ? 'Hide details' : 'View details'} <ChevronDown size={15} /></button>
        {expanded && <div className="manual-exercise-list">{item.exercises.length ? item.exercises.map((exercise, index) => <div key={item._id + '-' + index}><strong>{exercise.name}</strong><span>{exercise.sets} sets × {exercise.reps} reps{exercise.weightKg !== null ? ' · ' + (exercise.weightUnit === 'lb' ? (exercise.weightKg * 2.2046226218).toFixed(1) : exercise.weightKg) + ' ' + (exercise.weightUnit ?? 'kg') : ''}{exercise.durationSeconds ? ' · ' + exercise.durationSeconds + ' sec' : ''}</span></div>) : <p>No exercises were included in this session.</p>}</div>}
      </article>
    })}</div> : <div className="panel workout-state"><div className="section-feature-icon"><Dumbbell size={23} /></div><h2>Your log starts at zero</h2><p>No sample workouts are added. Your history will appear here after you record your first session.</p><button className="button button-primary" onClick={onLog}><Plus size={16} /> Add your first workout</button></div>}
  </section>
}

function NutritionView({ meals, loading, totals, onLog, onDelete, onEdit, onRepeat, onMove }: { meals: MealRecord[]; loading: boolean; totals: { calories: number; protein: number; carbs: number; fat: number }; onLog: () => void; onDelete: (id: string) => void; onEdit: (meal: MealRecord) => void; onRepeat: (meal: MealRecord) => void; onMove: (id: string, mealType: MealRecord['mealType']) => void }) {
  const groups = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const
  return <section className="section-page">
    <div className="eyebrow"><span className="eyebrow-line" /> FUEL YOUR JOURNEY</div>
    <div className="section-title-row"><div><h1>Nutrition diary</h1><p className="welcome-subtitle">Food values are estimates. Edit the amount you ate to recalculate nutrients.</p></div><button className="button button-primary" onClick={onLog}><Plus size={17} /> Log a meal</button></div>
    <section className="stats-grid nutrition-stats"><StatCard icon={<Flame size={18} />} label="TODAY'S ENERGY" value={totals.calories} unit="kcal est." note="based on logged foods" accent="orange" /><StatCard icon={<Heart size={18} />} label="PROTEIN" value={totals.protein} unit="g" note="today" accent="lime" /><StatCard icon={<Activity size={18} />} label="CARBOHYDRATES" value={totals.carbs} unit="g" note="today" accent="blue" /><StatCard icon={<Apple size={18} />} label="FAT" value={totals.fat} unit="g" note="today" accent="pink" /></section>
    {loading ? <div className="panel workout-state">Loading meals…</div> : meals.length ? <div className="meal-groups">{groups.map((group) => {
      const items = meals.filter((meal) => meal.mealType === group)
      return <div className="panel meal-group" key={group}><div className="panel-heading"><h2>{group}</h2><span>{formatNumber(items.reduce((sum, item) => sum + item.calories, 0))} kcal est.</span></div>{items.length ? items.map((item) => <div className="meal-log-row" key={item._id}>
        <div className="meal-dot"><Apple size={15} /></div><div className="meal-log-copy"><strong>{item.foodName}</strong><span>{item.quantityGrams ? `${item.quantityGrams} g` : item.servingLabel} · {localDateLabel(new Date(item.date), { hour: 'numeric', minute: '2-digit' })}</span><small>P {formatNumber(item.proteinGrams)}g · C {formatNumber(item.carbsGrams)}g · F {formatNumber(item.fatGrams)}g{item.fiberGrams != null ? ` · Fiber ${formatNumber(item.fiberGrams)}g` : ''} · {item.nutritionSource ?? 'saved nutrition snapshot'}</small></div><strong>{formatNumber(item.calories)} kcal</strong>
        <div className="meal-actions"><select aria-label={'Move ' + item.foodName + ' to another meal'} value={item.mealType} onChange={(event) => onMove(item._id, event.target.value as MealRecord['mealType'])}>{groups.map((name) => <option key={name}>{name}</option>)}</select><button type="button" onClick={() => onEdit(item)}>Edit</button><button type="button" onClick={() => onRepeat(item)}>Repeat</button><button className="row-delete" onClick={() => onDelete(item._id)} aria-label={`Delete ${item.foodName}`}><X size={15} /></button></div>
      </div>) : <p className="empty-meal-group">No {group.toLowerCase()} entries yet.</p>}</div>
    })}</div> : <div className="panel workout-state"><div className="section-feature-icon"><Apple size={23} /></div><h2>Your diary starts at zero</h2><p>No example meals are included. Add foods to build your personal daily log.</p><button className="button button-primary" onClick={onLog}><Plus size={16} /> Add your first meal</button></div>}
  </section>
}

function ProgressView({ workouts, meals, metricLogs, measurements, units, targetWeightKg, weeklyWorkoutGoal, onLogWeight, onLogMeasurement, onEditMeasurement, onDeleteMeasurement, onEditMetric, onDeleteMetric, onLogWater }: { workouts: WorkoutRecord[]; meals: MealRecord[]; metricLogs: MetricRecord[]; measurements: BodyMeasurement[]; units: 'metric' | 'imperial'; targetWeightKg: number | null; weeklyWorkoutGoal: number | null; onLogWeight: () => void; onLogMeasurement: () => void; onEditMeasurement: (item: BodyMeasurement) => void; onDeleteMeasurement: (id: string) => void; onEditMetric: (item: MetricRecord) => void; onDeleteMetric: (id: string) => void; onLogWater: () => void }) {
  const [range, setRange] = useState<7 | 30 | 90 | 'all'>(30)
  const [strengthExercise, setStrengthExercise] = useState('')
  const weightLogs = metricLogs.filter((item) => item.kind === 'weight').sort((a, b) => +new Date(a.date) - +new Date(b.date))
  const waterLogs = metricLogs.filter((item) => item.kind === 'water').sort((a, b) => +new Date(b.date) - +new Date(a.date))
  const waterDays = [...waterLogs.reduce((groups, item) => groups.set(dateKey(item.date), [...(groups.get(dateKey(item.date)) ?? []), item]), new Map<number, MetricRecord[]>()).entries()]
  const now = new Date()
  const cutoff = range === 'all' ? null : dayStart(now).getTime() - (range - 1) * 86_400_000
  const visibleWeights = weightLogs.filter((item) => cutoff === null || +new Date(item.date) >= cutoff)
  const currentWeight = weightLogs.at(-1)?.value
  const startingWeight = weightLogs[0]?.value
  const weightDelta = currentWeight !== undefined && startingWeight !== undefined ? currentWeight - startingWeight : null
  const shownWeight = (kg: number) => units === 'imperial' ? kg * 2.2046226218 : kg
  const strengthEntries = workouts.flatMap((workout) => workout.exercises.filter((exercise) => exercise.weightKg && exercise.weightKg > 0).map((exercise) => ({ date: workout.date, name: exercise.name, kg: exercise.weightKg! })))
  const exerciseNames = [...new Set(strengthEntries.map((item) => item.name))].sort()
  const activeStrengthExercise = strengthExercise && exerciseNames.includes(strengthExercise) ? strengthExercise : exerciseNames[0] ?? ''
  const strengthSeries = strengthEntries.filter((item) => item.name === activeStrengthExercise).sort((a, b) => +new Date(a.date) - +new Date(b.date))
  const bestStrength = strengthSeries.length ? Math.max(...strengthSeries.map((item) => item.kg)) : null
  const previousBestStrength = strengthSeries.length > 1 ? Math.max(...strengthSeries.slice(0, -1).map((item) => item.kg)) : null
  const workoutDays = new Set(workouts.map((item) => dateKey(item.date)))
  let streak = 0; let streakDay = dayStart(new Date()).getTime()
  if (!workoutDays.has(streakDay)) streakDay -= 86_400_000
  while (workoutDays.has(streakDay)) { streak += 1; streakDay -= 86_400_000 }
  const proteinByDay = new Map<number, number>()
  for (const meal of meals) proteinByDay.set(dateKey(meal.date), (proteinByDay.get(dateKey(meal.date)) ?? 0) + meal.proteinGrams)
  const averageProtein = proteinByDay.size ? [...proteinByDay.values()].reduce((sum, value) => sum + value, 0) / proteinByDay.size : 0
  const lastWeekDays = new Set(workouts.filter((workout) => +new Date(workout.date) >= dayStart(new Date()).getTime() - 6 * 86_400_000).map((workout) => dateKey(workout.date))).size
  const dateBounds = <T extends { date: string }>(items: T[]): T[] => {
    const filtered = cutoff === null ? items : items.filter((item) => +new Date(item.date) >= cutoff)
    return filtered
  }
  const chartPoints = (items: Array<{ date: string; value: number }>) => {
    const data = dateBounds(items).sort((a, b) => +new Date(a.date) - +new Date(b.date))
    if (!data.length) return null
    const vals = data.map((item) => item.value); const min = Math.min(...vals); const max = Math.max(...vals); const spread = max - min || 1
    return { data, points: data.map((item, index) => `${data.length === 1 ? 50 : 24 + index * 652 / (data.length - 1)},${175 - (item.value - min) / spread * 135}`).join(' '), min, max }
  }
  const weightChart = chartPoints(visibleWeights.map((item) => ({ date: item.date, value: shownWeight(item.value) })))
  const strengthChart = chartPoints(strengthSeries.map((item) => ({ date: item.date, value: units === 'imperial' ? item.kg * 2.2046226218 : item.kg })))
  const goal = targetWeightKg === null ? null : shownWeight(targetWeightKg)
  const unit = units === 'imperial' ? 'lb' : 'kg'
  const rangeLabel = range === 'all' ? 'All time' : `Last ${range} days`
  return <section className="section-page"><div className="eyebrow"><span className="eyebrow-line" /> YOUR CONSISTENCY, OVER TIME</div><div className="section-title-row"><div><h1>Progress</h1><p className="welcome-subtitle">Your workouts, food logs, hydration, and measurements over time.</p></div><button className="button button-primary" onClick={onLogWeight}><Plus size={16} /> Log weight</button></div>
    <div className="stats-grid"><StatCard icon={<Dumbbell size={18} />} label="TOTAL WORKOUTS" value={workouts.length} unit="sessions" note="all time" accent="lime" /><StatCard icon={<Clock3 size={18} />} label="WORKOUT TIME" value={workouts.reduce((sum, item) => sum + item.durationMinutes, 0)} unit="minutes" note="all time" accent="blue" /><StatCard icon={<Apple size={18} />} label="MEALS LOGGED" value={meals.length} unit="entries" note="all time" accent="orange" /><StatCard icon={<Target size={18} />} label={weeklyWorkoutGoal ? 'WEEKLY GOAL' : 'ACTIVE DAYS'} value={weeklyWorkoutGoal ? `${Math.min(weeklyWorkoutGoal,lastWeekDays)}/${weeklyWorkoutGoal}` : lastWeekDays} unit={weeklyWorkoutGoal ? 'workouts' : 'days this week'} note={`${streak}-day current streak`} accent="pink" /><StatCard icon={<Trophy size={18} />} label="EXERCISE RECORDS" value={exerciseNames.length} unit="weighted lifts" note="with saved weight history" accent="orange" /><StatCard icon={<Heart size={18} />} label="AVG. PROTEIN" value={averageProtein ? Math.round(averageProtein) : '—'} unit={averageProtein ? 'g/day' : 'not logged'} note="average of days with meal logs" accent="lime" /></div>
    <div className="panel progress-panel"><div className="panel-heading progress-heading"><div><h2>Body weight</h2><p>Track your trend from your own entries.</p></div><div className="range-pills" aria-label="Weight chart date range">{([7,30,90,'all'] as const).map((days) => <button type="button" className={range === days ? 'selected' : ''} key={days} onClick={() => setRange(days)}>{days === 'all' ? 'All' : `${days}d`}</button>)}</div></div>
      <div className="weight-summary"><div><small>Starting</small><strong>{startingWeight === undefined ? '—' : `${shownWeight(startingWeight).toFixed(1)} ${unit}`}</strong></div><div><small>Current</small><strong>{currentWeight === undefined ? '—' : `${shownWeight(currentWeight).toFixed(1)} ${unit}`}</strong></div><div><small>Target</small><strong>{goal === null ? 'Not set' : `${goal.toFixed(1)} ${unit}`}</strong></div><div><small>Total change</small><strong className={weightDelta === null ? '' : weightDelta > 0 ? 'weight-up' : 'weight-down'}>{weightDelta === null ? '—' : `${weightDelta > 0 ? '+' : ''}${shownWeight(weightDelta).toFixed(1)} ${unit}`}</strong></div></div>
      {weightChart ? <div className="progress-chart-wrap"><svg viewBox="0 0 700 220" role="img" aria-label={`Body weight chart, ${rangeLabel}`} className="progress-chart"><line x1="20" y1="40" x2="680" y2="40"/><line x1="20" y1="105" x2="680" y2="105"/><line x1="20" y1="175" x2="680" y2="175"/>{goal !== null && goal >= weightChart.min && goal <= weightChart.max && <line className="goal-line" x1="20" y1={175-(goal-weightChart.min)/(weightChart.max-weightChart.min||1)*135} x2="680" y2={175-(goal-weightChart.min)/(weightChart.max-weightChart.min||1)*135} />}<polyline points={weightChart.points} fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>{weightChart.data.map((item,index) => { const [x,y]=weightChart.points.split(' ')[index].split(','); return <circle key={item.date+index} cx={x} cy={y} r="4" fill="currentColor"><title>{localDateLabel(new Date(item.date),{month:'short',day:'numeric'})}: {item.value.toFixed(1)} {unit}</title></circle> })}</svg><div className="chart-axis-labels"><span>{localDateLabel(new Date(weightChart.data[0].date),{month:'short',day:'numeric'})}</span><span>{localDateLabel(new Date(weightChart.data.at(-1)!.date),{month:'short',day:'numeric'})}</span></div></div> : <div className="progress-empty"><Weight size={22}/><strong>No weight entries in {rangeLabel.toLowerCase()}.</strong><span>Log a weight to start seeing your personal trend.</span><button type="button" className="button button-quiet" onClick={onLogWeight}>Log body weight</button></div>}
    </div>
      <div className="progress-two-column"><div className="panel progress-panel"><div className="panel-heading"><div><h2>Strength progression</h2><p>Best logged load by exercise, from your workout history.</p></div></div>{exerciseNames.length ? <><label className="progress-select">Exercise<select value={activeStrengthExercise} onChange={(event) => setStrengthExercise(event.target.value)}>{exerciseNames.map((name) => <option key={name}>{name}</option>)}</select></label><div className="strength-best"><span>Previous best <strong>{previousBestStrength === null ? '—' : `${(units === 'imperial' ? previousBestStrength * 2.2046226218 : previousBestStrength).toFixed(1)} ${unit}`}</strong></span><span>Current best <strong>{bestStrength === null ? '—' : `${(units === 'imperial' ? bestStrength * 2.2046226218 : bestStrength).toFixed(1)} ${unit}`}</strong></span></div>{strengthChart && <div className="progress-chart-wrap"><svg viewBox="0 0 700 220" role="img" aria-label={`${activeStrengthExercise} strength progression`} className="progress-chart strength-chart"><line x1="20" y1="40" x2="680" y2="40"/><line x1="20" y1="105" x2="680" y2="105"/><line x1="20" y1="175" x2="680" y2="175"/><polyline points={strengthChart.points} fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>{strengthChart.data.map((item,index) => { const [x,y]=strengthChart.points.split(' ')[index].split(','); return <circle key={item.date+index} cx={x} cy={y} r="4" fill="currentColor"><title>{localDateLabel(new Date(item.date),{month:'short',day:'numeric'})}: {item.value.toFixed(1)} {unit}</title></circle> })}</svg></div>}</> : <div className="progress-empty"><Dumbbell size={22}/><strong>No weighted exercises logged yet.</strong><span>Log exercise weights in a workout to see strength trends.</span></div>}</div>
      <div className="panel progress-panel hydration-history"><div className="panel-heading"><div><h2>Hydration history</h2><p>Daily totals and individual water entries.</p></div><button className="button button-quiet" onClick={onLogWater}><Plus size={14}/> Log water</button></div>{waterDays.length ? <div className="water-day-list">{waterDays.slice(0,7).map(([day,items])=><section className="water-day-group" key={day}><div className="water-day-total"><strong>{localDateLabel(new Date(day),{weekday:'short',month:'short',day:'numeric'})}</strong><span>{formatNumber(items.reduce((sum,item)=>sum+item.value,0))} ml</span></div>{items.map((item)=><div className="metric-history-row" key={item._id}><span className="metric-history-icon"><Droplets size={15}/></span><span className="metric-history-copy"><strong>{formatNumber(item.value)} ml</strong><small>{localDateLabel(new Date(item.date),{hour:'numeric',minute:'2-digit'})}</small></span><button type="button" onClick={()=>onEditMetric(item)}>Edit</button><button type="button" className="metric-delete" onClick={()=>onDeleteMetric(item._id)}>Delete</button></div>)}</section>)}</div> : <div className="progress-empty"><Droplets size={22}/><strong>No water entries yet.</strong><span>Log your drinks and this history updates automatically.</span><button className="button button-quiet" onClick={onLogWater}>Log water</button></div>}</div></div>
    <div className="panel progress-panel weight-history"><div className="panel-heading"><div><h2>Weight history</h2><p>Private entries you can edit or remove.</p></div></div>{weightLogs.length ? <div className="metric-history-list">{[...weightLogs].reverse().slice(0,10).map((item) => <div className="metric-history-row" key={item._id}><span className="metric-history-icon weight-icon"><Weight size={15}/></span><span className="metric-history-copy"><strong>{shownWeight(item.value).toFixed(1)} {unit}</strong><small>{localDateLabel(new Date(item.date),{weekday:'short',month:'short',day:'numeric'})}{item.notes ? ` · ${item.notes}` : ''}</small></span><button type="button" onClick={() => onEditMetric(item)}>Edit</button><button type="button" className="metric-delete" onClick={() => onDeleteMetric(item._id)}>Delete</button></div>)}</div> : <div className="progress-empty"><Weight size={22}/><strong>Your weight history starts with you.</strong><span>No sample measurements are included in your account.</span><button className="button button-quiet" onClick={onLogWeight}>Log body weight</button></div>}</div>
    <div className="panel progress-panel weight-history"><div className="panel-heading"><div><h2>Body measurements</h2><p>Compare changes over time. Values are stored in centimeters.</p></div><button className="button button-quiet" onClick={onLogMeasurement}><Plus size={14}/> Add measurement</button></div>{measurements.length ? <div className="measurement-grid">{[...new Set(measurements.map((item) => item.name))].map((name) => { const history=measurements.filter((item)=>item.name===name).sort((a,b)=>+new Date(a.date)-+new Date(b.date)); const first=history[0].valueCm,last=history.at(-1)!.valueCm; const displayed=(value:number)=>units==='imperial'?value/2.54:value; return <div className="measurement-card" key={name}><div><strong>{name}</strong><span>{displayed(last).toFixed(1)} {units==='imperial'?'in':'cm'}</span></div><small>{history.length>1?`${displayed(last-first)>0?'+':''}${displayed(last-first).toFixed(1)} ${units==='imperial'?'in':'cm'} since first entry`:'First entry logged'}</small><div className="metric-history-list">{[...history].reverse().slice(0,3).map((item)=><div className="metric-history-row" key={item._id}><span className="metric-history-copy"><small>{localDateLabel(new Date(item.date),{month:'short',day:'numeric'})}</small><strong>{displayed(item.valueCm).toFixed(1)} {units==='imperial'?'in':'cm'}</strong></span><button type="button" onClick={()=>onEditMeasurement(item)}>Edit</button><button type="button" className="metric-delete" onClick={()=>onDeleteMeasurement(item._id)}>Delete</button></div>)}</div></div> })}</div> : <div className="progress-empty"><Activity size={22}/><strong>No body measurements yet.</strong><span>Record waist, chest, arms, hips, thighs, or a custom measurement.</span><button className="button button-quiet" onClick={onLogMeasurement}>Add measurement</button></div>}</div>
  </section>
}



export default App
