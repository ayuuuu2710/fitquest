import { config } from '../config.js'

export type NutritionValues = { calories: number; proteinGrams: number; carbsGrams: number; fatGrams: number; fiberGrams?: number | null; sugarGrams?: number | null; sodiumMg?: number | null }
export type FoodCandidate = {
  id: string; name: string; category: string; source: 'starter-estimate' | 'USDA FoodData Central' | 'Open Food Facts' | 'internal-recipe-estimate'
  referenceId: string | null; serving: string; servingGrams: number; nutritionPer100g: NutritionValues; ingredients?: string[]; cookingMethod?: string
}

export function getFdcNutrients(nutrients: Array<{ nutrientName?: string; name?: string; value?: number; amount?: number }> = []): NutritionValues {
  const value = (patterns: RegExp[]) => {
    const item = nutrients.find((nutrient) => patterns.some((pattern) => pattern.test(nutrient.nutrientName ?? nutrient.name ?? '')))
    const amount = item?.value ?? item?.amount ?? 0
    return Number.isFinite(amount) ? amount : 0
  }
  return {
    calories: value([/^Energy$/i, /^Energy \(Atwater/i]),
    proteinGrams: value([/^Protein$/i]),
    carbsGrams: value([/^Carbohydrate, by difference$/i, /^Carbohydrate$/i]),
    fatGrams: value([/^Total lipid \(fat\)$/i, /^Total lipid$/i]),
    fiberGrams: value([/^Fiber, total dietary$/i, /^Fiber$/i]),
    sugarGrams: value([/^Sugars, total including NLEA$/i, /^Total Sugars$/i]),
    sodiumMg: value([/^Sodium, Na$/i, /^Sodium$/i]),
  }
}

function candidateFromOff(product: Record<string, any>, sourceId: string): FoodCandidate | null {
  const nutrition = product.nutriments ?? {}
  const calories = Number(nutrition['energy-kcal_100g'] ?? (Number(nutrition['energy_100g']) / 4.184))
  const proteinGrams = Number(nutrition.proteins_100g)
  const carbsGrams = Number(nutrition.carbohydrates_100g)
  const fatGrams = Number(nutrition.fat_100g)
  if (![calories, proteinGrams, carbsGrams, fatGrams].every(Number.isFinite) || calories < 0) return null
  const name = [product.product_name, product.brands].filter(Boolean).join(' · ')
  if (!name || calories === 0 && proteinGrams === 0 && carbsGrams === 0 && fatGrams === 0) return null
  return {
    id: 'off:' + sourceId, name, category: 'Packaged food', source: 'Open Food Facts', referenceId: sourceId,
    serving: product.serving_size || product.quantity || '100 g', servingGrams: 100,
    nutritionPer100g: { calories, proteinGrams, carbsGrams, fatGrams, fiberGrams: Number(nutrition.fiber_100g) || null, sugarGrams: Number(nutrition.sugars_100g) || null, sodiumMg: Number(nutrition.sodium_100g) ? Number(nutrition.sodium_100g) * 1000 : null },
  }
}

export async function searchOpenFoodFacts(query: string): Promise<FoodCandidate[]> {
  const url = new URL('https://world.openfoodfacts.org/cgi/search.pl')
  url.searchParams.set('search_terms', query)
  url.searchParams.set('search_simple', '1'); url.searchParams.set('action', 'process'); url.searchParams.set('json', '1')
  url.searchParams.set('page_size', '12'); url.searchParams.set('fields', 'code,product_name,brands,quantity,serving_size,nutriments')
  const response = await fetch(url, { headers: { 'User-Agent': 'FitQuest/1.0 (food search)' }, signal: AbortSignal.timeout(6000) })
  if (!response.ok) throw new Error('Open Food Facts is temporarily unavailable.')
  const body = await response.json() as { products?: Array<Record<string, any>> }
  return (body.products ?? []).map((product) => candidateFromOff(product, String(product.code ?? ''))).filter((item): item is FoodCandidate => item !== null)
}

export async function getOpenFoodFact(barcode: string): Promise<FoodCandidate | null> {
  const response = await fetch(`https://world.openfoodfacts.org/api/v3/product/${encodeURIComponent(barcode)}.json?fields=code,product_name,brands,quantity,serving_size,nutriments`, { headers: { 'User-Agent': 'FitQuest/1.0 (food search)' }, signal: AbortSignal.timeout(6000) })
  if (!response.ok) throw new Error('Open Food Facts is temporarily unavailable.')
  const body = await response.json() as { status?: number; product?: Record<string, any> }
  return body.status === 1 && body.product ? candidateFromOff(body.product, String(body.product.code ?? barcode)) : null
}

export async function searchUsdaFoods(query: string): Promise<FoodCandidate[]> {
  if (!config.usdaApiKey) return []
  const url = new URL('https://api.nal.usda.gov/fdc/v1/foods/search')
  url.searchParams.set('api_key', config.usdaApiKey)
  url.searchParams.set('query', query); url.searchParams.set('pageSize', '12')
  const response = await fetch(url, { signal: AbortSignal.timeout(6000) })
  if (!response.ok) throw new Error('USDA FoodData Central is temporarily unavailable.')
  const body = await response.json() as { foods?: Array<{ fdcId: number; description: string; dataType?: string; foodNutrients?: Array<{ nutrientName?: string; value?: number }> }> }
  return (body.foods ?? []).map((food) => ({
    id: 'usda:' + food.fdcId, name: food.description, category: food.dataType ?? 'Ingredient', source: 'USDA FoodData Central' as const,
    referenceId: String(food.fdcId), serving: '100 g', servingGrams: 100, nutritionPer100g: getFdcNutrients(food.foodNutrients),
  })).filter((food) => food.nutritionPer100g.calories > 0 || food.nutritionPer100g.proteinGrams > 0 || food.nutritionPer100g.carbsGrams > 0 || food.nutritionPer100g.fatGrams > 0)
}
