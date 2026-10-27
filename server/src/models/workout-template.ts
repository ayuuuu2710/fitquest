import { model, Schema, type InferSchemaType } from 'mongoose'

const exerciseSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  sets: { type: Number, required: true, min: 1, max: 30 },
  reps: { type: Number, required: true, min: 1, max: 500 },
  weightKg: { type: Number, min: 0, max: 1000, default: null },
  weightUnit: { type: String, enum: ['kg', 'lb'], default: 'kg' },
  durationSeconds: { type: Number, min: 0, max: 86400, default: null },
}, { _id: false })

const workoutTemplateSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 100 },
  durationMinutes: { type: Number, required: true, min: 1, max: 1440, default: 30 },
  intensity: { type: String, enum: ['low', 'moderate', 'high', null], default: null },
  activityId: { type: String, trim: true, maxlength: 60, default: null },
  distanceKm: { type: Number, min: 0, max: 10000, default: null },
  exercises: { type: [exerciseSchema], default: [] },
}, { timestamps: true })

workoutTemplateSchema.index({ userId: 1, updatedAt: -1 })

export type WorkoutTemplateDocument = InferSchemaType<typeof workoutTemplateSchema>
export const WorkoutTemplate = model('WorkoutTemplate', workoutTemplateSchema)
