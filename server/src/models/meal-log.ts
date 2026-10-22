import { model, Schema, type InferSchemaType } from 'mongoose'

const mealLogSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  foodName: { type: String, required: true, trim: true, maxlength: 100 },
  mealType: { type: String, enum: ['Breakfast', 'Lunch', 'Dinner', 'Snack'], required: true },
  servings: { type: Number, required: true, min: 0.25, max: 20 },
  servingLabel: { type: String, required: true, trim: true, maxlength: 40 },
  calories: { type: Number, required: true, min: 0, max: 10000 },
  proteinGrams: { type: Number, required: true, min: 0, max: 1000 },
  carbsGrams: { type: Number, required: true, min: 0, max: 1000 },
  fatGrams: { type: Number, required: true, min: 0, max: 1000 },
  date: { type: Date, required: true, index: true },
}, { timestamps: true })

mealLogSchema.index({ userId: 1, date: -1 })

export type MealLogDocument = InferSchemaType<typeof mealLogSchema>
export const MealLog = model('MealLog', mealLogSchema)

