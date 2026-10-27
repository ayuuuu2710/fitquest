import { model, Schema, type InferSchemaType } from 'mongoose'

const profileSchema = new Schema({
  age: { type: Number, min: 13, max: 120, default: null },
  sexForCalculation: { type: String, enum: ['female', 'male', null], default: null },
  heightCm: { type: Number, min: 100, max: 250, default: null },
  weightKg: { type: Number, min: 25, max: 400, default: null },
  goals: { type: [String], default: [] },
  targetWeightKg: { type: Number, min: 25, max: 400, default: null },
  desiredWeeklyChangeKg: { type: Number, min: -1.5, max: 1.5, default: null },
  experience: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: null },
  availableEquipment: { type: [String], default: [] },
  preferredWorkoutDays: { type: [{ type: Number, min: 0, max: 6 }], default: [] },
  preferredWorkoutTypes: { type: [String], default: [] },
  workoutDaysPerWeek: { type: Number, min: 1, max: 7, default: null },
  minutesPerSession: { type: Number, min: 10, max: 240, default: null },
  trainingIntensity: { type: String, enum: ['low', 'moderate', 'high'], default: 'moderate' },
  dietaryPreferences: { type: [String], default: [] },
  allergies: { type: [String], default: [] },
  foodRestrictions: { type: [String], default: [] },
  units: { type: String, enum: ['metric', 'imperial'], default: 'metric' },
  timezone: { type: String, default: 'UTC' },
  theme: { type: String, enum: ['dark', 'light', 'system'], default: 'dark' },
}, { _id: false })

const userSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: true, select: false },
  emailVerified: { type: Boolean, default: true },
  displayName: { type: String, required: true, trim: true, maxlength: 60 },
  onboardingComplete: { type: Boolean, default: false },
  hydrationGoalMl: { type: Number, min: 1, max: 20000, default: null },
  profile: { type: profileSchema, default: () => ({}) },
}, { timestamps: true })

export type UserDocument = InferSchemaType<typeof userSchema>
export const User = model('User', userSchema)
