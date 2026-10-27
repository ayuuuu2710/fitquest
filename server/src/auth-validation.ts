import { z } from 'zod'

export const strongPasswordSchema = z.string()
  .min(12)
  .max(128)
  .regex(/[A-Z]/, 'Include an uppercase letter.')
  .regex(/[a-z]/, 'Include a lowercase letter.')
  .regex(/[0-9]/, 'Include a number.')
  .regex(/[^A-Za-z0-9]/, 'Include a special character.')
