import { model, Schema, type InferSchemaType } from 'mongoose'

const bodyMeasurementSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true, maxlength: 60 },
  valueCm: { type: Number, required: true, min: 1, max: 300 },
  date: { type: Date, required: true },
  notes: { type: String, trim: true, maxlength: 500, default: '' },
}, { timestamps: true })

bodyMeasurementSchema.index({ userId: 1, name: 1, date: -1 })

export type BodyMeasurementDocument = InferSchemaType<typeof bodyMeasurementSchema>
export const BodyMeasurement = model('BodyMeasurement', bodyMeasurementSchema)
