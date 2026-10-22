import { createServer } from 'node:http'
import { createApp } from './app.js'
import { config } from './config.js'
import { connectDatabase } from './database.js'

const app = createApp()
const server = createServer(app)

if (config.mongoUri) {
  void connectDatabase(config.mongoUri)
} else {
  console.warn('MONGODB_URI is not configured. Readiness will remain unavailable.')
}

server.listen(config.port, () => {
  console.info(`FitQuest API listening on port ${config.port}`)
})

function shutdown() {
  server.close(() => {
    void import('mongoose').then(({ default: mongoose }) => mongoose.disconnect()).finally(() => process.exit(0))
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
