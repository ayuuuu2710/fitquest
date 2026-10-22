import cors from 'cors'
import express, { type ErrorRequestHandler } from 'express'
import helmet from 'helmet'
import mongoose from 'mongoose'
import { randomUUID } from 'node:crypto'
import { config } from './config.js'
import { createAuthRouter } from './auth-routes.js'
import { createWorkoutRouter } from './workout-routes.js'

export function createApp() {
  const app = express()

  app.disable('x-powered-by')
  app.set('trust proxy', config.nodeEnv === 'production' ? 1 : false)
  app.use(helmet())
  app.use(cors({ origin: config.clientOrigin, credentials: true }))
  app.use((request, response, next) => {
    const requestId = randomUUID()
    response.locals.requestId = requestId
    response.setHeader('X-Request-Id', requestId)
    next()
  })
  app.use(express.json({ limit: '1mb' }))
  app.use('/api/v1/auth', createAuthRouter())
  app.use('/api/v1/workouts', createWorkoutRouter())

  app.get('/api/v1/health/live', (_request, response) => {
    response.status(200).json({ status: 'ok', requestId: response.locals.requestId })
  })

  app.get('/api/v1/health/ready', (_request, response) => {
    if (!config.mongoUri || mongoose.connection.readyState !== 1) {
      response.status(503).json({
        status: 'not_ready',
        error: { code: 'SERVICE_NOT_READY', message: 'The service is not ready yet.', requestId: response.locals.requestId },
      })
      return
    }

    response.status(200).json({ status: 'ready', requestId: response.locals.requestId })
  })

  app.use((_request, response) => {
    response.status(404).json({
      error: { code: 'NOT_FOUND', message: 'The requested resource was not found.', requestId: response.locals.requestId },
    })
  })

  const handleError: ErrorRequestHandler = (_error, _request, response, _next) => {
    response.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.', requestId: response.locals.requestId },
    })
  }
  app.use(handleError)

  return app
}
