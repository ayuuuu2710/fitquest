import { Router, type RequestHandler } from 'express'
import mongoose from 'mongoose'
import { z } from 'zod'
import { requireAuth, requireCsrf } from './auth-middleware.js'
import { WorkoutTemplate } from './models/workout-template.js'

const templateInput = z.object({
  title: z.string().trim().min(1).max(100),
  durationMinutes: z.number().int().min(1).max(1440),
  intensity: z.enum(['low', 'moderate', 'high']).nullable().optional(),
  activityId: z.string().trim().min(1).max(60).nullable().optional(),
  distanceKm: z.number().min(0).max(10000).nullable().optional(),
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

export function createWorkoutTemplateRouter() {
  const router = Router()
  router.use(requireCsrf, requireAuth)

  router.get('/', asyncRoute(async (request, response) => {
    const templates = await WorkoutTemplate.find({ userId: request.authUser?.id }).sort({ updatedAt: -1 }).limit(100).lean()
    response.status(200).json({ templates })
  }))

  router.post('/', asyncRoute(async (request, response) => {
    const parsed = templateInput.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Check the template details and try again.' } })
      return
    }
    const template = await WorkoutTemplate.create({ ...parsed.data, userId: request.authUser?.id })
    response.status(201).json({ template })
  }))

  router.patch('/:id', asyncRoute(async (request, response) => {
    if (!mongoose.isValidObjectId(request.params.id)) {
      response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'That template is invalid.' } })
      return
    }
    const parsed = templateInput.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Check the template details and try again.' } })
      return
    }
    const template = await WorkoutTemplate.findOneAndUpdate(
      { _id: request.params.id, userId: request.authUser?.id },
      { $set: parsed.data },
      { new: true, runValidators: true },
    ).lean()
    if (!template) {
      response.status(404).json({ error: { code: 'NOT_FOUND', message: 'That template could not be found.' } })
      return
    }
    response.status(200).json({ template })
  }))

  router.delete('/:id', asyncRoute(async (request, response) => {
    if (!mongoose.isValidObjectId(request.params.id)) {
      response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'That template is invalid.' } })
      return
    }
    const result = await WorkoutTemplate.deleteOne({ _id: request.params.id, userId: request.authUser?.id })
    if (result.deletedCount !== 1) {
      response.status(404).json({ error: { code: 'NOT_FOUND', message: 'That template could not be found.' } })
      return
    }
    response.status(204).end()
  }))

  return router
}
