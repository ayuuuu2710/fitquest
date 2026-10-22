import { model, Schema, type InferSchemaType } from 'mongoose'

const sessionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  revokedAt: { type: Date, default: null },
}, { timestamps: true })

export type SessionDocument = InferSchemaType<typeof sessionSchema>
export const Session = model('Session', sessionSchema)
