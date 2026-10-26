export type FoodItem = {
  id: string
  name: string
  serving: string
  calories: number
  proteinGrams: number
  carbsGrams: number
  fatGrams: number
  category: string
  source: 'starter-estimate'
}

// Starter values are approximate per serving. Keep the source and serving
// attached to every entry so the API can calculate totals consistently.
export const foodCatalog: FoodItem[] = [
  { id: 'apple-medium', name: 'Apple', serving: '1 medium', calories: 95, proteinGrams: 0.5, carbsGrams: 25, fatGrams: 0.3, category: 'Fruit', source: 'starter-estimate' },
  { id: 'banana-medium', name: 'Banana', serving: '1 medium', calories: 105, proteinGrams: 1.3, carbsGrams: 27, fatGrams: 0.4, category: 'Fruit', source: 'starter-estimate' },
  { id: 'blueberries-cup', name: 'Blueberries', serving: '1 cup', calories: 84, proteinGrams: 1.1, carbsGrams: 21, fatGrams: 0.5, category: 'Fruit', source: 'starter-estimate' },
  { id: 'orange-medium', name: 'Orange', serving: '1 medium', calories: 62, proteinGrams: 1.2, carbsGrams: 15, fatGrams: 0.2, category: 'Fruit', source: 'starter-estimate' },
  { id: 'avocado-half', name: 'Avocado', serving: '1/2 fruit', calories: 120, proteinGrams: 1.5, carbsGrams: 6, fatGrams: 11, category: 'Fruit', source: 'starter-estimate' },
  { id: 'oats-cooked-cup', name: 'Oats, cooked', serving: '1 cup', calories: 154, proteinGrams: 6, carbsGrams: 28, fatGrams: 3, category: 'Grains', source: 'starter-estimate' },
  { id: 'brown-rice-cup', name: 'Brown rice, cooked', serving: '1 cup', calories: 216, proteinGrams: 5, carbsGrams: 45, fatGrams: 1.8, category: 'Grains', source: 'starter-estimate' },
  { id: 'white-rice-cup', name: 'White rice, cooked', serving: '1 cup', calories: 205, proteinGrams: 4.3, carbsGrams: 45, fatGrams: 0.4, category: 'Grains', source: 'starter-estimate' },
  { id: 'quinoa-cooked-cup', name: 'Quinoa, cooked', serving: '1 cup', calories: 222, proteinGrams: 8, carbsGrams: 39, fatGrams: 3.6, category: 'Grains', source: 'starter-estimate' },
  { id: 'whole-wheat-bread-slice', name: 'Whole wheat bread', serving: '1 slice', calories: 80, proteinGrams: 4, carbsGrams: 14, fatGrams: 1.1, category: 'Grains', source: 'starter-estimate' },
  { id: 'pasta-cooked-cup', name: 'Pasta, cooked', serving: '1 cup', calories: 221, proteinGrams: 8, carbsGrams: 43, fatGrams: 1.3, category: 'Grains', source: 'starter-estimate' },
  { id: 'egg-large', name: 'Egg', serving: '1 large', calories: 72, proteinGrams: 6.3, carbsGrams: 0.4, fatGrams: 4.8, category: 'Protein', source: 'starter-estimate' },
  { id: 'chicken-breast-100g', name: 'Chicken breast, cooked', serving: '100 g', calories: 165, proteinGrams: 31, carbsGrams: 0, fatGrams: 3.6, category: 'Protein', source: 'starter-estimate' },
  { id: 'salmon-cooked-100g', name: 'Salmon, cooked', serving: '100 g', calories: 206, proteinGrams: 22, carbsGrams: 0, fatGrams: 12, category: 'Protein', source: 'starter-estimate' },
  { id: 'tofu-firm-100g', name: 'Tofu, firm', serving: '100 g', calories: 144, proteinGrams: 17, carbsGrams: 3, fatGrams: 9, category: 'Protein', source: 'starter-estimate' },
  { id: 'lentils-cooked-cup', name: 'Lentils, cooked', serving: '1 cup', calories: 230, proteinGrams: 18, carbsGrams: 40, fatGrams: 0.8, category: 'Protein', source: 'starter-estimate' },
  { id: 'chickpeas-cooked-cup', name: 'Chickpeas, cooked', serving: '1 cup', calories: 269, proteinGrams: 14.5, carbsGrams: 45, fatGrams: 4.2, category: 'Protein', source: 'starter-estimate' },
  { id: 'greek-yogurt-170g', name: 'Greek yogurt, plain', serving: '170 g', calories: 100, proteinGrams: 17, carbsGrams: 6, fatGrams: 0.7, category: 'Dairy', source: 'starter-estimate' },
  { id: 'milk-2pct-cup', name: 'Milk, 2%', serving: '1 cup', calories: 122, proteinGrams: 8, carbsGrams: 12, fatGrams: 5, category: 'Dairy', source: 'starter-estimate' },
  { id: 'cottage-cheese-half-cup', name: 'Cottage cheese', serving: '1/2 cup', calories: 110, proteinGrams: 13, carbsGrams: 5, fatGrams: 5, category: 'Dairy', source: 'starter-estimate' },
  { id: 'almonds-28g', name: 'Almonds', serving: '28 g', calories: 164, proteinGrams: 6, carbsGrams: 6, fatGrams: 14, category: 'Nuts & seeds', source: 'starter-estimate' },
  { id: 'peanut-butter-tbsp', name: 'Peanut butter', serving: '1 tbsp', calories: 94, proteinGrams: 3.5, carbsGrams: 3, fatGrams: 8, category: 'Nuts & seeds', source: 'starter-estimate' },
  { id: 'chia-seeds-tbsp', name: 'Chia seeds', serving: '1 tbsp', calories: 58, proteinGrams: 2, carbsGrams: 5, fatGrams: 3.7, category: 'Nuts & seeds', source: 'starter-estimate' },
  { id: 'broccoli-cooked-cup', name: 'Broccoli, cooked', serving: '1 cup', calories: 55, proteinGrams: 3.7, carbsGrams: 11, fatGrams: 0.6, category: 'Vegetables', source: 'starter-estimate' },
  { id: 'spinach-raw-2cups', name: 'Spinach, raw', serving: '2 cups', calories: 14, proteinGrams: 1.7, carbsGrams: 2.2, fatGrams: 0.2, category: 'Vegetables', source: 'starter-estimate' },
  { id: 'sweet-potato-medium', name: 'Sweet potato, baked', serving: '1 medium', calories: 103, proteinGrams: 2.3, carbsGrams: 24, fatGrams: 0.2, category: 'Vegetables', source: 'starter-estimate' },
  { id: 'salad-greens-2cups', name: 'Mixed salad greens', serving: '2 cups', calories: 20, proteinGrams: 2, carbsGrams: 4, fatGrams: 0.3, category: 'Vegetables', source: 'starter-estimate' },
  { id: 'olive-oil-tsp', name: 'Olive oil', serving: '1 tsp', calories: 40, proteinGrams: 0, carbsGrams: 0, fatGrams: 4.5, category: 'Other', source: 'starter-estimate' },
  { id: 'whey-protein-scoop', name: 'Whey protein powder', serving: '1 scoop', calories: 120, proteinGrams: 24, carbsGrams: 3, fatGrams: 1.5, category: 'Other', source: 'starter-estimate' },
  { id: 'dark-chocolate-20g', name: 'Dark chocolate', serving: '20 g', calories: 120, proteinGrams: 1.6, carbsGrams: 9, fatGrams: 9, category: 'Other', source: 'starter-estimate' },
]

export function getFoodById(id: string): FoodItem | undefined {
  return foodCatalog.find((food) => food.id === id)
}

export function calculateFoodNutrition(food: FoodItem, servings: number) {
  return {
    calories: Math.round(food.calories * servings * 10) / 10,
    proteinGrams: Math.round(food.proteinGrams * servings * 10) / 10,
    carbsGrams: Math.round(food.carbsGrams * servings * 10) / 10,
    fatGrams: Math.round(food.fatGrams * servings * 10) / 10,
  }
}

