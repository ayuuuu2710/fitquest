import { Router, type RequestHandler } from 'express'
import mongoose from 'mongoose'
import { z } from 'zod'
import { requireAuth, requireCsrf } from './auth-middleware.js'
import { DailyMetricLog } from './models/daily-metric-log.js'
import { BodyMeasurement } from './models/body-measurement.js'
import { User } from './models/user.js'

const inputSchema = z.object({
  kind: z.enum(['water', 'weight']),
  value: z.number().positive().max(10000),
  date: z.string().datetime({ offset: true }),
  notes: z.string().trim().max(500).optional().default(''),
}).strict()

const updateSchema = z.object({
  value: z.number().positive().max(10000).optional(),
  date: z.string().datetime({ offset: true }).optional(),
  notes: z.string().trim().max(500).optional(),
}).strict().refine((value) => Object.keys(value).length > 0)

const measurementSchema = z.object({ name: z.string().trim().min(1).max(60), valueCm: z.number().positive().max(300), date: z.string().datetime({ offset: true }), notes: z.string().trim().max(500).optional().default('') }).strict()
const measurementUpdateSchema = measurementSchema.partial().strict().refine((value) => Object.keys(value).length > 0)

const asyncRoute: (handler: RequestHandler) => RequestHandler = (handler) => (request, response, next) => {
  Promise.resolve(handler(request, response, next)).catch(next)
}

export function createDailyMetricRouter() {
  const router = Router()
  router.use(requireCsrf, requireAuth)

  router.get('/hydration-goal', asyncRoute(async (request, response) => {
    const user = await User.findById(request.authUser?.id).select('hydrationGoalMl').lean()
    response.status(200).json({ goalMl: user?.hydrationGoalMl ?? null })
  }))

  router.patch('/hydration-goal', asyncRoute(async (request, response) => {
    const parsed = z.object({ goalMl: z.number().int().min(1).max(20000).nullable() }).strict().safeParse(request.body)
    if (!parsed.success) { response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Set a water goal between 1 and 20,000 ml, or leave it blank.' } }); return }
    const user = await User.findByIdAndUpdate(request.authUser?.id, { $set: { hydrationGoalMl: parsed.data.goalMl } }, { new: true, runValidators: true }).select('hydrationGoalMl').lean()
    if (!user) { response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Your account could not be found.' } }); return }
    response.status(200).json({ goalMl: user.hydrationGoalMl ?? null })
  }))

  router.get('/measurements', asyncRoute(async (request, response) => {
    const measurements = await BodyMeasurement.find({ userId: request.authUser?.id }).sort({ date: -1 }).limit(1000).lean()
    response.status(200).json({ measurements })
  }))

  router.post('/measurements', asyncRoute(async (request, response) => {
    const parsed = measurementSchema.safeParse(request.body)
    if (!parsed.success) { response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Check the measurement details and try again.' } }); return }
    const measurement = await BodyMeasurement.create({ ...parsed.data, date: new Date(parsed.data.date), userId: request.authUser?.id })
    response.status(201).json({ measurement })
  }))

  router.patch('/measurements/:id', asyncRoute(async (request, response) => {
    if (!mongoose.isValidObjectId(request.params.id)) { response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'That measurement is invalid.' } }); return }
    const parsed = measurementUpdateSchema.safeParse(request.body)
    if (!parsed.success) { response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Check the measurement details and try again.' } }); return }
    const measurement = await BodyMeasurement.findOneAndUpdate({ _id: request.params.id, userId: request.authUser?.id }, { $set: { ...parsed.data, ...(parsed.data.date ? { date: new Date(parsed.data.date) } : {}) } }, { new: true, runValidators: true })
    if (!measurement) { response.status(404).json({ error: { code: 'NOT_FOUND', message: 'That measurement could not be found.' } }); return }
    response.status(200).json({ measurement })
  }))

  router.delete('/measurements/:id', asyncRoute(async (request, response) => {
    if (!mongoose.isValidObjectId(request.params.id)) { response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'That measurement is invalid.' } }); return }
    const result = await BodyMeasurement.deleteOne({ _id: request.params.id, userId: request.authUser?.id })
    if (result.deletedCount !== 1) { response.status(404).json({ error: { code: 'NOT_FOUND', message: 'That measurement could not be found.' } }); return }
    response.status(204).end()
  }))

  router.get('/', asyncRoute(async (request, response) => {
    const logs = await DailyMetricLog.find({ userId: request.authUser?.id }).sort({ date: -1 }).limit(1000).lean()
    response.status(200).json({ logs })
  }))

  router.post('/', asyncRoute(async (request, response) => {
    const parsed = inputSchema.safeParse(request.body)
    if (!parsed.success || (parsed.success && parsed.data.kind === 'water' && parsed.data.value > 10000) || (parsed.success && parsed.data.kind === 'weight' && parsed.data.value > 400)) {
      response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Check the amount or body weight and try again.' } })
      return
    }
    const log = await DailyMetricLog.create({ ...parsed.data, date: new Date(parsed.data.date), userId: request.authUser?.id })
    response.status(201).json({ log })
  }))

  router.patch('/:id', asyncRoute(async (request, response) => {
    if (!mongoose.isValidObjectId(request.params.id)) {
      response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'That entry is invalid.' } })
      return
    }
    const parsed = updateSchema.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Check the entry details and try again.' } })
      return
    }
    const existing = await DailyMetricLog.findOne({ _id: request.params.id, userId: request.authUser?.id })
    if (!existing) {
      response.status(404).json({ error: { code: 'NOT_FOUND', message: 'That entry could not be found.' } })
      return
    }
    if (parsed.data.value !== undefined && ((existing.kind === 'water' && parsed.data.value > 10000) || (existing.kind === 'weight' && parsed.data.value > 400))) {
      response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Check the amount and try again.' } })
      return
    }
    if (parsed.data.value !== undefined) existing.value = parsed.data.value
    if (parsed.data.date !== undefined) existing.date = new Date(parsed.data.date)
    if (parsed.data.notes !== undefined) existing.notes = parsed.data.notes
    await existing.save()
    response.status(200).json({ log: existing })
  }))

  router.delete('/:id', asyncRoute(async (request, response) => {
    if (!mongoose.isValidObjectId(request.params.id)) {
      response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'That entry is invalid.' } })
      return
    }
    const result = await DailyMetricLog.deleteOne({ _id: request.params.id, userId: request.authUser?.id })
    if (result.deletedCount !== 1) {
      response.status(404).json({ error: { code: 'NOT_FOUND', message: 'That entry could not be found.' } })
      return
    }
    response.status(204).end()
  }))

  return router
}
