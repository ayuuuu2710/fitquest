const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'
let csrfToken: string | undefined

function apiUrl(path: string) {
  return new URL(path.replace(/^\/+/, ''), `${API_BASE_URL.replace(/\/+$/, '')}/`)
}

export async function initializeApi(): Promise<void> {
  const response = await fetch(apiUrl('/api/v1/auth/csrf'), { credentials: 'include', headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error('FitQuest could not connect to the API.')
  const body = await response.json() as { csrfToken?: string }
  if (!body.csrfToken) throw new Error('FitQuest could not start a secure session.')
  csrfToken = body.csrfToken
}

type ApiErrorBody = {
  error?: { code?: string; message?: string; requestId?: string }
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly requestId?: string

  constructor(status: number, body: ApiErrorBody) {
    super(body.error?.message ?? 'The request could not be completed.')
    this.name = 'ApiError'
    this.status = status
    this.code = body.error?.code ?? 'REQUEST_FAILED'
    this.requestId = body.error?.requestId
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase()
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && !csrfToken) await initializeApi()

  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (!headers.has('Content-Type') && init.body) headers.set('Content-Type', 'application/json')
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && csrfToken) headers.set('X-CSRF-Token', csrfToken)

  const response = await fetch(apiUrl(path), {
    ...init,
    method,
    credentials: 'include',
    headers,
  })

  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    throw new ApiError(response.status, (body ?? {}) as ApiErrorBody)
  }

  return body as T
}
