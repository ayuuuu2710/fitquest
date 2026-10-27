import { Router, type RequestHandler } from 'express'
import mongoose from 'mongoose'
import { z } from 'zod'
import rateLimit from 'express-rate-limit'
import { requireAuth, requireCsrf } from './auth-middleware.js'
import { MealLog } from './models/meal-log.js'
import { SavedFood } from './models/saved-food.js'
import { calculateFoodNutrition, foodCatalog, getFoodById, getFoodNutritionPer100g, getFoodServingGrams } from './data/food-catalog.js'
import { calculateRecipe, recipeCatalog } from './data/recipe-catalog.js'
import { getOpenFoodFact, searchOpenFoodFacts, searchUsdaFoods, type FoodCandidate, type NutritionValues } from './data/food-providers.js'

const foodNutritionSchema = z.object({ calories: z.number().min(0).max(1000), proteinGrams: z.number().min(0).max(100), carbsGrams: z.number().min(0).max(100), fatGrams: z.number().min(0).max(100), fiberGrams: z.number().min(0).max(100).nullable().optional(), sugarGrams: z.number().min(0).max(100).nullable().optional(), sodiumMg: z.number().min(0).max(100000).nullable().optional() }).strict()

const mealInput = z.object({
  foodId: z.string().trim().min(1).max(120).optional(),
  foodName: z.string().trim().min(1).max(100).optional(),
  source: z.enum(['starter-estimate', 'USDA FoodData Central', 'Open Food Facts', 'internal-recipe-estimate', 'user-entered']).optional(),
  referenceId: z.string().trim().max(100).nullable().optional(),
  quantityGrams: z.number().min(0.1).max(100000).optional(),
  nutritionPer100g: foodNutritionSchema.optional(),
  mealType: z.enum(['Breakfast', 'Lunch', 'Dinner', 'Snack']),
  servings: z.number().min(0.01).max(1000).optional(),
  servingLabel: z.string().trim().min(1).max(60).optional(),
  isNutritionEdited: z.boolean().optional(),
  date: z.string().datetime({ offset: true }),
}).strict().refine((value) => Boolean(value.foodId || value.foodName) && Boolean(value.quantityGrams || value.servings), 'Food name and quantity are required.')

const favoriteInput = z.object({ name: z.string().trim().min(1).max(100), category: z.string().trim().max(60).default('Custom'), source: z.enum(['starter-estimate', 'USDA FoodData Central', 'Open Food Facts', 'internal-recipe-estimate', 'user-entered']), referenceId: z.string().max(100).nullable().optional(), serving: z.string().max(60).default('100 g'), servingGrams: z.number().positive().max(100000).default(100), nutritionPer100g: foodNutritionSchema }).strict()

const asyncRoute: (handler: RequestHandler) => RequestHandler = (handler) => (request, response, next) => {
  Promise.resolve(handler(request, response, next)).catch(next)
}

export function createMealRouter() {
  const router = Router()
  const providerLimiter = rateLimit({ windowMs: 60_000, limit: 8, standardHeaders: true, legacyHeaders: false })
  router.use(requireCsrf, requireAuth)

  const staticFoods: FoodCandidate[] = foodCatalog.map((food) => ({
    id: food.id, name: food.name, category: food.category, source: food.source, referenceId: food.id, serving: food.serving,
    servingGrams: getFoodServingGrams(food), nutritionPer100g: getFoodNutritionPer100g(food) ?? { calories: 0, proteinGrams: 0, carbsGrams: 0, fatGrams: 0 },
  }))
  const recipes = recipeCatalog.map((recipe) => {
    const calculated = calculateRecipe(recipe)
    return { id: 'recipe:' + recipe.id, name: recipe.name, category: 'Homemade Indian meal', source: recipe.source, referenceId: recipe.id, serving: '100 g cooked', servingGrams: 100, nutritionPer100g: calculated.nutritionPer100g, ingredients: recipe.ingredients.map((item) => `${item.name} ${item.grams} g`), cookingMethod: recipe.cookingMethod }
  })

  router.get('/catalog', asyncRoute(async (request, response) => {
    const custom = await SavedFood.find({ userId: request.authUser?.id, kind: { $in: ['custom', 'recipe'] } }).sort({ updatedAt: -1 }).limit(200).lean()
    const saved = custom.map((food) => ({ id: 'saved:' + food._id.toString(), name: food.name, category: food.category, source: food.source, referenceId: food.referenceId, serving: food.serving, servingGrams: food.servingGrams, nutritionPer100g: food.nutritionPer100g as NutritionValues, ingredients: (food.ingredients as Array<{ name?: string; grams?: number }>).map((item) => `${item.name ?? 'Ingredient'} ${item.grams ?? ''} g`), cookingMethod: food.cookingMethod }))
    response.status(200).json({ foods: [...staticFoods, ...recipes, ...saved], favoritesAvailable: true, usdaAvailable: Boolean(process.env.USDA_API_KEY) })
  }))

  router.get('/search', providerLimiter, asyncRoute(async (request, response) => {
    const query = z.string().trim().min(2).max(80).safeParse(request.query.q)
    const source = z.enum(['usda', 'packaged']).safeParse(request.query.source)
    if (!query.success || !source.success) {
      response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Enter a food name and choose a food source.' } }); return
    }
    try {
      const foods = source.data === 'usda' ? await searchUsdaFoods(query.data) : await searchOpenFoodFacts(query.data)
      response.status(200).json({ foods, available: source.data === 'packaged' || Boolean(process.env.USDA_API_KEY), source: source.data })
    } catch {
      response.status(200).json({ foods: [], available: false, error: 'Food database search is temporarily unavailable.' })
    }
  }))

  router.get('/barcode/:code', providerLimiter, asyncRoute(async (request, response) => {
    if (!/^\\d{8,14}$/.test(request.params.code)) { response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Enter a valid product barcode.' } }); return }
    try {
      const food = await getOpenFoodFact(request.params.code)
      response.status(food ? 200 : 404).json(food ? { food } : { error: { code: 'FOOD_NOT_FOUND', message: 'No packaged food matched that barcode.' } })
    } catch { response.status(503).json({ error: { code: 'FOOD_SOURCE_UNAVAILABLE', message: 'Packaged food search is temporarily unavailable.' } }) }
  }))

  router.get('/favorites', asyncRoute(async (request, response) => {
    const favorites = await SavedFood.find({ userId: request.authUser?.id, kind: 'favorite' }).sort({ updatedAt: -1 }).limit(200).lean()
    response.status(200).json({ favorites })
  }))

  router.post('/favorites', asyncRoute(async (request, response) => {
    const parsed = favoriteInput.safeParse(request.body)
    if (!parsed.success) { response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Check the favorite food details.' } }); return }
    const favorite = await SavedFood.findOneAndUpdate({ userId: request.authUser?.id, kind: 'favorite', name: parsed.data.name }, { $set: { ...parsed.data, kind: 'favorite', userId: request.authUser?.id } }, { new: true, upsert: true, runValidators: true }).lean()
    response.status(201).json({ favorite })
  }))

  router.delete('/favorites/:id', asyncRoute(async (request, response) => {
    if (!mongoose.isValidObjectId(request.params.id)) { response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'That saved food is invalid.' } }); return }
    const result = await SavedFood.deleteOne({ _id: request.params.id, userId: request.authUser?.id, kind: 'favorite' })
    if (!result.deletedCount) { response.status(404).json({ error: { code: 'NOT_FOUND', message: 'That favorite could not be found.' } }); return }
    response.status(204).end()
  }))

  router.get('/custom-foods', asyncRoute(async (request, response) => {
    const foods = await SavedFood.find({ userId: request.authUser?.id, kind: { $in: ['custom', 'recipe'] } }).sort({ updatedAt: -1 }).limit(200).lean()
    response.status(200).json({ foods })
  }))

  router.post('/custom-foods', asyncRoute(async (request, response) => {
    const parsed = favoriteInput.safeParse(request.body)
    if (!parsed.success) { response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Check the custom food details.' } }); return }
    const food = await SavedFood.create({ ...parsed.data, kind: 'custom', source: 'user-entered', userId: request.authUser?.id })
    response.status(201).json({ food })
  }))

  router.post('/recipes', asyncRoute(async (request, response) => {
    const ingredientSchema = z.object({ name: z.string().trim().min(1).max(100), grams: z.number().positive().max(100000), nutritionPer100g: foodNutritionSchema }).strict()
    const parsed = z.object({ name: z.string().trim().min(1).max(100), cookedWeightGrams: z.number().positive().max(100000), cookingMethod: z.string().trim().max(1000).default(''), ingredients: z.array(ingredientSchema).min(1).max(40) }).strict().safeParse(request.body)
    if (!parsed.success) { response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Add a recipe name, cooked weight, and at least one ingredient.' } }); return }
    const totals = parsed.data.ingredients.reduce((sum, item) => ({ calories: sum.calories + item.nutritionPer100g.calories * item.grams / 100, proteinGrams: sum.proteinGrams + item.nutritionPer100g.proteinGrams * item.grams / 100, carbsGrams: sum.carbsGrams + item.nutritionPer100g.carbsGrams * item.grams / 100, fatGrams: sum.fatGrams + item.nutritionPer100g.fatGrams * item.grams / 100 }), { calories: 0, proteinGrams: 0, carbsGrams: 0, fatGrams: 0 })
    const nutritionPer100g = Object.fromEntries(Object.entries(totals).map(([key, value]) => [key, Math.round(value / parsed.data.cookedWeightGrams * 1000) / 10]))
    const recipe = await SavedFood.create({ name: parsed.data.name, category: 'Homemade recipe', kind: 'recipe', source: 'internal-recipe-estimate', serving: '100 g cooked', servingGrams: 100, nutritionPer100g, ingredients: parsed.data.ingredients, cookingMethod: parsed.data.cookingMethod, userId: request.authUser?.id })
    response.status(201).json({ recipe })
  }))

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
    let foodName = parsed.data.foodName ?? ''
    let foodId = parsed.data.foodId ?? ''
    let source = parsed.data.source ?? 'user-entered'
    let referenceId = parsed.data.referenceId ?? null
    let servingGrams = 100
    let servingLabel = parsed.data.servingLabel ?? '100 g'
    let nutritionPer100g = parsed.data.nutritionPer100g
    const food = parsed.data.foodId ? getFoodById(parsed.data.foodId) : undefined
    const recipe = parsed.data.foodId?.startsWith('recipe:') ? recipeCatalog.find((item) => item.id === parsed.data.foodId?.slice(7)) : undefined
    if (food) {
      foodName = food.name; source = food.source; referenceId = food.id; servingGrams = getFoodServingGrams(food); servingLabel = food.serving
      nutritionPer100g = getFoodNutritionPer100g(food) ?? undefined
    } else if (recipe) {
      const calculated = calculateRecipe(recipe)
      foodName = recipe.name; source = recipe.source; referenceId = recipe.id; servingGrams = 100; servingLabel = 'g cooked'; nutritionPer100g = calculated.nutritionPer100g
    } else if (!nutritionPer100g || !foodName) {
      response.status(400).json({ error: { code: 'FOOD_NOT_FOUND', message: 'Choose a food from the list or enter its nutrition details.' } }); return
    }
    const quantityGrams = parsed.data.quantityGrams ?? (parsed.data.servings ?? 1) * servingGrams
    const legacyNutrition = food && parsed.data.quantityGrams === undefined ? calculateFoodNutrition(food, parsed.data.servings ?? 1) : null
    const nutrition: NutritionValues = legacyNutrition ?? {
      calories: nutritionPer100g!.calories * quantityGrams / 100,
      proteinGrams: nutritionPer100g!.proteinGrams * quantityGrams / 100,
      carbsGrams: nutritionPer100g!.carbsGrams * quantityGrams / 100,
      fatGrams: nutritionPer100g!.fatGrams * quantityGrams / 100,
      fiberGrams: nutritionPer100g!.fiberGrams == null ? null : nutritionPer100g!.fiberGrams * quantityGrams / 100,
      sugarGrams: nutritionPer100g!.sugarGrams == null ? null : nutritionPer100g!.sugarGrams * quantityGrams / 100,
      sodiumMg: nutritionPer100g!.sodiumMg == null ? null : nutritionPer100g!.sodiumMg * quantityGrams / 100,
    }
    const rounded = Object.fromEntries(Object.entries(nutrition).map(([key, value]) => [key, value == null ? null : Math.round(value * 10) / 10]))
    const servings = Math.round(quantityGrams / servingGrams * 100) / 100
    const meal = await MealLog.create({
      foodId,
      foodName,
      mealType: parsed.data.mealType,
      servings: Math.max(0.01, servings),
      servingLabel: parsed.data.quantityGrams === undefined ? `${parsed.data.servings ?? 1} × ${servingLabel}` : `${quantityGrams} g`,
      quantityGrams,
      nutritionPer100g,
      nutritionReferenceId: referenceId,
      isNutritionEdited: parsed.data.isNutritionEdited ?? false,
      ...rounded,
      nutritionSource: source,
      date: new Date(parsed.data.date),
      userId: request.authUser?.id,
    })
    response.status(201).json({ meal })
  }))

  router.patch('/:id', asyncRoute(async (request, response) => {
    if (!mongoose.isValidObjectId(request.params.id)) { response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'That meal record is invalid.' } }); return }
    const patch = z.object({ mealType: z.enum(['Breakfast', 'Lunch', 'Dinner', 'Snack']).optional(), quantityGrams: z.number().min(0.1).max(100000).optional() }).strict().safeParse(request.body)
    if (!patch.success || Object.keys(patch.data ?? {}).length === 0) { response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Choose a meal category or serving quantity to update.' } }); return }
    const meal = await MealLog.findOne({ _id: request.params.id, userId: request.authUser?.id })
    if (!meal) { response.status(404).json({ error: { code: 'NOT_FOUND', message: 'That meal could not be found.' } }); return }
    if (patch.data.mealType) meal.mealType = patch.data.mealType
    if (patch.data.quantityGrams !== undefined) {
      if (!meal.nutritionPer100g) { response.status(400).json({ error: { code: 'RECALCULATION_UNAVAILABLE', message: 'This older entry does not have per-100-gram values. Log it again to change its quantity.' } }); return }
      const per100 = meal.nutritionPer100g as NutritionValues
      const grams = patch.data.quantityGrams
      meal.quantityGrams = grams; meal.servings = Math.max(0.01, grams / 100); meal.servingLabel = `${grams} g`
      meal.calories = Math.round(per100.calories * grams / 100 * 10) / 10
      meal.proteinGrams = Math.round(per100.proteinGrams * grams / 100 * 10) / 10
      meal.carbsGrams = Math.round(per100.carbsGrams * grams / 100 * 10) / 10
      meal.fatGrams = Math.round(per100.fatGrams * grams / 100 * 10) / 10
      meal.fiberGrams = per100.fiberGrams == null ? null : Math.round(per100.fiberGrams * grams / 100 * 10) / 10
      meal.sugarGrams = per100.sugarGrams == null ? null : Math.round(per100.sugarGrams * grams / 100 * 10) / 10
      meal.sodiumMg = per100.sodiumMg == null ? null : Math.round(per100.sodiumMg * grams / 100 * 10) / 10
    }
    await meal.save(); response.status(200).json({ meal })
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
