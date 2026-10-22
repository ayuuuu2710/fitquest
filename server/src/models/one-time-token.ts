import { model, Schema, type InferSchemaType } from 'mongoose'

const oneTimeTokenSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  purpose: { type: String, enum: ['verify-email', 'password-reset'], required: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
}, { timestamps: true })

oneTimeTokenSchema.index({ userId: 1, purpose: 1 })

export type OneTimeTokenDocument = InferSchemaType<typeof oneTimeTokenSchema>
export const OneTimeToken = model('OneTimeToken', oneTimeTokenSchema)
