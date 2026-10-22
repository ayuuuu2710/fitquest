import { Router, type RequestHandler } from 'express'
import mongoose from 'mongoose'
import { z } from 'zod'
import { requireAuth, requireCsrf } from './auth-middleware.js'
import { WorkoutLog } from './models/workout-log.js'

const workoutInput = z.object({
  title: z.string().trim().min(1).max(100),
  date: z.string().datetime({ offset: true }),
  durationMinutes: z.number().int().min(1).max(1440),
  notes: z.string().trim().max(2000).default(''),
  exercises: z.array(z.object({
    name: z.string().trim().min(1).max(80),
    sets: z.number().int().min(1).max(30),
    reps: z.number().int().min(1).max(500),
    weightKg: z.number().min(0).max(1000).nullable().default(null),
  }).strict()).max(40).default([]),
}).strict()

const asyncRoute: (handler: RequestHandler) => RequestHandler = (handler) => (request, response, next) => {
  Promise.resolve(handler(request, response, next)).catch(next)
}

export function createWorkoutRouter() {
  const router = Router()
  router.use(requireCsrf, requireAuth)

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
    const workout = await WorkoutLog.create({ ...parsed.data, date: new Date(parsed.data.date), userId: request.authUser?.id })
    response.status(201).json({ workout })
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
