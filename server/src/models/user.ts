import { model, Schema, type InferSchemaType } from 'mongoose'

const profileSchema = new Schema({
  goals: { type: [String], default: [] },
  experience: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: null },
  availableEquipment: { type: [String], default: [] },
  workoutDaysPerWeek: { type: Number, min: 1, max: 7, default: null },
  minutesPerSession: { type: Number, min: 10, max: 240, default: null },
  dietaryPreferences: { type: [String], default: [] },
  units: { type: String, enum: ['metric', 'imperial'], default: 'metric' },
  timezone: { type: String, default: 'UTC' },
  theme: { type: String, enum: ['dark', 'light', 'system'], default: 'dark' },
}, { _id: false })

const userSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: true, select: false },
  emailVerified: { type: Boolean, default: false },
  displayName: { type: String, required: true, trim: true, maxlength: 60 },
  onboardingComplete: { type: Boolean, default: false },
  profile: { type: profileSchema, default: () => ({}) },
}, { timestamps: true })

export type UserDocument = InferSchemaType<typeof userSchema>
export const User = model('User', userSchema)
