// Production: /api (same-origin Vercel deployment)
// Development: http://localhost:3001/api (set in frontend/.env.development)
const BASE_URL = (import.meta.env.VITE_API_URL || '/_/backend').replace(/\/$/, '')

// Session-based Circuit Breaker: if an endpoint fails once, skip future fetches
// to prevent console spam while maintaining a local-first experience.
const failedEndpoints = new Set<string>()

function isConfigured(endpoint: string): boolean {
  const fullUrl = `${BASE_URL}${endpoint}`

  // Circuit Breaker
  if (failedEndpoints.has(fullUrl)) return false

  return true
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const fullUrl = `${BASE_URL}${endpoint}`

  const res = await fetch(fullUrl, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })

  if (res.status === 404) {
    failedEndpoints.add(fullUrl)
    throw new Error(`404: ${endpoint}`)
  }

  if (!res.ok) {
    throw new Error(`${options.method || 'GET'} ${endpoint} failed: ${res.status}`)
  }

  return res.json()
}

export async function apiGet<T>(endpoint: string): Promise<T> {
  if (!isConfigured(endpoint)) return [] as unknown as T
  try {
    return await request<T>(endpoint)
  } catch {
    return [] as unknown as T
  }
}

export async function apiPost<T>(endpoint: string, data: unknown): Promise<T> {
  if (!isConfigured(endpoint)) return data as T
  try {
    return await request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  } catch {
    return data as T
  }
}

export async function apiPut<T>(endpoint: string, data: unknown): Promise<T> {
  if (!isConfigured(endpoint)) return data as T
  try {
    return await request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  } catch {
    return data as T
  }
}

export async function apiDelete<T>(endpoint: string): Promise<T> {
  if (!isConfigured(endpoint)) return {} as T
  try {
    return await request<T>(endpoint, { method: 'DELETE' })
  } catch {
    return {} as T
  }
}
