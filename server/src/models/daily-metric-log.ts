import { model, Schema, type InferSchemaType } from 'mongoose'

const dailyMetricLogSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  kind: { type: String, enum: ['water', 'weight'], required: true },
  value: { type: Number, required: true, min: 0 },
  date: { type: Date, required: true, index: true },
  notes: { type: String, trim: true, maxlength: 500, default: '' },
}, { timestamps: true })

dailyMetricLogSchema.index({ userId: 1, kind: 1, date: -1 })

export type DailyMetricLogDocument = InferSchemaType<typeof dailyMetricLogSchema>
export const DailyMetricLog = model('DailyMetricLog', dailyMetricLogSchema)
