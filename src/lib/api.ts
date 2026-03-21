const BASE_URL = 'https://69beaab117c3d7d97792a813.mockapi.io/obel'

export async function apiGet<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`)
  if (!res.ok) {
    if (res.status === 404) return [] as unknown as T
    throw new Error(`GET ${endpoint} failed: ${res.status}`)
  }
  return res.json()
}

export async function apiPost<T>(endpoint: string, data: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`POST ${endpoint} failed: ${res.status}`)
  return res.json()
}

export async function apiPut<T>(endpoint: string, data: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`PUT ${endpoint} failed: ${res.status}`)
  return res.json()
}

export async function apiDelete(endpoint: string): Promise<void> {
  const res = await fetch(`${BASE_URL}${endpoint}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`DELETE ${endpoint} failed: ${res.status}`)
}
