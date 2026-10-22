import { model, Schema, type InferSchemaType } from 'mongoose'

const exerciseSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  sets: { type: Number, required: true, min: 1, max: 30 },
  reps: { type: Number, required: true, min: 1, max: 500 },
  weightKg: { type: Number, min: 0, max: 1000, default: null },
}, { _id: false })

const workoutLogSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 100 },
  date: { type: Date, required: true, index: true },
  durationMinutes: { type: Number, required: true, min: 1, max: 1440 },
  notes: { type: String, trim: true, maxlength: 2000, default: '' },
  exercises: { type: [exerciseSchema], default: [] },
}, { timestamps: true })

workoutLogSchema.index({ userId: 1, date: -1 })

export type WorkoutLogDocument = InferSchemaType<typeof workoutLogSchema>
export const WorkoutLog = model('WorkoutLog', workoutLogSchema)
