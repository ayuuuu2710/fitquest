export type FoodItem = {
  name: string
  serving: string
  calories: number
  proteinGrams: number
  carbsGrams: number
  fatGrams: number
  category: string
}

// Nutrition values are estimates per listed serving; users can adjust servings before saving.
export const foodCatalog: FoodItem[] = [
  { name: 'Apple', serving: '1 medium', calories: 95, proteinGrams: 0.5, carbsGrams: 25, fatGrams: 0.3, category: 'Fruit' },
  { name: 'Banana', serving: '1 medium', calories: 105, proteinGrams: 1.3, carbsGrams: 27, fatGrams: 0.4, category: 'Fruit' },
  { name: 'Blueberries', serving: '1 cup', calories: 84, proteinGrams: 1.1, carbsGrams: 21, fatGrams: 0.5, category: 'Fruit' },
  { name: 'Orange', serving: '1 medium', calories: 62, proteinGrams: 1.2, carbsGrams: 15, fatGrams: 0.2, category: 'Fruit' },
  { name: 'Avocado', serving: '1/2 fruit', calories: 120, proteinGrams: 1.5, carbsGrams: 6, fatGrams: 11, category: 'Fruit' },
  { name: 'Oats, cooked', serving: '1 cup', calories: 154, proteinGrams: 6, carbsGrams: 28, fatGrams: 3, category: 'Grains' },
  { name: 'Brown rice, cooked', serving: '1 cup', calories: 216, proteinGrams: 5, carbsGrams: 45, fatGrams: 1.8, category: 'Grains' },
  { name: 'White rice, cooked', serving: '1 cup', calories: 205, proteinGrams: 4.3, carbsGrams: 45, fatGrams: 0.4, category: 'Grains' },
  { name: 'Quinoa, cooked', serving: '1 cup', calories: 222, proteinGrams: 8, carbsGrams: 39, fatGrams: 3.6, category: 'Grains' },
  { name: 'Whole wheat bread', serving: '1 slice', calories: 80, proteinGrams: 4, carbsGrams: 14, fatGrams: 1.1, category: 'Grains' },
  { name: 'Pasta, cooked', serving: '1 cup', calories: 221, proteinGrams: 8, carbsGrams: 43, fatGrams: 1.3, category: 'Grains' },
  { name: 'Egg', serving: '1 large', calories: 72, proteinGrams: 6.3, carbsGrams: 0.4, fatGrams: 4.8, category: 'Protein' },
  { name: 'Chicken breast, cooked', serving: '100 g', calories: 165, proteinGrams: 31, carbsGrams: 0, fatGrams: 3.6, category: 'Protein' },
  { name: 'Salmon, cooked', serving: '100 g', calories: 206, proteinGrams: 22, carbsGrams: 0, fatGrams: 12, category: 'Protein' },
  { name: 'Tofu, firm', serving: '100 g', calories: 144, proteinGrams: 17, carbsGrams: 3, fatGrams: 9, category: 'Protein' },
  { name: 'Lentils, cooked', serving: '1 cup', calories: 230, proteinGrams: 18, carbsGrams: 40, fatGrams: 0.8, category: 'Protein' },
  { name: 'Chickpeas, cooked', serving: '1 cup', calories: 269, proteinGrams: 14.5, carbsGrams: 45, fatGrams: 4.2, category: 'Protein' },
  { name: 'Greek yogurt, plain', serving: '170 g', calories: 100, proteinGrams: 17, carbsGrams: 6, fatGrams: 0.7, category: 'Dairy' },
  { name: 'Milk, 2%', serving: '1 cup', calories: 122, proteinGrams: 8, carbsGrams: 12, fatGrams: 5, category: 'Dairy' },
  { name: 'Cottage cheese', serving: '1/2 cup', calories: 110, proteinGrams: 13, carbsGrams: 5, fatGrams: 5, category: 'Dairy' },
  { name: 'Almonds', serving: '28 g', calories: 164, proteinGrams: 6, carbsGrams: 6, fatGrams: 14, category: 'Nuts & seeds' },
  { name: 'Peanut butter', serving: '1 tbsp', calories: 94, proteinGrams: 3.5, carbsGrams: 3, fatGrams: 8, category: 'Nuts & seeds' },
  { name: 'Chia seeds', serving: '1 tbsp', calories: 58, proteinGrams: 2, carbsGrams: 5, fatGrams: 3.7, category: 'Nuts & seeds' },
  { name: 'Broccoli, cooked', serving: '1 cup', calories: 55, proteinGrams: 3.7, carbsGrams: 11, fatGrams: 0.6, category: 'Vegetables' },
  { name: 'Spinach, raw', serving: '2 cups', calories: 14, proteinGrams: 1.7, carbsGrams: 2.2, fatGrams: 0.2, category: 'Vegetables' },
  { name: 'Sweet potato, baked', serving: '1 medium', calories: 103, proteinGrams: 2.3, carbsGrams: 24, fatGrams: 0.2, category: 'Vegetables' },
  { name: 'Mixed salad greens', serving: '2 cups', calories: 20, proteinGrams: 2, carbsGrams: 4, fatGrams: 0.3, category: 'Vegetables' },
  { name: 'Olive oil', serving: '1 tsp', calories: 40, proteinGrams: 0, carbsGrams: 0, fatGrams: 4.5, category: 'Other' },
  { name: 'Whey protein powder', serving: '1 scoop', calories: 120, proteinGrams: 24, carbsGrams: 3, fatGrams: 1.5, category: 'Other' },
  { name: 'Dark chocolate', serving: '20 g', calories: 120, proteinGrams: 1.6, carbsGrams: 9, fatGrams: 9, category: 'Other' },
]

export const exerciseCatalog = [
  'Air squat', 'Barbell back squat', 'Barbell front squat', 'Goblet squat', 'Leg press', 'Romanian deadlift', 'Deadlift', 'Hip thrust', 'Walking lunge', 'Bulgarian split squat', 'Leg curl', 'Calf raise',
  'Bench press', 'Incline dumbbell press', 'Push-up', 'Dumbbell chest fly', 'Overhead press', 'Lateral raise', 'Arnold press', 'Triceps pushdown', 'Overhead triceps extension', 'Dips',
  'Pull-up', 'Lat pulldown', 'Seated cable row', 'One-arm dumbbell row', 'Barbell row', 'Face pull', 'Bicep curl', 'Hammer curl',
  'Plank', 'Side plank', 'Dead bug', 'Bicycle crunch', 'Hanging knee raise', 'Mountain climber',
  'Treadmill run', 'Outdoor run', 'Cycling', 'Stationary bike', 'Rowing machine', 'Elliptical', 'Jump rope', 'Swimming', 'Yoga', 'Mobility flow', 'Walking', 'Custom exercise',
]

