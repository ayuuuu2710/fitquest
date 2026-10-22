import { Router, type RequestHandler } from 'express'
import mongoose from 'mongoose'
import { z } from 'zod'
import { requireAuth, requireCsrf } from './auth-middleware.js'
import { MealLog } from './models/meal-log.js'

const mealInput = z.object({
  foodName: z.string().trim().min(1).max(100),
  mealType: z.enum(['Breakfast', 'Lunch', 'Dinner', 'Snack']),
  servings: z.number().min(0.25).max(20),
  servingLabel: z.string().trim().min(1).max(40),
  calories: z.number().min(0).max(10000),
  proteinGrams: z.number().min(0).max(1000),
  carbsGrams: z.number().min(0).max(1000),
  fatGrams: z.number().min(0).max(1000),
  date: z.string().datetime({ offset: true }),
}).strict()

const asyncRoute: (handler: RequestHandler) => RequestHandler = (handler) => (request, response, next) => {
  Promise.resolve(handler(request, response, next)).catch(next)
}

export function createMealRouter() {
  const router = Router()
  router.use(requireCsrf, requireAuth)

  router.get('/', asyncRoute(async (request, response) => {
    const limit = Math.min(Number(request.query.limit) || 100, 200)
    const meals = await MealLog.find({ userId: request.authUser?.id }).sort({ date: -1 }).limit(limit).lean()
    response.status(200).json({ meals })
  }))

  router.post('/', asyncRoute(async (request, response) => {
    const parsed = mealInput.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Check the food and serving details and try again.' } })
      return
    }
    const meal = await MealLog.create({ ...parsed.data, date: new Date(parsed.data.date), userId: request.authUser?.id })
    response.status(201).json({ meal })
  }))

  router.delete('/:id', asyncRoute(async (request, response) => {
    if (!mongoose.isValidObjectId(request.params.id)) {
      response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'That meal record is invalid.' } })
      return
    }
    const result = await MealLog.deleteOne({ _id: request.params.id, userId: request.authUser?.id })
    if (result.deletedCount !== 1) {
      response.status(404).json({ error: { code: 'NOT_FOUND', message: 'That meal could not be found.' } })
      return
    }
    response.status(204).end()
  }))

  return router
}

