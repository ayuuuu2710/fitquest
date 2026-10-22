import mongoose from 'mongoose'

export async function connectDatabase(uri: string): Promise<boolean> {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
    return true
  } catch {
    console.error('MongoDB connection failed. The API is running but not ready.')
    return false
  }
}
