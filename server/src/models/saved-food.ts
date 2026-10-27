import { model, Schema, type InferSchemaType } from 'mongoose'

const savedFoodSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  category: { type: String, trim: true, maxlength: 60, default: 'Custom' },
  kind: { type: String, enum: ['custom', 'favorite', 'recipe'], required: true },
  source: { type: String, enum: ['user-entered', 'internal-recipe-estimate', 'USDA FoodData Central', 'Open Food Facts', 'starter-estimate'], required: true },
  referenceId: { type: String, trim: true, maxlength: 100, default: null },
  serving: { type: String, trim: true, maxlength: 60, default: '100 g' },
  servingGrams: { type: Number, min: 0.1, max: 100000, default: 100 },
  nutritionPer100g: { type: Schema.Types.Mixed, required: true },
  ingredients: { type: [Schema.Types.Mixed], default: [] },
  cookingMethod: { type: String, trim: true, maxlength: 1000, default: '' },
}, { timestamps: true })

savedFoodSchema.index({ userId: 1, kind: 1, updatedAt: -1 })
export type SavedFoodDocument = InferSchemaType<typeof savedFoodSchema>
export const SavedFood = model('SavedFood', savedFoodSchema)
