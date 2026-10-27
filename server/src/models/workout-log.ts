import { model, Schema, type InferSchemaType } from 'mongoose'

const exerciseSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  sets: { type: Number, required: true, min: 1, max: 30 },
  reps: { type: Number, required: true, min: 1, max: 500 },
  weightKg: { type: Number, min: 0, max: 1000, default: null },
  weightUnit: { type: String, enum: ['kg', 'lb'], default: 'kg' },
  durationSeconds: { type: Number, min: 0, max: 86400, default: null },
}, { _id: false })

const workoutLogSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 100 },
  date: { type: Date, required: true, index: true },
  durationMinutes: { type: Number, required: true, min: 1, max: 1440 },
  intensity: { type: String, enum: ['low', 'moderate', 'high', null], default: null },
  activityId: { type: String, trim: true, maxlength: 60, default: null },
  distanceKm: { type: Number, min: 0, max: 10000, default: null },
  speedKph: { type: Number, min: 0, max: 1000, default: null },
  activityMet: { type: Number, min: 0, max: 100, default: null },
  activityCategory: { type: String, trim: true, maxlength: 40, default: null },
  activityIntensity: { type: String, trim: true, maxlength: 30, default: null },
  activityMeasurementType: { type: String, trim: true, maxlength: 40, default: null },
  activityName: { type: String, trim: true, maxlength: 120, default: null },
  activitySourceCode: { type: String, trim: true, maxlength: 20, default: null },
  activitySource: { type: String, trim: true, maxlength: 120, default: null },
  activitySourceUrl: { type: String, trim: true, maxlength: 300, default: null },
  calorieEstimate: { type: Number, min: 0, max: 100000, default: null },
  activeCalorieEstimate: { type: Number, min: 0, max: 100000, default: null },
  calorieCalculationWeightKg: { type: Number, min: 25, max: 400, default: null },
  calorieFormulaVersion: { type: String, trim: true, maxlength: 30, default: null },
  notes: { type: String, trim: true, maxlength: 2000, default: '' },
  exercises: { type: [exerciseSchema], default: [] },
}, { timestamps: true })

workoutLogSchema.index({ userId: 1, date: -1 })

export type WorkoutLogDocument = InferSchemaType<typeof workoutLogSchema>
export const WorkoutLog = model('WorkoutLog', workoutLogSchema)
