import { Router, type RequestHandler } from 'express'
import mongoose from 'mongoose'
import { z } from 'zod'
import { requireAuth, requireCsrf } from './auth-middleware.js'
import { activityById, activityCatalog } from './activity-catalog.js'
import { DailyMetricLog } from './models/daily-metric-log.js'
import { User } from './models/user.js'
import { WorkoutLog } from './models/workout-log.js'

const workoutInput = z.object({
  title: z.string().trim().min(1).max(100),
  date: z.string().datetime({ offset: true }),
  durationMinutes: z.number().int().min(1).max(1440),
  intensity: z.enum(['low', 'moderate', 'high']).nullable().optional(),
  activityId: z.string().trim().min(1).max(60).nullable().optional(),
  distanceKm: z.number().min(0).max(10000).nullable().optional(),
  notes: z.string().trim().max(2000).default(''),
  exercises: z.array(z.object({
    name: z.string().trim().min(1).max(80),
    sets: z.number().int().min(1).max(30),
    reps: z.number().int().min(1).max(500),
    weightKg: z.number().min(0).max(1000).nullable().default(null),
    weightUnit: z.enum(['kg', 'lb']).default('kg'),
    durationSeconds: z.number().int().min(0).max(86400).nullable().default(null),
  }).strict()).max(40).default([]),
}).strict()

const asyncRoute: (handler: RequestHandler) => RequestHandler = (handler) => (request, response, next) => {
  Promise.resolve(handler(request, response, next)).catch(next)
}

export function createWorkoutRouter() {
  const router = Router()

  // The curated master catalog is public reference data; workout records remain protected below.
  router.get('/activities', (_request, response) => {
    response.setHeader('Cache-Control', 'public, max-age=3600')
    response.status(200).json({ activities: activityCatalog })
  })

  router.use(requireCsrf, requireAuth)

  const withCalories = async (data: z.infer<typeof workoutInput>, userId: string) => {
    const selected = data.activityId ? activityById.get(data.activityId) : undefined
    if (data.activityId && !selected) return null

    const [user, latestWeight] = await Promise.all([
      User.findById(userId).select('profile.age profile.weightKg').lean(),
      DailyMetricLog.findOne({ userId, kind: 'weight' }).sort({ date: -1 }).select('value').lean(),
    ])
    const bodyWeightKg = latestWeight?.value ?? user?.profile?.weightKg ?? null
    // The selected Compendium edition is the adult 19–59 reference set.
    const canEstimate = Boolean(selected && bodyWeightKg && user?.profile?.age && user.profile.age >= 19 && user.profile.age <= 59)
    const calorieEstimate = canEstimate
      ? Math.round((selected!.met * 3.5 * bodyWeightKg! / 200 * data.durationMinutes) * 10) / 10
      : null
    const activeCalorieEstimate = canEstimate
      ? Math.round((Math.max(0, selected!.met - 1) * 3.5 * bodyWeightKg! / 200 * data.durationMinutes) * 10) / 10
      : null
    return {
      ...data,
      activityId: selected?.id ?? null,
      distanceKm: data.distanceKm ?? null,
      speedKph: selected?.speedKph ?? null,
      activityMet: selected?.met ?? null,
      activityCategory: selected?.category ?? null,
      activityIntensity: selected?.intensity ?? null,
      activityMeasurementType: selected?.measurementType ?? null,
      activityName: selected?.name ?? null,
      activitySourceCode: selected?.sourceCode ?? null,
      activitySource: selected?.source ?? null,
      activitySourceUrl: selected?.sourceUrl ?? null,
      calorieEstimate,
      activeCalorieEstimate,
      calorieCalculationWeightKg: calorieEstimate === null ? null : bodyWeightKg,
      calorieFormulaVersion: calorieEstimate === null ? null : 'MET-3.5-v1',
    }
  }

  router.get('/', asyncRoute(async (request, response) => {
    const limit = Math.min(Number(request.query.limit) || 50, 100)
    const workouts = await WorkoutLog.find({ userId: request.authUser?.id }).sort({ date: -1 }).limit(limit).lean()
    response.status(200).json({ workouts })
  }))

  router.post('/', asyncRoute(async (request, response) => {
    const parsed = workoutInput.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Check the workout details and try again.' } })
      return
    }
    const input = await withCalories(parsed.data, request.authUser!.id)
    if (!input) {
      response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Choose an activity from the supported activity list.' } })
      return
    }
    const workout = await WorkoutLog.create({ ...input, date: new Date(parsed.data.date), userId: request.authUser?.id })
    response.status(201).json({ workout })
  }))

  router.patch('/:id', asyncRoute(async (request, response) => {
    if (!mongoose.isValidObjectId(request.params.id)) {
      response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'That workout record is invalid.' } })
      return
    }
    const parsed = workoutInput.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Check the workout details and try again.' } })
      return
    }
    const input = await withCalories(parsed.data, request.authUser!.id)
    if (!input) {
      response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Choose an activity from the supported activity list.' } })
      return
    }
    const workout = await WorkoutLog.findOneAndUpdate(
      { _id: request.params.id, userId: request.authUser?.id },
      { $set: { ...input, date: new Date(parsed.data.date) } },
      { new: true, runValidators: true },
    ).lean()
    if (!workout) {
      response.status(404).json({ error: { code: 'NOT_FOUND', message: 'That workout could not be found.' } })
      return
    }
    response.status(200).json({ workout })
  }))

  router.delete('/:id', asyncRoute(async (request, response) => {
    if (!mongoose.isValidObjectId(request.params.id)) {
      response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'That workout record is invalid.' } })
      return
    }
    const result = await WorkoutLog.deleteOne({ _id: request.params.id, userId: request.authUser?.id })
    if (result.deletedCount !== 1) {
      response.status(404).json({ error: { code: 'NOT_FOUND', message: 'That workout could not be found.' } })
      return
    }
    response.status(204).end()
  }))

  return router
}
