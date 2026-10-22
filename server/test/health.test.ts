import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createServer } from 'node:http'
import { after, before, test } from 'node:test'
import { createApp } from '../src/app.js'

const server = createServer(createApp())
let baseUrl = ''

before(async () => {
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  baseUrl = `http://127.0.0.1:${address.port}`
})

after(async () => {
  server.close()
  await once(server, 'close')
})

test('live health check returns a request id without exposing configuration', async () => {
  const response = await fetch(`${baseUrl}/api/v1/health/live`)
  const body = await response.json() as { status: string; requestId: string }

  assert.equal(response.status, 200)
  assert.equal(body.status, 'ok')
  assert.ok(body.requestId)
  assert.equal(response.headers.get('x-powered-by'), null)
  assert.equal(response.headers.get('x-request-id'), body.requestId)
})

test('readiness stays unavailable until a database connection is configured and live', async () => {
  const response = await fetch(`${baseUrl}/api/v1/health/ready`)
  const body = await response.json() as { status: string; error: { code: string; message: string } }

  assert.equal(response.status, 503)
  assert.equal(body.status, 'not_ready')
  assert.equal(body.error.code, 'SERVICE_NOT_READY')
  assert.doesNotMatch(JSON.stringify(body), /mongodb|uri|password|secret|stack/i)
})

test('state changing auth requests require same-origin CSRF protection', async () => {
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'http://localhost:5173' },
    body: JSON.stringify({ email: 'member@example.com', password: 'correct horse battery staple' }),
  })
  const body = await response.json() as { error: { code: string } }
  assert.equal(response.status, 403)
  assert.equal(body.error.code, 'CSRF_REJECTED')
})

test('auth input is validated before attempting database access', async () => {
  const csrfResponse = await fetch(`${baseUrl}/api/v1/auth/csrf`)
  const csrf = await csrfResponse.json() as { csrfToken: string }
  const cookie = csrfResponse.headers.get('set-cookie')?.split(';')[0]
  assert.ok(cookie)

  const response = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'http://localhost:5173',
      cookie,
      'x-csrf-token': csrf.csrfToken,
    },
    body: JSON.stringify({ email: 'not-an-email', password: 'short', displayName: '' }),
  })
  const body = await response.json() as { error: { code: string } }
  assert.equal(response.status, 400)
  assert.equal(body.error.code, 'VALIDATION_ERROR')
})

test('workout mutations are protected by CSRF middleware', async () => {
  const response = await fetch(`${baseUrl}/api/v1/workouts`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'http://localhost:5173' },
    body: JSON.stringify({ title: 'Strength', date: new Date().toISOString(), durationMinutes: 45 }),
  })
  const body = await response.json() as { error: { code: string } }
  assert.equal(response.status, 403)
  assert.equal(body.error.code, 'CSRF_REJECTED')
})
