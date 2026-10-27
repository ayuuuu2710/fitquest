import { model, Schema, type InferSchemaType } from 'mongoose'

const mealLogSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  foodId: { type: String, trim: true, maxlength: 80 },
  foodName: { type: String, required: true, trim: true, maxlength: 100 },
  mealType: { type: String, enum: ['Breakfast', 'Lunch', 'Dinner', 'Snack'], required: true },
  servings: { type: Number, required: true, min: 0.01, max: 1000 },
  servingLabel: { type: String, required: true, trim: true, maxlength: 40 },
  calories: { type: Number, required: true, min: 0, max: 100000 },
  proteinGrams: { type: Number, required: true, min: 0, max: 10000 },
  carbsGrams: { type: Number, required: true, min: 0, max: 10000 },
  fatGrams: { type: Number, required: true, min: 0, max: 10000 },
  fiberGrams: { type: Number, min: 0, max: 1000, default: null },
  sugarGrams: { type: Number, min: 0, max: 1000, default: null },
  sodiumMg: { type: Number, min: 0, max: 100000, default: null },
  micronutrients: { type: Map, of: Number, default: undefined },
  quantityGrams: { type: Number, min: 0.1, max: 100000, default: null },
  nutritionPer100g: { type: Schema.Types.Mixed, default: undefined },
  nutritionReferenceId: { type: String, trim: true, maxlength: 100, default: null },
  isNutritionEdited: { type: Boolean, default: false },
  nutritionSource: { type: String, enum: ['starter-estimate', 'USDA FoodData Central', 'Open Food Facts', 'internal-recipe-estimate', 'user-entered'] },
  date: { type: Date, required: true, index: true },
}, { timestamps: true })

mealLogSchema.index({ userId: 1, date: -1 })

export type MealLogDocument = InferSchemaType<typeof mealLogSchema>
export const MealLog = model('MealLog', mealLogSchema)
